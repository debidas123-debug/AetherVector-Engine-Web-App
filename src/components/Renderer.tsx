import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Code2, Copy, Check, Gauge, Sparkles, Activity } from 'lucide-react';
import Panel from './Panel';
import { AetherEngine, type DecodeResult } from '../lib/AetherEngine';
import { pathToPoints } from '../lib/seedCodec';
import type { VecShape, Vec2 } from '../lib/vectorParser';

interface RendererProps {
  seed: string | null;
}

interface PhysicsParams {
  gravity: number;
  elasticity: number;
  damping: number;
  speed: number;
  turbulence: number;
  stroke: number;
  glow: number;
}

const DEFAULT_PARAMS: PhysicsParams = {
  gravity: 0.5,
  elasticity: 0.85,
  damping: 0.92,
  speed: 1.0,
  turbulence: 0.3,
  stroke: 2,
  glow: 18,
};

// Particle that traces a decoded path with physics applied to its anchor.
interface Particle {
  basePoints: Vec2[]; // normalized 0..1 points for the shape
  offset: Vec2;
  vel: Vec2;
  phase: number;
  hue: number;
  scale: number;
  closed: boolean;
}

export default function Renderer({ seed }: RendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const paramsRef = useRef<PhysicsParams>(DEFAULT_PARAMS);
  const particlesRef = useRef<Particle[]>([]);
  const shapesRef = useRef<DecodeResult | null>(null);
  const playingRef = useRef(true);
  const timeRef = useRef(0);

  const [params, setParams] = useState<PhysicsParams>(DEFAULT_PARAMS);
  const [playing, setPlaying] = useState(true);
  const [decoded, setDecoded] = useState<DecodeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState('');

  const updateParam = useCallback((key: keyof PhysicsParams, value: number) => {
    setParams((p) => {
      const next = { ...p, [key]: value };
      paramsRef.current = next;
      return next;
    });
  }, []);

  // Decode seed whenever it changes.
  useEffect(() => {
    if (!seed) { setDecoded(null); return; }
    try {
      const dec = AetherEngine.decodeSeed(seed);
      shapesRef.current = dec;
      setDecoded(dec);
      setError('');
      buildParticles(dec.shapes, dec.bbox);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bad seed');
      setDecoded(null);
    }
  }, [seed]);

  const buildParticles = useCallback((shapes: VecShape[], bbox: { minX: number; minY: number; maxX: number; maxY: number }) => {
    const w = bbox.maxX - bbox.minX || 1;
    const h = bbox.maxY - bbox.minY || 1;
    const particles: Particle[] = [];
    shapes.forEach((shape, si) => {
      shape.paths.forEach((path, pi) => {
        const pts = pathToPoints(path, 20);
        const norm = pts.map((p) => ({ x: (p.x - bbox.minX) / w, y: (p.y - bbox.minY) / h }));
        particles.push({
          basePoints: norm,
          offset: { x: 0, y: 0 },
          vel: { x: 0, y: 0 },
          phase: (si + pi) * 0.7,
          hue: (si * 60 + pi * 40) % 360,
          scale: 1,
          closed: path.closed,
        });
      });
    });
    particlesRef.current = particles;
  }, []);

  const reset = useCallback(() => {
    particlesRef.current.forEach((p) => { p.offset = { x: 0, y: 0 }; p.vel = { x: 0, y: 0 }; });
    timeRef.current = 0;
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((p) => { playingRef.current = !p; return !p; });
  }, []);

  // Main animation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let last = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const rect = canvas.getBoundingClientRect();
      const W = rect.width, H = rect.height;

      // Background fade trail
      ctx.fillStyle = 'rgba(3, 7, 18, 0.18)';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.04)';
      ctx.lineWidth = 1;
      const grid = 40;
      for (let x = 0; x < W; x += grid) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += grid) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      if (!playingRef.current) return;
      timeRef.current += dt * paramsRef.current.speed;
      const t = timeRef.current;
      const p = paramsRef.current;

      const particles = particlesRef.current;
      const cx = W / 2, cy = H / 2;
      const baseSize = Math.min(W, H) * 0.55;

      for (const part of particles) {
        // Physics: gravity pulls offset, spring back to center, turbulence.
        const spring = 0.02 * p.elasticity;
        part.vel.x += (-part.offset.x * spring + Math.sin(t * 1.3 + part.phase) * p.turbulence * 0.15 - p.gravity * 0.03) * dt * 60;
        part.vel.y += (part.offset.y * spring + Math.cos(t * 1.7 + part.phase) * p.turbulence * 0.15 + p.gravity * 0.06) * dt * 60;
        part.vel.x *= p.damping;
        part.vel.y *= p.damping;
        part.offset.x += part.vel.x * dt * 60 * 0.06;
        part.offset.y += part.vel.y * dt * 60 * 0.06;

        const ox = cx + part.offset.x * baseSize * 0.3;
        const oy = cy + part.offset.y * baseSize * 0.3;
        const s = baseSize * part.scale;

        // Color
        const hueShift = (part.hue + t * 20) % 360;
        const strokeColor = `hsl(${hueShift}, 100%, 60%)`;
        const glowColor = `hsla(${hueShift}, 100%, 55%, 0.5)`;

        // Draw path
        ctx.save();
        ctx.beginPath();
        const pts = part.basePoints;
        if (pts.length > 0) {
          ctx.moveTo(ox + pts[0].x * s, oy + pts[0].y * s);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(ox + pts[i].x * s, oy + pts[i].y * s);
          }
          if (part.closed) ctx.closePath();
        }
        ctx.lineWidth = p.stroke;
        ctx.strokeStyle = strokeColor;
        ctx.shadowBlur = p.glow;
        ctx.shadowColor = glowColor;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Inner highlight
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `hsla(${hueShift}, 100%, 85%, 0.4)`;
        ctx.lineWidth = Math.max(0.5, p.stroke * 0.3);
        ctx.stroke();
        ctx.restore();
      }

      // Center crosshair
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
      ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
      ctx.stroke();
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generateCodeExport(seed, params));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  }, [seed, params]);

  const sliders: { key: keyof PhysicsParams; label: string; min: number; max: number; step: number; unit?: string; icon: typeof Gauge }[] = [
    { key: 'gravity', label: 'Gravity', min: 0, max: 2, step: 0.01, icon: Activity },
    { key: 'elasticity', label: 'Elasticity', min: 0, max: 1.5, step: 0.01, icon: Sparkles },
    { key: 'damping', label: 'Damping', min: 0.5, max: 0.999, step: 0.001, icon: Gauge },
    { key: 'speed', label: 'Speed', min: 0, max: 3, step: 0.01, icon: Gauge },
    { key: 'turbulence', label: 'Turbulence', min: 0, max: 1.5, step: 0.01, icon: Sparkles },
    { key: 'stroke', label: 'Stroke', min: 0.5, max: 6, step: 0.1, unit: 'px', icon: Gauge },
    { key: 'glow', label: 'Glow', min: 0, max: 40, step: 1, unit: 'px', icon: Sparkles },
  ];

  return (
    <div className="space-y-4">
      <Panel title="Quantum-Inspired Real-Time Renderer" icon={<Activity size={14} />} accent="magenta" glow>
        <div className="p-4 space-y-4">
          {/* Canvas viewport */}
          <div className="quantum-canvas-container scanlines rounded-md" style={{ aspectRatio: '16 / 10' }}>
            <div className="hud-scanline" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            {!decoded && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <Activity size={32} className="text-neon-magenta/40 mx-auto mb-2 animate-flicker" />
                  <p className="font-mono text-xs text-gray-500">
                    {error ? `ERROR: ${error}` : 'AWAITING SEED INPUT FROM OPTIMIZER...'}
                  </p>
                </div>
              </div>
            )}
            {/* HUD overlay */}
            <div className="absolute top-3 left-3 font-mono text-[9px] text-neon-magenta/70 uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-neon-magenta animate-flicker" />
                RENDERER · 60FPS
              </div>
            </div>
            <div className="absolute top-3 right-3 font-mono text-[9px] text-gray-500">
              {decoded ? `${decoded.shapes.length} SHAPES` : 'IDLE'}
            </div>
            <div className="absolute bottom-3 left-3 font-mono text-[9px] text-neon-cyan/60">
              {params.speed.toFixed(2)}x · G{params.gravity.toFixed(2)} · E{params.elasticity.toFixed(2)}
            </div>
          </div>

          {/* Code Export — prominent action bar right below the canvas */}
          <button
            onClick={() => setShowCode((s) => !s)}
            className={`group flex w-full items-center justify-center gap-2.5 px-5 py-3 rounded-md border font-display text-sm font-bold uppercase tracking-widest transition-all duration-200 ${
              showCode
                ? 'bg-neon-cyan/15 border-neon-cyan shadow-neon-soft text-neon-cyan'
                : 'bg-gradient-to-r from-neon-cyan/10 to-neon-magenta/10 border-neon-cyan/40 text-neon-cyan hover:border-neon-cyan hover:shadow-neon-soft hover:scale-[1.01]'
            }`}
          >
            <Code2 size={18} className={showCode ? '' : 'group-hover:scale-110 transition-transform'} />
            Code Export
            {showCode ? <Check size={14} className="text-neon-lime" /> : <span className="font-mono text-[10px] text-gray-500 normal-case tracking-normal ml-1">click to reveal</span>}
          </button>

          {/* Code export panel */}
          {showCode && (
            <div className="animate-slideUp">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-neon-cyan">
                  &lt;/&gt; Developer Code Export
                </span>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase bg-cyber-panel2/60 border border-cyber-border rounded-md text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/40 transition-all"
                >
                  {copied ? <Check size={11} className="text-neon-lime" /> : <Copy size={11} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="bg-cyber-bg/90 border border-neon-cyan/20 rounded-md p-3 max-h-64 overflow-auto scanlines">
                <code className="font-mono text-[10px] leading-relaxed text-gray-300 whitespace-pre">
                  {generateCodeExport(seed, params)}
                </code>
              </pre>
            </div>
          )}

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyber-panel2/80 border border-neon-magenta/30 rounded-md font-mono text-xs uppercase tracking-wider text-neon-magenta hover:bg-neon-magenta/10 transition-all"
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyber-panel2/60 border border-cyber-border rounded-md font-mono text-xs uppercase tracking-wider text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/40 transition-all"
            >
              <RotateCcw size={14} /> Reset
            </button>
            <div className="ml-auto font-mono text-[10px] text-gray-500">
              {playing ? <span className="text-neon-lime">● LIVE</span> : <span className="text-neon-amber">● PAUSED</span>}
            </div>
          </div>

          {/* Physics sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 p-3 bg-cyber-panel2/40 border border-cyber-border/50 rounded-md">
            {sliders.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-gray-400">
                      <Icon size={11} className="text-neon-cyan/70" /> {s.label}
                    </label>
                    <span className="font-mono text-[11px] text-neon-cyan font-semibold">
                      {params[s.key].toFixed(s.step < 0.1 ? 3 : 2)}{s.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    className="aether-slider"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={params[s.key]}
                    onChange={(e) => updateParam(s.key, parseFloat(e.target.value))}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function generateCodeExport(seed: string | null, params: PhysicsParams): string {
  const seedStr = seed ?? 'AV1|...';
  return `// AetherVector Engine — Runtime Integration
// Paste this into your project to render the decoded seed.

import { AetherEngine } from 'aether-vector';

const SEED = "${seedStr.slice(0, 80)}${seedStr.length > 80 ? '...' : ''}";

const physics = {
  gravity: ${params.gravity},
  elasticity: ${params.elasticity},
  damping: ${params.damping},
  speed: ${params.speed},
  turbulence: ${params.turbulence},
  stroke: ${params.stroke},
  glow: ${params.glow},
};

function init(canvas) {
  const ctx = canvas.getContext('2d');
  const { shapes, bbox } = AetherEngine.decodeSeed(SEED);
  const particles = shapes.flatMap(s => s.paths.map(p => ({
    points: pathToPoints(p, 20),
    offset: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    closed: p.closed,
  })));

  let t = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    t += (1/60) * physics.speed;
    ctx.fillStyle = 'rgba(5,6,10,0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2, cy = canvas.height / 2;
    const size = Math.min(canvas.width, canvas.height) * 0.55;

    particles.forEach((part, i) => {
      part.vel.x += (-part.offset.x * 0.02 * physics.elasticity
        + Math.sin(t * 1.3 + i) * physics.turbulence * 0.15) * 60/60;
      part.vel.y += (part.offset.y * 0.02 * physics.elasticity
        + Math.cos(t * 1.7 + i) * physics.turbulence * 0.15
        + physics.gravity * 0.06) * 60/60;
      part.vel.x *= physics.damping;
      part.vel.y *= physics.damping;
      part.offset.x += part.vel.x * 3.6;
      part.offset.y += part.vel.y * 3.6;

      ctx.beginPath();
      const ox = cx + part.offset.x * size * 0.3;
      const oy = cy + part.offset.y * size * 0.3;
      const w = bbox.maxX - bbox.minX, h = bbox.maxY - bbox.minY;
      part.points.forEach((pt, j) => {
        const x = ox + (pt.x - bbox.minX) / w * size;
        const y = oy + (pt.y - bbox.minY) / h * size;
        j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      if (part.closed) ctx.closePath();
      ctx.strokeStyle = \`hsl(\${(i*60 + t*20) % 360}, 100%, 60%)\`;
      ctx.lineWidth = physics.stroke;
      ctx.shadowBlur = physics.glow;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.lineJoin = 'round';
      ctx.stroke();
    });
  }
  requestAnimationFrame(frame);
}`;
}
