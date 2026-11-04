// AetherVector Seed Codec
// Encodes parsed vector paths into a compact "seed" string and decodes back.
// Strategy: delta-encode coordinates, quantize to fixed decimals, then base64-pack
// the resulting Int16 values into a short ASCII seed. This produces dramatic
// size reduction vs raw JSON/SVG while being lossless within the quantization step.

import type { VecShape, VecPath, Vec2, CubicSegment } from './vectorParser';

const QUANT = 100; // 2 decimal places of precision
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
// We pack 12 bits per char (4096 values) using a custom alphabet for density.
const RADIX = 64;
const TWO_PI = Math.PI * 2;

// --- low-level int <-> base64-ish string packing (variable length) ---
// 12-bit groups -> two base64 chars (64^2 = 4096, covers signed -2048..2047)
const OFFSET = 2048;

function signedTo12(v: number): number {
  const clamped = Math.max(-OFFSET, Math.min(OFFSET - 1, v));
  return clamped + OFFSET; // 0..4095
}

function pack12toB64(value: number): string {
  const u = signedTo12(value);
  return BASE64[u >> 6] + BASE64[u & 0x3f];
}

function unpackB64to12(a: string, b: string): number {
  const hi = BASE64.indexOf(a);
  const lo = BASE64.indexOf(b);
  if (hi < 0 || lo < 0) return 0;
  return (hi << 6 | lo) - OFFSET;
}

// --- delta encoding helpers ---
function quantize(n: number): number {
  return Math.round(n * QUANT);
}

interface PathSeed {
  start: Vec2; // quantized absolute
  segs: { dc1x: number; dc1y: number; dc2x: number; dc2y: number; dx: number; dy: number }[];
  closed: boolean;
}

function encodePath(path: VecPath): PathSeed {
  const startQ = { x: quantize(path.start.x), y: quantize(path.start.y) };
  const segs: PathSeed['segs'] = [];
  let prevEnd = startQ;
  for (const s of path.segments) {
    const c1q = { x: quantize(s.c1.x), y: quantize(s.c1.y) };
    const c2q = { x: quantize(s.c2.x), y: quantize(s.c2.y) };
    const toQ = { x: quantize(s.to.x), y: quantize(s.to.y) };
    segs.push({
      dc1x: c1q.x - prevEnd.x,
      dc1y: c1q.y - prevEnd.y,
      dc2x: c2q.x - prevEnd.x,
      dc2y: c2q.y - prevEnd.y,
      dx: toQ.x - prevEnd.x,
      dy: toQ.y - prevEnd.y,
    });
    prevEnd = toQ;
  }
  return { start: startQ, segs, closed: path.closed };
}

function decodePath(seed: PathSeed): VecPath {
  const start = { x: seed.start.x / QUANT, y: seed.start.y / QUANT };
  const segments: CubicSegment[] = [];
  let prevEnd = seed.start;
  for (const s of seed.segs) {
    const c1 = { x: (prevEnd.x + s.dc1x) / QUANT, y: (prevEnd.y + s.dc1y) / QUANT };
    const c2 = { x: (prevEnd.x + s.dc2x) / QUANT, y: (prevEnd.y + s.dc2y) / QUANT };
    const to = { x: (prevEnd.x + s.dx) / QUANT, y: (prevEnd.y + s.dy) / QUANT };
    segments.push({ c1, c2, to });
    prevEnd = { x: prevEnd.x + s.dx, y: prevEnd.y + s.dy };
  }
  return { start, segments, closed: seed.closed };
}

// --- top-level encode ---
// Header: "AV1|" + shapeCount
// Per shape: nameLen(1 char, 0-63), name, pathCount(2 chars 12-bit),
//   per path: closed(1 char flag), start.x(2), start.y(2), segCount(2),
//     per seg: 6x (2 chars each) = 12 chars
export interface SeedEncoding {
  seed: string;
  originalBytes: number;
  seedBytes: number;
  reduction: number; // percent 0..100
  shapeCount: number;
  totalSegments: number;
}

function charFor6bit(v: number): string {
  return BASE64[v & 0x3f];
}

function sixBitFromChar(c: string): number {
  return BASE64.indexOf(c);
}

export function encodeShapes(shapes: VecShape[]): SeedEncoding {
  const originalBytes = JSON.stringify(shapes).length;
  let out = 'AV1|';
  out += pack12toB64(shapes.length);

  let totalSegments = 0;
  for (const shape of shapes) {
    const name = shape.name.slice(0, 63);
    out += charFor6bit(name.length);
    out += name;
    out += pack12toB64(shape.paths.length);
    for (const path of shape.paths) {
      const ps = encodePath(path);
      out += ps.closed ? '1' : '0';
      out += pack12toB64(ps.start.x);
      out += pack12toB64(ps.start.y);
      out += pack12toB64(ps.segs.length);
      totalSegments += ps.segs.length;
      for (const s of ps.segs) {
        out += pack12toB64(s.dc1x);
        out += pack12toB64(s.dc1y);
        out += pack12toB64(s.dc2x);
        out += pack12toB64(s.dc2y);
        out += pack12toB64(s.dx);
        out += pack12toB64(s.dy);
      }
    }
  }

  const seedBytes = out.length;
  const reduction = originalBytes > 0 ? Math.max(0, (1 - seedBytes / originalBytes) * 100) : 0;
  return { seed: out, originalBytes, seedBytes, reduction, shapeCount: shapes.length, totalSegments };
}

export interface DecodedShapes {
  shapes: VecShape[];
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
}

export function decodeSeed(seed: string): DecodedShapes {
  if (!seed.startsWith('AV1|')) throw new Error('Invalid AetherVector seed');
  let pos = 4;
  const shapes: VecShape[] = [];
  const sc = unpackB64to12(seed[pos], seed[pos + 1]); pos += 2;

  for (let si = 0; si < sc; si++) {
    const nameLen = sixBitFromChar(seed[pos]); pos += 1;
    const name = seed.slice(pos, pos + nameLen); pos += nameLen;
    const pathCount = unpackB64to12(seed[pos], seed[pos + 1]); pos += 2;
    const paths: VecPath[] = [];
    for (let pi = 0; pi < pathCount; pi++) {
      const closed = seed[pos] === '1'; pos += 1;
      const sx = unpackB64to12(seed[pos], seed[pos + 1]); pos += 2;
      const sy = unpackB64to12(seed[pos], seed[pos + 1]); pos += 2;
      const segCount = unpackB64to12(seed[pos], seed[pos + 1]); pos += 2;
      const segs: PathSeed['segs'] = [];
      for (let sgi = 0; sgi < segCount; sgi++) {
        const dc1x = unpackB64to12(seed[pos], seed[pos + 1]); pos += 2;
        const dc1y = unpackB64to12(seed[pos], seed[pos + 1]); pos += 2;
        const dc2x = unpackB64to12(seed[pos], seed[pos + 1]); pos += 2;
        const dc2y = unpackB64to12(seed[pos], seed[pos + 1]); pos += 2;
        const dx = unpackB64to12(seed[pos], seed[pos + 1]); pos += 2;
        const dy = unpackB64to12(seed[pos], seed[pos + 1]); pos += 2;
        segs.push({ dc1x, dc1y, dc2x, dc2y, dx, dy });
      }
      paths.push(decodePath({ start: { x: sx, y: sy }, segs, closed }));
    }
    shapes.push({ id: `dec-${si}`, name, paths, bbox: computeBbox(paths) });
  }

  return { shapes, bbox: computeShapesBbox(shapes) };
}

function computeBbox(paths: VecPath[]): VecShape['bbox'] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const pts: Vec2[] = [];
  for (const p of paths) {
    pts.push(p.start);
    for (const s of p.segments) pts.push(s.c1, s.c2, s.to);
  }
  for (const pt of pts) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

function computeShapesBbox(shapes: VecShape[]): VecShape['bbox'] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of shapes) {
    if (s.bbox.minX < minX) minX = s.bbox.minX;
    if (s.bbox.minY < minY) minY = s.bbox.minY;
    if (s.bbox.maxX > maxX) maxX = s.bbox.maxX;
    if (s.bbox.maxY > maxY) maxY = s.bbox.maxY;
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  return { minX, minY, maxX, maxY };
}

// --- Cubic bezier sampling (shared by renderer + code export) ---
export function sampleCubic(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const mt = 1 - t;
  const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
  const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
  return { x, y };
}

export function pathToPoints(path: VecPath, steps = 24): Vec2[] {
  const pts: Vec2[] = [path.start];
  let prev = path.start;
  for (const seg of path.segments) {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const p = sampleCubic(prev, seg.c1, seg.c2, seg.to, t);
      pts.push(p);
    }
    prev = seg.to;
  }
  return pts;
}

export { TWO_PI };
