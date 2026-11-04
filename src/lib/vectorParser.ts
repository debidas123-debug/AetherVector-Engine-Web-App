// Vector path types and parsing for After Effects JSON exports and SVG path data.

export interface Vec2 {
  x: number;
  y: number;
}

export interface CubicSegment {
  c1: Vec2; // first control point
  c2: Vec2; // second control point
  to: Vec2; // end point
}

export interface VecPath {
  start: Vec2; // moveTo anchor
  segments: CubicSegment[];
  closed: boolean;
}

export interface VecShape {
  id: string;
  name: string;
  paths: VecPath[];
  // normalized bounding box for the whole shape
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
}

// ---- Number shortener: drop redundant decimals ----
export function roundCoord(n: number, decimals = 2): number {
  return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Compute bounding box across all paths in a shape.
function computeBbox(paths: VecPath[]): VecShape['bbox'] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const pts: Vec2[] = [];
  for (const p of paths) {
    pts.push(p.start);
    for (const s of p.segments) {
      pts.push(s.c1, s.c2, s.to);
    }
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

function makeShape(id: string, name: string, paths: VecPath[]): VecShape {
  return { id, name, paths, bbox: computeBbox(paths) };
}

// ============================================================
// After Effects bodymovin / Lottie JSON shape parsing
// ============================================================
interface AELayer {
  ty: number; // layer type
  ind?: number;
  nm?: string;
  shapes?: AEShapeGroup[];
  ks?: {
    s?: { a: number; k: number[] | unknown };
    p?: { a: number; k: number[] | unknown };
  };
}

interface AEShapeGroup {
  ty: string; // "sh" = shape, "gr" = group
  nm?: string;
  it?: AEShapeGroup[];
  ks?: {
    k?: { a: number; k: { i: number[][]; o: number[][]; v: number[][]; c: boolean }[] } | { i: number[][]; o: number[][]; v: number[][]; c: boolean };
  };
}

function parseAEPathKey(ks: {
  i: number[][]; o: number[][]; v: number[][]; c: boolean;
}): VecPath {
  const verts = ks.v.map(([x, y]: number[]) => ({ x, y }));
  const inPts = ks.i;
  const outPts = ks.o;
  const closed = ks.c;

  if (verts.length === 0) {
    return { start: { x: 0, y: 0 }, segments: [], closed: false };
  }

  const start = verts[0];
  const segments: CubicSegment[] = [];
  const n = verts.length;
  const segCount = closed ? n : n - 1;

  for (let i = 0; i < segCount; i++) {
    const fromIdx = i;
    const toIdx = (i + 1) % n;
    const from = verts[fromIdx];
    const to = verts[toIdx];
    // o = out-tangent of `from`, i = in-tangent of `to`
    const o = outPts[fromIdx];
    const inI = inPts[toIdx];
    const c1 = { x: from.x + o[0], y: from.y + o[1] };
    const c2 = { x: to.x + inI[0], y: to.y + inI[1] };
    segments.push({ c1, c2, to });
  }

  return { start, segments, closed };
}

function collectAELayerPaths(layer: AELayer, out: VecPath[], namePrefix: string): void {
  if (!layer.shapes) return;
  const walk = (items: AEShapeGroup[]): void => {
    for (const item of items) {
      if (item.ty === 'sh' && item.ks?.k) {
        const k = Array.isArray(item.ks.k) ? (item.ks.k as { i: number[][]; o: number[][]; v: number[][]; c: boolean }[])[0] : item.ks.k as { i: number[][]; o: number[][]; v: number[][]; c: boolean };
        if (k && k.v && k.i && k.o) {
          out.push(parseAEPathKey(k));
        }
      }
      if (item.it) walk(item.it);
    }
  };
  walk(layer.shapes);
  void namePrefix;
}

export function parseAfterEffectsJSON(text: string): VecShape[] {
  const data = JSON.parse(text) as { layers?: AELayer[]; shapes?: AELayer[] };
  const layers = data.layers ?? data.shapes ?? [];
  const shapes: VecShape[] = [];
  for (const layer of layers) {
    const paths: VecPath[] = [];
    collectAELayerPaths(layer, paths, layer.nm ?? `layer-${layer.ind}`);
    if (paths.length > 0) {
      shapes.push(makeShape(`ae-${shapes.length}`, layer.nm ?? `Layer ${shapes.length + 1}`, paths));
    }
  }
  if (shapes.length === 0) throw new Error('No vector shape data found in AE JSON');
  return shapes;
}

// ============================================================
// SVG path "d" attribute parsing (supports M, L, C, Z, m, l, c, z)
// ============================================================
const CMD_RE = /([MmLlCcZz])\s*([^MmLlCcZz]*)/g;

function tokenizeNums(chunk: string): number[] {
  const matches = chunk.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  return matches ? matches.map(Number) : [];
}

export function parseSVGPath(d: string): VecShape {
  const paths: VecPath[] = [];
  let cur: Vec2 = { x: 0, y: 0 };
  let start: Vec2 = { x: 0, y: 0 };
  let segments: CubicSegment[] = [];
  let hasStart = false;
  let currentClosed = false;

  const flush = (closed: boolean): void => {
    if (hasStart) {
      paths.push({ start, segments, closed });
      segments = [];
      hasStart = false;
    }
    currentClosed = closed;
    void currentClosed;
  };

  let m: RegExpExecArray | null;
  CMD_RE.lastIndex = 0;
  while ((m = CMD_RE.exec(d)) !== null) {
    const cmd = m[1];
    const nums = tokenizeNums(m[2]);
    let i = 0;
    switch (cmd) {
      case 'M':
        flush(false);
        cur = { x: nums[i++], y: nums[i++] };
        start = { ...cur };
        hasStart = true;
        while (i + 1 < nums.length) {
          const to = { x: nums[i++], y: nums[i++] };
          segments.push({ c1: { ...cur }, c2: { ...to }, to });
          cur = to;
        }
        break;
      case 'm': {
        flush(false);
        cur = { x: cur.x + nums[i++], y: cur.y + nums[i++] };
        start = { ...cur };
        hasStart = true;
        while (i + 1 < nums.length) {
          const to = { x: cur.x + nums[i++], y: cur.y + nums[i++] };
          segments.push({ c1: { ...cur }, c2: { ...to }, to });
          cur = to;
        }
        break;
      }
      case 'L':
        while (i + 1 < nums.length) {
          const to = { x: nums[i++], y: nums[i++] };
          segments.push({ c1: { ...cur }, c2: { ...to }, to });
          cur = to;
        }
        break;
      case 'l': {
        while (i + 1 < nums.length) {
          const to = { x: cur.x + nums[i++], y: cur.y + nums[i++] };
          segments.push({ c1: { ...cur }, c2: { ...to }, to });
          cur = to;
        }
        break;
      }
      case 'C':
        while (i + 5 < nums.length) {
          const c1 = { x: nums[i++], y: nums[i++] };
          const c2 = { x: nums[i++], y: nums[i++] };
          const to = { x: nums[i++], y: nums[i++] };
          segments.push({ c1, c2, to });
          cur = to;
        }
        break;
      case 'c': {
        while (i + 5 < nums.length) {
          const c1 = { x: cur.x + nums[i++], y: cur.y + nums[i++] };
          const c2 = { x: cur.x + nums[i++], y: cur.y + nums[i++] };
          const to = { x: cur.x + nums[i++], y: cur.y + nums[i++] };
          segments.push({ c1, c2, to });
          cur = to;
        }
        break;
      }
      case 'Z':
      case 'z':
        flush(true);
        cur = { ...start };
        break;
    }
  }
  flush(false);
  if (paths.length === 0) throw new Error('No valid path commands found in SVG d attribute');
  return makeShape('svg-0', 'SVG Path', paths);
}

// Try to extract an SVG path from a full <svg> document.
export function parseSVGDocument(text: string): VecShape[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'image/svg+xml');
  const pathEls = Array.from(doc.querySelectorAll('path'));
  const shapes: VecShape[] = [];
  for (const p of pathEls) {
    const d = p.getAttribute('d');
    if (d) {
      const shape = parseSVGPath(d);
      shape.name = p.getAttribute('id') ?? p.getAttribute('data-name') ?? `Path ${shapes.length + 1}`;
      shape.id = `svg-${shapes.length}`;
      shapes.push(shape);
    }
  }
  if (shapes.length === 0) {
    // maybe raw d string
    const dMatch = text.match(/d="([^"]+)"/);
    if (dMatch) return [parseSVGPath(dMatch[1])];
    throw new Error('No <path> elements found in SVG');
  }
  return shapes;
}

// Detect format and dispatch.
export function parseVectorInput(text: string): VecShape[] {
  const trimmed = text.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    // JSON — likely AE/Lottie
    return parseAfterEffectsJSON(text);
  }
  if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) {
    return parseSVGDocument(text);
  }
  // bare path data?
  if (/[MmCcLlZz]/.test(trimmed[0] ?? '')) {
    return [parseSVGPath(trimmed)];
  }
  // try svg anyway
  try {
    return parseSVGDocument(text);
  } catch {
    throw new Error('Unrecognized vector format. Provide AE JSON, SVG, or an SVG path "d" string.');
  }
}
