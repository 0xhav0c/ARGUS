// Generate a 256x256 PNG icon for ARGUS
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const W = 512, H = 512;
const pixels = Buffer.alloc(W * H * 4, 0);

function setPixel(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  a = a === undefined ? 255 : a;
  const i = (y * W + x) * 4;
  pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a;
}

function circle(cx, cy, radius, r, g, b, fill) {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const d = Math.sqrt(x*x + y*y);
      if (fill ? d <= radius : (d >= radius - 1.5 && d <= radius + 1.5)) {
        setPixel(Math.round(cx+x), Math.round(cy+y), r, g, b, 255);
      }
    }
  }
}

const C = W / 2; // center = 256

// Background - dark
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.sqrt((x-C)*(x-C) + (y-C)*(y-C));
    const f = Math.max(0, 1 - d/320);
    setPixel(x, y, Math.round(8 + f*20), Math.round(12 + f*30), Math.round(24 + f*50), 255);
  }
}

// Outer ring - cyan
circle(C, C, 200, 0, 200, 240, false);
circle(C, C, 198, 0, 180, 220, false);
circle(C, C, 196, 0, 160, 200, false);

// Inner ring
circle(C, C, 120, 0, 150, 200, false);
circle(C, C, 118, 0, 130, 180, false);

// Center eye
circle(C, C, 40, 0, 212, 255, true);

// Pupil
circle(C, C, 16, 10, 20, 40, true);

// Highlight
circle(C, C - 6, 6, 180, 240, 255, true);

// Encode PNG
const rawData = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  rawData[y * (1 + W * 4)] = 0;
  pixels.copy(rawData, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
}

const compressed = zlib.deflateSync(rawData);

function crc32(buf) {
  let c = 0xFFFFFFFF;
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let cc = n;
    for (let k = 0; k < 8; k++) cc = (cc & 1) ? (0xEDB88320 ^ (cc >>> 1)) : (cc >>> 1);
    table[n] = cc;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeData));
  return Buffer.concat([len, typeData, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0))
]);

const outPath = path.join(__dirname, '..', 'resources', 'icon.png');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, png);
console.log('Created icon.png:', png.length, 'bytes');
