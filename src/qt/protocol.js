// Протокол QuickTime Screen Capture для iOS.
// Порт на JavaScript по открытой реализации danielpaulus/quicktime_video_hack (MIT License,
// Copyright (c) 2019 Daniel Paulus) и её технической документации.
'use strict';

const M = (s) => Buffer.from(s, 'latin1').readUInt32BE(0); // 'ping' -> 0x70696E67

const MAGIC = {
  PING: M('ping'), SYNC: M('sync'), ASYN: M('asyn'), RPLY: M('rply'),
  // sync
  TIME: M('time'), CWPA: M('cwpa'), AFMT: M('afmt'), CVRP: M('cvrp'), CLOK: M('clok'),
  OG: M('go! '), SKEW: M('skew'), STOP: M('stop'),
  // async
  FEED: M('feed'), TJMP: M('tjmp'), SRAT: M('srat'), SPRP: M('sprp'), TBAS: M('tbas'),
  RELS: M('rels'), HPD1: M('hpd1'), HPA1: M('hpa1'), NEED: M('need'), EAT: M('eat!'),
  HPD0: M('hpd0'), HPA0: M('hpa0'),
  // словари и буферы
  DICT: M('dict'), KEYV: M('keyv'), STRK: M('strk'), IDXK: M('idxk'),
  BULV: M('bulv'), DATV: M('datv'), STRV: M('strv'), NMBV: M('nmbv'),
  SBUF: M('sbuf'), OPTS: M('opts'), STIA: M('stia'), SDAT: M('sdat'), SATT: M('satt'),
  SARY: M('sary'), SSIZ: M('ssiz'), NSMP: M('nsmp'),
  FDSC: M('fdsc'), MDIA: M('mdia'), VDIM: M('vdim'), CODC: M('codc'), EXTN: M('extn'),
  MEDIA_SOUND: M('soun'), MEDIA_VIDEO: M('vide')
};

const EMPTY_CF = 1n;

// ---------- сериализация ----------
function serializeValue(v) {
  if (typeof v === 'boolean') {
    const b = Buffer.alloc(9);
    b.writeUInt32LE(9, 0); b.writeUInt32LE(MAGIC.BULV, 4); b[8] = v ? 1 : 0;
    return b;
  }
  if (typeof v === 'string') {
    const s = Buffer.from(v, 'utf8');
    const b = Buffer.alloc(8 + s.length);
    b.writeUInt32LE(b.length, 0); b.writeUInt32LE(MAGIC.STRV, 4); s.copy(b, 8);
    return b;
  }
  if (Buffer.isBuffer(v)) {
    const b = Buffer.alloc(8 + v.length);
    b.writeUInt32LE(b.length, 0); b.writeUInt32LE(MAGIC.DATV, 4); v.copy(b, 8);
    return b;
  }
  if (v && v.num) {
    let body;
    if (v.num === 'u32') { body = Buffer.alloc(5); body[0] = 3; body.writeUInt32LE(v.v, 1); }
    else { body = Buffer.alloc(9); body[0] = 6; body.writeDoubleLE(v.v, 1); } // f64
    const b = Buffer.alloc(8 + body.length);
    b.writeUInt32LE(b.length, 0); b.writeUInt32LE(MAGIC.NMBV, 4); body.copy(b, 8);
    return b;
  }
  if (v && v.dict) return serializeDict(v.dict);
  throw new Error('unsupported dict value');
}

// entries: [[ключ, значение], ...]
function serializeDict(entries) {
  const parts = entries.map(([k, v]) => {
    const kb = Buffer.from(k, 'utf8');
    const key = Buffer.alloc(8 + kb.length);
    key.writeUInt32LE(key.length, 0); key.writeUInt32LE(MAGIC.STRK, 4); kb.copy(key, 8);
    const val = serializeValue(v);
    const head = Buffer.alloc(8);
    head.writeUInt32LE(8 + key.length + val.length, 0); head.writeUInt32LE(MAGIC.KEYV, 4);
    return Buffer.concat([head, key, val]);
  });
  const body = Buffer.concat(parts);
  const head = Buffer.alloc(8);
  head.writeUInt32LE(8 + body.length, 0); head.writeUInt32LE(MAGIC.DICT, 4);
  return Buffer.concat([head, body]);
}

// ---------- разбор ----------
function parseValue(b) {
  const len = b.readUInt32LE(0);
  if (len > b.length) throw new Error('bad value length');
  const magic = b.readUInt32LE(4);
  switch (magic) {
    case MAGIC.STRV: return b.subarray(8, len).toString('utf8');
    case MAGIC.DATV: return b.subarray(8, len);
    case MAGIC.BULV: return b[8] === 1;
    case MAGIC.NMBV: return { raw: b.subarray(8, len) };
    case MAGIC.DICT: return parseDict(b.subarray(0, len));
    default: return { magic: b.subarray(4, 8).toString('latin1') };
  }
}

// Словарь с ключами-строками или числами. expectedMagic — 'dict' либо особый маркер ('extn', 'satt').
function parseDict(buf, expectedMagic) {
  const len = buf.readUInt32LE(0);
  const magic = buf.readUInt32LE(4);
  if (expectedMagic !== undefined && magic !== expectedMagic) throw new Error('unexpected dict magic');
  const body = buf.subarray(8, Math.min(len, buf.length));
  const out = new Map();
  let off = 0;
  while (off + 8 <= body.length) {
    const klen = body.readUInt32LE(off);
    if (body.readUInt32LE(off + 4) !== MAGIC.KEYV || klen < 8 || off + klen > body.length) throw new Error('bad keyv');
    const pair = body.subarray(off + 8, off + klen);
    const kl = pair.readUInt32LE(0);
    const km = pair.readUInt32LE(4);
    const key = km === MAGIC.STRK ? pair.subarray(8, kl).toString('utf8') : pair.readUInt16LE(8);
    out.set(key, parseValue(pair.subarray(kl)));
    off += klen;
  }
  return out;
}

function parseFormatDescriptor(b) {
  // [len]['fdsc'] [mdia: len 12][type] ...
  let rest = b.subarray(8);
  const mdiaLen = rest.readUInt32LE(0);
  if (rest.readUInt32LE(4) !== MAGIC.MDIA) throw new Error('fdsc: no mdia');
  const mediaType = rest.readUInt32LE(8);
  rest = rest.subarray(mdiaLen);
  if (mediaType === MAGIC.MEDIA_SOUND) return { media: 'sound' };
  const vdimLen = rest.readUInt32LE(0);
  if (rest.readUInt32LE(4) !== MAGIC.VDIM) throw new Error('fdsc: no vdim');
  const width = rest.readUInt32LE(8);
  const height = rest.readUInt32LE(12);
  rest = rest.subarray(vdimLen);
  const codcLen = rest.readUInt32LE(0);
  if (rest.readUInt32LE(4) !== MAGIC.CODC) throw new Error('fdsc: no codc');
  rest = rest.subarray(codcLen);
  const ext = parseDict(rest, MAGIC.EXTN);
  let sps = null, pps = null;
  try {
    const d49 = ext.get(49);
    const avcc = d49.get(105); // avcC: [0]=1,[1..3]=профиль, [5]&0x1f=кол-во SPS, [6..7]=длина SPS
    const spsLen = avcc.readUInt16BE(6);
    sps = avcc.subarray(8, 8 + spsLen);
    let p = 8 + spsLen;
    // p: кол-во PPS (1 байт), затем длина PPS (2 байта)
    const ppsLen = avcc.readUInt16BE(p + 1);
    pps = avcc.subarray(p + 3, p + 3 + ppsLen);
  } catch (e) {
    sps = null; pps = null;
  }
  return { media: 'video', width, height, sps, pps };
}

function readCMTime(b, off) {
  return {
    value: b.readBigUInt64LE(off),
    scale: b.readUInt32LE(off + 8),
    flags: b.readUInt32LE(off + 12),
    epoch: b.readBigUInt64LE(off + 16)
  };
}

// Разбор CMSampleBuffer (содержимое FEED/EAT после 16-байтового заголовка)
function parseSampleBuffer(data) {
  const total = data.readUInt32LE(0);
  if (data.readUInt32LE(4) !== MAGIC.SBUF) throw new Error('not sbuf');
  if (total > data.length) throw new Error('sbuf: short data');
  let rest = data.subarray(8);
  const sb = { pts: null, sampleData: null, fdsc: null, numSamples: 0 };
  while (rest.length > 0) {
    const len = rest.readUInt32LE(0);
    const magic = rest.readUInt32LE(4);
    switch (magic) {
      case MAGIC.OPTS: sb.pts = readCMTime(rest, 8); rest = rest.subarray(32); break;
      case MAGIC.SDAT: sb.sampleData = rest.subarray(8, len); rest = rest.subarray(len); break;
      case MAGIC.NSMP: sb.numSamples = rest.readUInt32LE(8); rest = rest.subarray(12); break;
      case MAGIC.FDSC: sb.fdsc = parseFormatDescriptor(rest.subarray(0, len)); rest = rest.subarray(len); break;
      case MAGIC.STIA: case MAGIC.SSIZ: case MAGIC.SATT: case MAGIC.SARY:
        rest = rest.subarray(len); break;
      default:
        throw new Error('unknown sbuf magic ' + rest.subarray(4, 8).toString('latin1'));
    }
  }
  return sb;
}

// AVCC (длина NALU 4 байта, big-endian) -> Annex B
const START = Buffer.from([0, 0, 0, 1]);
function toAnnexB(sampleData, fdsc) {
  const parts = [];
  let key = false;
  if (fdsc && fdsc.sps && fdsc.pps) {
    parts.push(START, fdsc.sps, START, fdsc.pps);
    key = true;
  }
  let off = 0;
  while (sampleData && off + 4 <= sampleData.length) {
    const n = sampleData.readUInt32BE(off);
    const nal = sampleData.subarray(off + 4, off + 4 + n);
    if (nal.length && (nal[0] & 0x1f) === 5) key = true;
    parts.push(START, nal);
    off += 4 + n;
  }
  return { data: Buffer.concat(parts), key };
}

// ---------- пакеты ----------
function pingPacket() {
  const b = Buffer.alloc(16);
  b.writeUInt32LE(16, 0); b.writeUInt32LE(MAGIC.PING, 4); b.writeBigUInt64LE(0x0000000100000000n, 8);
  return b;
}
function clockRefReply(clockRef, corr) {
  const b = Buffer.alloc(28);
  b.writeUInt32LE(28, 0); b.writeUInt32LE(MAGIC.RPLY, 4); b.writeBigUInt64LE(corr, 8);
  b.writeUInt32LE(0, 16); b.writeBigUInt64LE(clockRef, 20);
  return b;
}
function ogReply(corr) {
  const b = Buffer.alloc(24);
  b.writeUInt32LE(24, 0); b.writeUInt32LE(MAGIC.RPLY, 4); b.writeBigUInt64LE(corr, 8);
  return b;
}
function timeReply(corr, t) {
  const b = Buffer.alloc(44);
  b.writeUInt32LE(44, 0); b.writeUInt32LE(MAGIC.RPLY, 4); b.writeBigUInt64LE(corr, 8);
  b.writeUInt32LE(0, 16);
  b.writeBigUInt64LE(t.value, 20); b.writeUInt32LE(t.scale, 28); b.writeUInt32LE(t.flags, 32); b.writeBigUInt64LE(t.epoch, 36);
  return b;
}
function afmtReply(corr) {
  const dict = serializeDict([['Error', { num: 'u32', v: 0 }]]);
  const b = Buffer.alloc(20 + dict.length);
  b.writeUInt32LE(b.length, 0); b.writeUInt32LE(MAGIC.RPLY, 4); b.writeBigUInt64LE(corr, 8);
  b.writeUInt32LE(0, 16); dict.copy(b, 20);
  return b;
}
function skewReply(corr, skew) {
  const b = Buffer.alloc(28);
  b.writeUInt32LE(28, 0); b.writeUInt32LE(MAGIC.RPLY, 4); b.writeBigUInt64LE(corr, 8);
  b.writeUInt32LE(0, 16); b.writeDoubleLE(skew, 20);
  return b;
}
function stopReply(corr) {
  const b = Buffer.alloc(24);
  b.writeUInt32LE(24, 0); b.writeUInt32LE(MAGIC.RPLY, 4); b.writeBigUInt64LE(corr, 8);
  return b;
}
function asynDict(dictBytes, subtype, clockRef) {
  const h = Buffer.alloc(20);
  h.writeUInt32LE(20 + dictBytes.length, 0); h.writeUInt32LE(MAGIC.ASYN, 4);
  h.writeBigUInt64LE(clockRef, 8); h.writeUInt32LE(subtype, 16);
  return Buffer.concat([h, dictBytes]);
}
function asynSimple(subtype, clockRef) {
  const b = Buffer.alloc(20);
  b.writeUInt32LE(20, 0); b.writeUInt32LE(MAGIC.ASYN, 4); b.writeBigUInt64LE(clockRef, 8); b.writeUInt32LE(subtype, 16);
  return b;
}
const needPacket = (clockRef) => asynSimple(MAGIC.NEED, clockRef);
const hpd0Packet = () => asynSimple(MAGIC.HPD0, EMPTY_CF);
const hpa0Packet = (clockRef) => asynSimple(MAGIC.HPA0, clockRef);

function hpd1Packet() {
  const dict = serializeDict([
    ['Valeria', true],
    ['HEVCDecoderSupports444', true],
    ['DisplaySize', { dict: [['Width', { num: 'f64', v: 1920 }], ['Height', { num: 'f64', v: 1200 }]] }]
  ]);
  return asynDict(dict, MAGIC.HPD1, EMPTY_CF);
}

// ASBD для LPCM 48 кГц, 16 бит, 2 канала (56 байт)
function defaultAsbd() {
  const b = Buffer.alloc(56);
  b.writeDoubleLE(48000, 0);
  b.writeUInt32LE(M('lpcm'), 8);
  b.writeUInt32LE(12, 12); // FormatFlags
  b.writeUInt32LE(4, 16);  // BytesPerPacket
  b.writeUInt32LE(1, 20);  // FramesPerPacket
  b.writeUInt32LE(4, 24);  // BytesPerFrame
  b.writeUInt32LE(2, 28);  // ChannelsPerFrame
  b.writeUInt32LE(16, 32); // BitsPerChannel
  b.writeUInt32LE(0, 36);  // Reserved
  b.writeDoubleLE(48000, 40);
  b.writeDoubleLE(48000, 48);
  return b;
}

function hpa1Packet(deviceClockRef) {
  const dict = serializeDict([
    ['BufferAheadInterval', { num: 'f64', v: 0.07300000000000001 }],
    ['deviceUID', 'Valeria'],
    ['ScreenLatency', { num: 'f64', v: 0.04 }],
    ['formats', defaultAsbd()],
    ['EDIDAC3Support', { num: 'u32', v: 0 }],
    ['deviceName', 'Valeria']
  ]);
  return asynDict(dict, MAGIC.HPA1, deviceClockRef);
}

module.exports = {
  MAGIC, EMPTY_CF, parseDict, parseSampleBuffer, toAnnexB,
  pingPacket, clockRefReply, ogReply, timeReply, afmtReply, skewReply, stopReply,
  needPacket, hpd0Packet, hpa0Packet, hpd1Packet, hpa1Packet
};
