// Этап 1 USB-режима: поиск iPhone/iPad и включение режима захвата экрана (QuickTime-конфигурация).
const APPLE_VID = 0x05ac;
const QT_CLASS = 0xff;
const QT_SUBCLASS = 0x2a;

let usb = null;
function lib() {
  if (!usb) usb = require('usb');
  return usb;
}

function isIosPid(pid) {
  // iPhone/iPad/iPod в режиме usbmux: 0x1290..0x12af
  return pid >= 0x1290 && pid <= 0x12af;
}

function hasQuickTimeInterface(device) {
  try {
    const cfgs = device.allConfigDescriptors || [];
    return cfgs.some((c) =>
      c.interfaces.some((alts) =>
        alts.some((i) => i.bInterfaceClass === QT_CLASS && i.bInterfaceSubClass === QT_SUBCLASS)
      )
    );
  } catch {
    return false;
  }
}

function readSerial(device) {
  return new Promise((resolve) => {
    try {
      device.open();
    } catch (e) {
      return resolve({ serial: null, openError: String(e.message || e) });
    }
    const idx = device.deviceDescriptor.iSerialNumber;
    device.getStringDescriptor(idx, (err, s) => {
      try { device.close(); } catch {}
      resolve({ serial: err ? null : s, openError: null });
    });
  });
}

async function listDevices() {
  const out = [];
  for (const d of lib().getDeviceList()) {
    const dd = d.deviceDescriptor;
    if (dd.idVendor !== APPLE_VID || !isIosPid(dd.idProduct)) continue;
    const { serial, openError } = await readSerial(d);
    out.push({
      pid: dd.idProduct,
      address: d.deviceAddress,
      bus: d.busNumber,
      serial,
      openError,
      qtReady: hasQuickTimeInterface(d)
    });
  }
  return out;
}

// Включить QuickTime-конфигурацию: vendor control request 0x52, wValue=1, wIndex=2.
function enableQuickTime(address, bus) {
  return new Promise((resolve) => {
    const dev = lib().getDeviceList().find((d) => d.deviceAddress === address && d.busNumber === bus);
    if (!dev) return resolve({ ok: false, code: 'NOT_FOUND' });
    try {
      dev.open();
    } catch (e) {
      return resolve({
        ok: false,
        needDriver: true,
        code: 'NEED_DRIVER',
        detail: String(e.message || e)
      });
    }
    dev.controlTransfer(0x40, 0x52, 0x01, 0x02, Buffer.alloc(0), (err) => {
      try { dev.close(); } catch {}
      // после успешного запроса устройство само переподключается, ошибка тут возможна
      resolve(err ? { ok: false, code: 'REJECTED', detail: err.message } : { ok: true });
    });
  });
}

async function waitQuickTime(serial, timeoutMs = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await new Promise((r) => setTimeout(r, 700));
    const list = await listDevices();
    const hit = list.find((d) => (serial ? d.serial === serial : true) && d.qtReady);
    if (hit) return hit;
  }
  return null;
}

module.exports = { listDevices, enableQuickTime, waitQuickTime };
