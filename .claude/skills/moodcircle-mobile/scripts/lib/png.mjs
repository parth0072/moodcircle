// A real PNG made from horizontal colour bands, for flows and checks that need a photo to upload
// (the server reads the bytes, so a one-pixel placeholder would also do; bands make screenshots readable).
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** `bands` is a list of [r, g, b], top to bottom, each taking an equal share of the height. */
export function bandsPng(width, height, bands) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    const [r, g, b] = bands[Math.min(bands.length - 1, Math.floor((y * bands.length) / height))];
    rows.push(Buffer.from([0, ...Array.from({ length: width }, () => [r, g, b]).flat()]));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// The design's own colours for its three beach photos and a hike.
export const photos = {
  sunset: bandsPng(120, 90, [[249, 199, 126], [249, 199, 126], [243, 122, 107], [54, 81, 168], [54, 81, 168], [239, 227, 204]]),
  iceCream: bandsPng(120, 90, [[143, 203, 240], [143, 203, 240], [246, 198, 214], [239, 227, 204]]),
  sand: bandsPng(120, 90, [[239, 227, 204], [201, 162, 122], [239, 227, 204]]),
  hills: bandsPng(120, 90, [[143, 203, 240], [167, 196, 122], [79, 127, 44]]),
};
