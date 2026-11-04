import { useState } from 'react';
import { Zap, Activity, Cpu, Radar, Terminal } from 'lucide-react';
import Optimizer from './components/Optimizer';
import Renderer from './components/Renderer';
import { AetherEngine } from './lib/AetherEngine';
import { demoShapes } from './lib/demoData';

export default function App() {
  const [seed, setSeed] = useState<string | null>(null);
  const [bootTime] = useState(() => new Date().toISOString().slice(11, 19));

  const handleSeedReady = (s: string) => {
    setSeed(s);
  };

  // Auto-load the demo bolt on first mount so the renderer isn't empty.
  const initSeed = () => {
    if (seed) return seed;
    const result = AetherEngine.encodeToSeed(JSON.stringify([demoShapes[0]]));
    return result.seed;
  };

  return (
    <div className="min-h-screen cyber-grid-animated bg-cyber-bg text-gray-200 relative">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-neon-cyan/5 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-neon-magenta/5 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-neon-blue/5 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-cyber-border/60 bg-cyber-panel backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 flex items-center justify-center">
              <div className="absolute inset-0 border border-neon-cyan/40 rounded-md animate-pulseGlow" />
              <Zap size={20} className="text-neon-cyan neon-text" />
            </div>
            <div>
              <h1 className="font-display text-lg sm:text-xl font-black tracking-[0.15em] text-white leading-none">
                AETHER<span className="text-neon-cyan neon-text">VECTOR</span>
              </h1>
              <p className="font-mono text-[9px] text-gray-500 tracking-[0.3em] uppercase mt-0.5">
                Engine v1.0 · Quantum Render Core
              </p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="hidden md:flex items-center gap-4 ml-6">
            <StatusChip icon={<Cpu size={11} />} label="CORE" value="ONLINE" color="cyan" />
            <StatusChip icon={<Radar size={11} />} label="FPS" value="60" color="lime" />
            <StatusChip icon={<Activity size={11} />} label="LATENCY" value="0.2ms" color="magenta" />
          </div>

          {/* Boot time */}
          <div className="ml-auto flex items-center gap-2 font-mono text-[10px] text-gray-500">
            <Terminal size={12} className="text-neon-cyan/60" />
            <span className="hidden sm:inline">SYS_BOOT</span>
            <span className="text-neon-cyan/80 type-cursor">{bootTime}</span>
          </div>
        </div>
        {/* Bottom accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-neon-cyan/40 to-transparent" />
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Intro banner */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 animate-slideUp">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-wide">
              Vector Compression <span className="text-neon-magenta neon-text">×</span> Quantum Renderer
            </h2>
            <p className="font-body text-sm text-gray-400 mt-1 max-w-2xl">
              Drop After Effects or SVG vector data to compress bezier curves into a featherweight seed,
              then render it in real time with physics-driven animation.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge label="99% COMPRESSION" color="cyan" />
            <Badge label="60 FPS" color="lime" />
            <Badge label="ZERO-DEP" color="magenta" />
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Optimizer onSeedReady={handleSeedReady} />
          <Renderer seed={initSeed()} />
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-cyber-border/40 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-mono text-[10px] text-gray-600 tracking-wider">
            AETHERVECTOR ENGINE · BEZIER COMPRESSION PROTOCOL · DELTA-ENCODED SEED FORMAT
          </p>
          <p className="font-mono text-[10px] text-gray-700">
            // Crafted for high-performance motion graphics
          </p>
        </footer>
      </main>
    </div>
  );
}

function StatusChip({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: 'cyan' | 'lime' | 'magenta' }) {
  const colorMap = { cyan: 'text-neon-cyan', lime: 'text-neon-lime', magenta: 'text-neon-magenta' };
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyber-panel2/60 border border-cyber-border/50 rounded-md">
      <span className={colorMap[color]}>{icon}</span>
      <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">{label}</span>
      <span className={`font-mono text-[10px] font-bold ${colorMap[color]}`}>{value}</span>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: 'cyan' | 'lime' | 'magenta' }) {
  const colorMap = {
    cyan: 'border-neon-cyan/30 text-neon-cyan',
    lime: 'border-neon-lime/30 text-neon-lime',
    magenta: 'border-neon-magenta/30 text-neon-magenta',
  };
  return (
    <span className={`px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest bg-cyber-panel2/60 border ${colorMap[color]} rounded-md`}>
      {label}
    </span>
  );
}
