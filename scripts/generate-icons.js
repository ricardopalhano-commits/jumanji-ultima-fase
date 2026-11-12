/**
 * Gera os ícones PNG do PWA sem dependências externas.
 * Desenha o emblema do jogo: estrela de quatro pontas dourada,
 * anel de bússola e fundo verde-selva.
 *
 * Uso: npm run icons
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '..', 'public', 'icons');

/* ------------------------------- encoder PNG ------------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ------------------------------- desenho ---------------------------------- */

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mix = (a, b, t) => a + (b - a) * t;
const mixColor = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

function sdRoundRect(px, py, halfWidth, halfHeight, radius) {
  const qx = Math.abs(px) - (halfWidth - radius);
  const qy = Math.abs(py) - (halfHeight - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - radius;
}

/** Teste de ponto dentro de polígono (ray casting). */
function insidePolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersects =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

const BACK_TOP = [22, 92, 65];
const BACK_BOTTOM = [7, 26, 20];
const GOLD_LIGHT = [255, 224, 163];
const GOLD = [242, 177, 60];
const GOLD_DARK = [176, 106, 28];
const DARK = [8, 26, 19];

/**
 * @param {number} size
 * @param {{bleed?: boolean, scale?: number}} options
 */
function renderIcon(size, { bleed = false, scale = 1 } = {}) {
  const ss = 3;
  const rgba = Buffer.alloc(size * size * 4);
  const radius = bleed ? 0 : 0.235;

  // Estrela de quatro pontas (8 vértices alternando externo/interno).
  const outer = 0.205 * scale;
  const inner = 0.078 * scale;
  const star = [];
  for (let i = 0; i < 8; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 4;
    const r = i % 2 === 0 ? outer : inner;
    star.push([0.5 + r * Math.cos(angle), 0.5 + r * Math.sin(angle)]);
  }

  const ringRadius = 0.318 * scale;
  const ringHalf = 0.0075 * scale;
  const centerRadius = 0.036 * scale;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumA = 0;

      for (let sy = 0; sy < ss; sy += 1) {
        for (let sx = 0; sx < ss; sx += 1) {
          const ux = (x + (sx + 0.5) / ss) / size;
          const uy = (y + (sy + 0.5) / ss) / size;

          if (sdRoundRect(ux - 0.5, uy - 0.5, 0.5, 0.5, radius) > 0) continue;

          // Fundo verde com gradiente diagonal e brilho suave.
          const t = clamp01(ux * 0.5 + uy * 0.62);
          let [r, g, b] = mixColor(BACK_TOP, BACK_BOTTOM, t);
          const glow = Math.max(0, 1 - Math.hypot(ux - 0.2, uy - 0.14) / 0.8) * 0.16;
          r = mix(r, 255, glow);
          g = mix(g, 255, glow);
          b = mix(b, 255, glow);

          const dist = Math.hypot(ux - 0.5, uy - 0.5);

          // Anel da bússola.
          if (Math.abs(dist - ringRadius) <= ringHalf) {
            const rc = mixColor(GOLD, GOLD_DARK, 0.35);
            r = mix(r, rc[0], 0.42);
            g = mix(g, rc[1], 0.42);
            b = mix(b, rc[2], 0.42);
          }

          // Estrela dourada.
          if (insidePolygon(ux, uy, star)) {
            const tc = mixColor(GOLD_LIGHT, GOLD_DARK, clamp01((uy - 0.28) / 0.46));
            r = tc[0];
            g = tc[1];
            b = tc[2];
          }

          // Miolo escuro do emblema.
          if (dist <= centerRadius) {
            r = DARK[0];
            g = DARK[1];
            b = DARK[2];
          }

          sumR += r;
          sumG += g;
          sumB += b;
          sumA += 1;
        }
      }

      const total = ss * ss;
      const alpha = sumA / total;
      const offset = (y * size + x) * 4;
      if (alpha === 0) {
        rgba[offset] = 0;
        rgba[offset + 1] = 0;
        rgba[offset + 2] = 0;
        rgba[offset + 3] = 0;
      } else {
        rgba[offset] = Math.round(sumR / sumA);
        rgba[offset + 1] = Math.round(sumG / sumA);
        rgba[offset + 2] = Math.round(sumB / sumA);
        rgba[offset + 3] = Math.round(alpha * 255);
      }
    }
  }

  return encodePng(size, size, rgba);
}

const targets = [
  { file: 'icon-192.png', size: 192, options: {} },
  { file: 'icon-512.png', size: 512, options: {} },
  { file: 'icon-maskable-512.png', size: 512, options: { bleed: true, scale: 0.82 } },
  { file: 'apple-touch-icon.png', size: 180, options: { bleed: true, scale: 0.96 } },
  { file: 'favicon-32.png', size: 32, options: {} },
  { file: 'favicon-64.png', size: 64, options: {} }
];

fs.mkdirSync(outputDir, { recursive: true });
for (const target of targets) {
  const png = renderIcon(target.size, target.options);
  fs.writeFileSync(path.join(outputDir, target.file), png);
  console.log(`✓ public/icons/${target.file} (${target.size}x${target.size})`);
}
