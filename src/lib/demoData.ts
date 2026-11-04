// Sample vector assets so users can try the engine without a file.
import type { VecShape } from './vectorParser';

// A futuristic bolt / lightning glyph drawn with cubic beziers.
const bolt: VecShape = {
  id: 'demo-bolt',
  name: 'AetherBolt',
  bbox: { minX: 0, minY: 0, maxX: 100, maxY: 160 },
  paths: [
    {
      start: { x: 60, y: 0 },
      closed: true,
      segments: [
        { c1: { x: 58, y: 30 }, c2: { x: 40, y: 60 }, to: { x: 30, y: 70 } },
        { c1: { x: 45, y: 78 }, c2: { x: 20, y: 100 }, to: { x: 45, y: 100 } },
        { c1: { x: 40, y: 120 }, c2: { x: 35, y: 140 }, to: { x: 50, y: 160 } },
        { c1: { x: 60, y: 130 }, c2: { x: 70, y: 110 }, to: { x: 75, y: 90 } },
        { c1: { x: 62, y: 86 }, c2: { x: 85, y: 70 }, to: { x: 80, y: 60 } },
        { c1: { x: 75, y: 45 }, c2: { x: 66, y: 20 }, to: { x: 60, y: 0 } },
      ],
    },
  ],
};

// A smooth orbit / ring shape.
const ring: VecShape = {
  id: 'demo-ring',
  name: 'OrbitRing',
  bbox: { minX: 0, minY: 0, maxX: 200, maxY: 200 },
  paths: [
    {
      start: { x: 100, y: 0 },
      closed: true,
      segments: [
        { c1: { x: 155, y: 0 }, c2: { x: 200, y: 45 }, to: { x: 200, y: 100 } },
        { c1: { x: 200, y: 155 }, c2: { x: 155, y: 200 }, to: { x: 100, y: 200 } },
        { c1: { x: 45, y: 200 }, c2: { x: 0, y: 155 }, to: { x: 0, y: 100 } },
        { c1: { x: 0, y: 45 }, c2: { x: 45, y: 0 }, to: { x: 100, y: 0 } },
      ],
    },
  ],
};

// An abstract wave ribbon.
const wave: VecShape = {
  id: 'demo-wave',
  name: 'WaveRibbon',
  bbox: { minX: 0, minY: 20, maxX: 300, maxY: 120 },
  paths: [
    {
      start: { x: 0, y: 80 },
      closed: false,
      segments: [
        { c1: { x: 50, y: 20 }, c2: { x: 100, y: 140 }, to: { x: 150, y: 80 } },
        { c1: { x: 200, y: 20 }, c2: { x: 250, y: 140 }, to: { x: 300, y: 80 } },
      ],
    },
    {
      start: { x: 0, y: 100 },
      closed: false,
      segments: [
        { c1: { x: 50, y: 40 }, c2: { x: 100, y: 160 }, to: { x: 150, y: 100 } },
        { c1: { x: 200, y: 40 }, c2: { x: 250, y: 160 }, to: { x: 300, y: 100 } },
      ],
    },
  ],
};

export const demoShapes: VecShape[] = [bolt, ring, wave];

// A small AE-Lottie-style JSON string users can drop into the optimizer.
export const demoAEJSON = JSON.stringify({
  layers: [
    {
      ty: 4,
      ind: 0,
      nm: 'AetherBolt',
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'sh',
              ks: {
                k: {
                  c: true,
                  i: [
                    [-2, 30], [5, 8], [-10, 22], [-5, 20], [10, -30], [-13, -20], [5, -15],
                  ],
                  o: [
                    [3, -30], [-5, -8], [10, -22], [5, -20], [-10, 30], [13, 20], [-5, 15],
                  ],
                  v: [
                    [60, 0], [30, 70], [45, 100], [50, 160], [75, 90], [80, 60], [60, 0],
                  ],
                },
              },
            },
          ],
        },
      ],
    },
  ],
}, null, 2);

// Raw SVG path string.
export const demoSVGPath = 'M60,0 C58,30 40,60 30,70 C45,78 20,100 45,100 C40,120 35,140 50,160 C60,130 70,110 75,90 C62,86 85,70 80,60 C75,45 66,20 60,0 Z';
