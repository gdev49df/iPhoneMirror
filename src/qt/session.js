// USB-сессия QuickTime Screen Capture: открытие устройства, рукопожатие и приём видео.
// Логика порта по открытой реализации danielpaulus/quicktime_video_hack (MIT License).
'use strict';

const { EventEmitter } = require('events');
const P = require('./protocol');
const { MAGIC } = P;

const APPLE_VID = 0x05ac;
const QT_SUBCLASS = 0x2a;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pcall = (fn) => new Promise((resolve, reject) => fn((err, res) => (err ? reject(err) : resolve(res))));

class HostClock {
  constructor(id) { this.id = id; this.t0 = process.hrtime.bigint(); }
  now() { return { value: process.hrtime.bigint() - this.t0, scale: 1000000000, flags: 1, epoch: 0n }; }
}

function findQtConfig(device) {
  for (const cfg of device.allConfigDescriptors || []) {
    for (const alts of cfg.interfaces) {
      for (const i of alts) {
        if (i.bInterfaceClass === 0xff && i.bInterfaceSubClass === QT_SUBCLASS) {
          return { value: cfg.bConfigurationValue, iface: i.bInterfaceNumber };
        }
      }
    }
  }
  return null;
}

class QtSession extends EventEmitter {
  constructor(serial) {
    super();
    this.serial = serial || null;
    this.device = null;
    this.iface = null;
    this.inEp = null;
    this.outEp = null;
    this.buf = Buffer.alloc(0);
    this.writeChain = Promise.resolve();
    this.stopped = false;
    this.releases = 0;
    this.releaseWaiter = null;
    this.frames = 0;
    // состояние протокола
    this.clock = null;
    this.localAudioClock = null;
    this.needMessage = null;
    this.deviceAudioClockRef = 0n;
    this.audio = { first: false, startDev: null, startLocal: null, lastDev: null, lastLocal: null };
  }

  log(s) { this.emit('log', s); }

  async start() {
    const usb = require('usb');
    // 1. найти устройство с QT-конфигурацией
    let found = null;
    for (const d of usb.getDeviceList()) {
      if (d.deviceDescriptor.idVendor !== APPLE_VID || !findQtConfig(d)) continue;
      try {
        d.open();
        const sn = await pcall((cb) => d.getStringDescriptor(d.deviceDescriptor.iSerialNumber, cb)).catch(() => null);
        if (!this.serial || sn === this.serial || (sn && this.serial && sn.startsWith(this.serial.slice(0, 20)))) {
          found = d;
          break;
        }
        d.close();
      } catch (e) {
        this.log('Не удалось открыть устройство: ' + e.message);
      }
    }
    if (!found) throw new Error('NO_QT_DEVICE');
    this.device = found;
    const qt = findQtConfig(found);
    this.log(`QT-конфигурация: номер ${qt.value}, интерфейс ${qt.iface}`);

    // 2. включить конфигурацию
    let active = null;
    try { active = found.configDescriptor.bConfigurationValue; } catch {}
    if (active !== qt.value) {
      this.log(`Переключаю конфигурацию ${active} -> ${qt.value}`);
      try {
        await pcall((cb) => found.setConfiguration(qt.value, cb));
      } catch (e) {
        this.log('setConfiguration не удалась: ' + e.message + ' (на Windows это зависит от драйвера)');
      }
    }

    // 3. занять интерфейс, найти bulk-точки
    let iface;
    try {
      iface = found.interface(qt.iface);
    } catch (e) {
      throw new Error('IFACE: ' + e.message);
    }
    try { if (iface.isKernelDriverActive && iface.isKernelDriverActive()) iface.detachKernelDriver(); } catch {}
    iface.claim();
    this.iface = iface;
    for (const ep of iface.endpoints) {
      this.log(`endpoint 0x${ep.address.toString(16)} ${ep.direction} type ${ep.transferType}`);
      if (ep.transferType !== 2) continue;
      if (ep.direction === 'in' && !this.inEp) this.inEp = ep;
      if (ep.direction === 'out' && !this.outEp) this.outEp = ep;
    }
    if (!this.inEp || !this.outEp) throw new Error('NO_ENDPOINTS');

    try {
      await pcall((cb) => this.inEp.clearHalt(cb));
      await pcall((cb) => this.outEp.clearHalt(cb));
    } catch (e) {
      this.log('clearHalt: ' + e.message);
    }

    // 4. читать данные
    this.inEp.on('data', (chunk) => this.onData(chunk));
    this.inEp.on('error', (e) => {
      if (!this.stopped) { this.log('Ошибка чтения USB: ' + e.message); this.stop(); }
    });
    this.inEp.startPoll(4, 16384);
    this.log('USB готов, жду ping от устройства…');
    this.pingTimer = setTimeout(() => {
      if (!this.gotPing && !this.stopped) {
        this.log('Устройство не прислало ping за 8 секунд. Переподключи кабель и повтори.');
      }
    }, 8000);
  }

  write(bytes) {
    if (this.stopped && !this.closing) return;
    this.writeChain = this.writeChain.then(() => new Promise((resolve) => {
      try {
        this.outEp.transfer(bytes, (err) => {
          if (err) this.log('Ошибка записи USB: ' + err.message);
          resolve();
        });
      } catch (e) {
        this.log('Ошибка записи USB: ' + e.message);
        resolve();
      }
    }));
  }

  onData(chunk) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : chunk;
    while (this.buf.length >= 4) {
      const len = this.buf.readUInt32LE(0);
      if (len < 4 || len > 64 * 1024 * 1024) {
        this.log('Некорректная длина пакета: ' + len);
        this.stop();
        return;
      }
      if (this.buf.length < len) return;
      const payload = this.buf.subarray(4, len);
      this.buf = this.buf.subarray(len);
      try {
        this.handle(payload);
      } catch (e) {
        this.log('Ошибка обработки пакета: ' + e.message);
      }
    }
  }

  handle(d) {
    switch (d.readUInt32LE(0)) {
      case MAGIC.PING:
        if (!this.gotPing) { this.gotPing = true; this.log('PING получен, отвечаю'); }
        this.write(P.pingPacket());
        return;
      case MAGIC.SYNC: return this.handleSync(d);
      case MAGIC.ASYN: return this.handleAsyn(d);
      default:
        this.log('Неизвестный тип пакета: ' + d.subarray(0, 4).toString('hex'));
        this.stop();
    }
  }

  handleSync(d) {
    const sub = d.readUInt32LE(12);
    const clockRef = d.readBigUInt64LE(4);
    const corr = d.readBigUInt64LE(16);
    switch (sub) {
      case MAGIC.OG:
        this.log('SYNC OG');
        this.write(P.ogReply(corr));
        break;
      case MAGIC.CWPA: {
        const devClock = d.readBigUInt64LE(24);
        const local = devClock + 1000n;
        this.localAudioClock = new HostClock(local);
        this.deviceAudioClockRef = devClock;
        this.log('SYNC CWPA, отправляю HPD1/HPA1');
        this.write(P.hpd1Packet());
        this.write(P.hpd1Packet());
        this.write(P.clockRefReply(local, corr));
        this.write(P.hpa1Packet(devClock));
        break;
      }
      case MAGIC.CVRP: {
        const devClock = d.readBigUInt64LE(24);
        this.needMessage = P.needPacket(devClock);
        this.log('SYNC CVRP, запрашиваю видео (NEED)');
        this.write(this.needMessage);
        this.write(P.clockRefReply(devClock + 0x1000afn, corr));
        break;
      }
      case MAGIC.CLOK: {
        const ref = clockRef + 0x10000n;
        this.clock = new HostClock(ref);
        this.write(P.clockRefReply(ref, corr));
        break;
      }
      case MAGIC.TIME:
        this.write(P.timeReply(corr, (this.clock || new HostClock(0n)).now()));
        break;
      case MAGIC.AFMT:
        this.write(P.afmtReply(corr));
        break;
      case MAGIC.SKEW:
        this.write(P.skewReply(corr, this.skew()));
        break;
      case MAGIC.STOP:
        this.write(P.stopReply(corr));
        break;
      default:
        this.log('Неизвестный SYNC: ' + d.subarray(12, 16).toString('latin1'));
        this.stop();
    }
  }

  skew() {
    const a = this.audio;
    if (!a.first) return 48000;
    const diffLocal = Number(a.lastLocal.value - a.startLocal.value);
    const diffDev = Number(a.lastDev.value - a.startDev.value);
    if (!diffDev) return 48000;
    const scaled = diffLocal * (a.startDev.scale / a.startLocal.scale);
    return (a.startDev.scale * scaled) / diffDev;
  }

  handleAsyn(d) {
    const sub = d.readUInt32LE(12);
    switch (sub) {
      case MAGIC.EAT: {
        try {
          const sb = P.parseSampleBuffer(d.subarray(16));
          if (sb.pts && this.localAudioClock) {
            const local = this.localAudioClock.now();
            if (!this.audio.first) {
              this.audio = { first: true, startDev: sb.pts, startLocal: local, lastDev: sb.pts, lastLocal: local };
            } else {
              this.audio.lastDev = sb.pts;
              this.audio.lastLocal = local;
            }
          }
        } catch {}
        break;
      }
      case MAGIC.FEED: {
        try {
          const sb = P.parseSampleBuffer(d.subarray(16));
          if (sb.sampleData) {
            const a = P.toAnnexB(sb.sampleData, sb.fdsc);
            const ev = { data: a.data, key: a.key };
            if (sb.fdsc && sb.fdsc.media === 'video' && sb.fdsc.sps) {
              const s = sb.fdsc.sps;
              ev.codec = 'avc1.' + [s[1], s[2], s[3]].map((x) => x.toString(16).padStart(2, '0')).join('');
              ev.width = sb.fdsc.width;
              ev.height = sb.fdsc.height;
              this.log(`Видео: ${ev.width}x${ev.height}, ${ev.codec}`);
            }
            this.frames++;
            if (this.frames === 1) this.log('Первый кадр получен');
            this.emit('frame', ev);
          }
        } catch (e) {
          this.log('Ошибка кадра: ' + e.message);
        }
        if (this.needMessage) this.write(this.needMessage);
        break;
      }
      case MAGIC.RELS:
        this.releases++;
        if (this.releaseWaiter) this.releaseWaiter();
        break;
      case MAGIC.SPRP: case MAGIC.TJMP: case MAGIC.SRAT: case MAGIC.TBAS:
        break;
      default:
        this.log('Неизвестный ASYN: ' + d.subarray(12, 16).toString('latin1'));
        this.stop();
    }
  }

  async stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.closing = true;
    clearTimeout(this.pingTimer);
    this.log('Останавливаю трансляцию…');
    try {
      if (this.outEp) {
        this.write(P.hpa0Packet(this.deviceAudioClockRef));
        this.write(P.hpd0Packet());
        // ждём два RELS не дольше 3 секунд
        const t0 = Date.now();
        while (this.releases < 2 && Date.now() - t0 < 3000) await sleep(100);
        this.write(P.hpd0Packet());
        await this.writeChain;
      }
    } catch {}
    this.closing = false;
    try { if (this.inEp) await pcall((cb) => this.inEp.stopPoll(cb)); } catch {}
    try { if (this.iface) await pcall((cb) => this.iface.release(true, cb)); } catch {}
    try {
      // вернуть устройство в обычный режим (usbmux)
      if (this.device) await pcall((cb) => this.device.controlTransfer(0x40, 0x52, 0x00, 0x00, Buffer.alloc(0), cb));
    } catch {}
    try { if (this.device) this.device.close(); } catch {}
    this.emit('stopped');
  }
}

module.exports = { QtSession };
