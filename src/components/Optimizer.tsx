import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, Zap, Copy, Check, Download, FlaskConical } from 'lucide-react';
import Panel from './Panel';
import StatCard from './StatCard';
import { AetherEngine, type EncodeResult } from '../lib/AetherEngine';
import { demoShapes, demoAEJSON, demoSVGPath } from '../lib/demoData';

interface OptimizerProps {
  onSeedReady: (seed: string) => void;
}

type Status = 'idle' | 'dragging' | 'processing' | 'done';

export default function Optimizer({ onSeedReady }: OptimizerProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [encoding, setEncoding] = useState<EncodeResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const processText = useCallback((data: string | ArrayBuffer, name: string) => {
    setStatus('processing');
    setError('');
    const result = AetherEngine.encodeToSeed(data);
    setEncoding(result);
    setFileName(name);
    setStatus('done');
    onSeedReady(result.seed);
  }, [onSeedReady]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => processText(reader.result as ArrayBuffer, file.name);
    reader.onerror = () => { setError('Could not read file'); };
    reader.readAsArrayBuffer(file);
  }, [processText]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragDepth(0);
    setStatus('dragging');
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    } else {
      const text = e.dataTransfer.getData('text/plain');
      if (text) processText(text, 'pasted-data.txt');
    }
  }, [handleFiles, processText]);

  const loadDemo = useCallback((which: 'ae' | 'svg' | 'shape') => {
    if (which === 'ae') processText(demoAEJSON, 'AetherBolt.ae.json');
    else if (which === 'svg') processText(demoSVGPath, 'bolt-path.svg.d');
    else {
      const result = AetherEngine.encodeToSeed(JSON.stringify([demoShapes[0]]));
      setEncoding(result);
      setFileName('AetherBolt (preset)');
      setStatus('done');
      onSeedReady(result.seed);
    }
  }, [processText, onSeedReady]);

  const copySeed = useCallback(async () => {
    if (!encoding) return;
    try {
      await navigator.clipboard.writeText(encoding.seed);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard may be blocked */ }
  }, [encoding]);

  const downloadSeed = useCallback(() => {
    if (!encoding) return;
    const blob = new Blob([encoding.seed], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aether.seed';
    a.click();
    URL.revokeObjectURL(url);
  }, [encoding]);

  const isDragging = dragDepth > 0;

  return (
    <div className="space-y-4">
      <Panel title="AE Vector Optimizer // Seed Converter" icon={<Zap size={14} />} accent="cyan" glow>
        <div className="p-4 space-y-4">
          {/* Drop zone */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragDepth((d) => d + 1); }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => { e.preventDefault(); setDragDepth((d) => Math.max(0, d - 1)); }}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative cursor-pointer rounded-md border-2 border-dashed transition-all duration-200 p-8 text-center overflow-hidden ${
              isDragging
                ? 'border-neon-cyan bg-neon-cyan/5 shadow-neon-soft scale-[1.01]'
                : 'border-cyber-border hover:border-neon-cyan/40 hover:bg-neon-cyan/5'
            }`}
          >
            {isDragging && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-x-0 h-0.5 bg-neon-cyan animate-scan shadow-neon-soft" />
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className={`mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-xl border transition-all ${
              isDragging ? 'border-neon-cyan bg-neon-cyan/10 animate-pulseGlow' : 'border-cyber-border bg-cyber-panel2'
            }`}>
              <Upload size={24} className={isDragging ? 'text-neon-cyan' : 'text-gray-400'} />
            </div>
            <p className="font-display text-sm font-semibold text-gray-200 tracking-wide">
              {isDragging ? 'RELEASE TO INJECT' : 'DROP ANY FILE HERE'}
            </p>
            <p className="font-mono text-[10px] text-gray-500 mt-1">
              After Effects JSON · SVG · MP4 · MOV · any file format
            </p>
          </div>

          {/* Demo loaders */}
          <div className="flex flex-wrap gap-2">
            <span className="font-mono text-[10px] text-gray-500 self-center mr-1">PRESETS:</span>
            {([
              { k: 'ae', label: 'AE JSON' },
              { k: 'svg', label: 'SVG Path' },
              { k: 'shape', label: 'Built-in' },
            ] as const).map((d) => (
              <button
                key={d.k}
                onClick={() => loadDemo(d.k)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider bg-cyber-panel2/60 border border-cyber-border rounded-md text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/40 transition-all"
              >
                <FlaskConical size={11} /> {d.label}
              </button>
            ))}
          </div>

          {/* Processing shimmer */}
          {status === 'processing' && (
            <div className="p-4 bg-cyber-panel2/60 rounded-md border border-neon-cyan/20">
              <p className="font-mono text-xs text-neon-cyan animate-flicker">COMPRESSING BEZIER MATHEMATICS...</p>
              <div className="mt-2 h-1 bg-cyber-bg rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-neon-cyan to-transparent animate-scan" />
              </div>
            </div>
          )}

          {/* Results */}
          {status === 'done' && encoding && (
            <div className="space-y-4 animate-slideUp">
              {/* File info */}
              <div className="flex items-center gap-2 p-3 bg-cyber-panel2/40 border border-cyber-border/50 rounded-md">
                <FileText size={14} className="text-neon-cyan shrink-0" />
                <span className="font-mono text-xs text-gray-300 truncate">{fileName}</span>
                <span className="ml-auto font-mono text-[10px] text-gray-500">
                  {encoding.originalBytes.toLocaleString()} B → {encoding.seedBytes} B
                </span>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <StatCard label="Original" value={encoding.originalBytes.toLocaleString()} unit="B" accent="amber" />
                <StatCard label="Seed Size" value={encoding.seedBytes} unit="B" accent="lime" />
                <StatCard label="Reduction" value={encoding.reduction.toFixed(1)} unit="%" accent="cyan" size="lg" />
                <StatCard label="Segments" value={encoding.totalSegments} accent="magenta" />
              </div>

              {/* Compression bar */}
              <div className="p-3 bg-cyber-panel2/40 border border-cyber-border/50 rounded-md">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Compression Ratio</span>
                  <span className="font-display text-sm font-bold text-neon-cyan neon-text">
                    {encoding.reduction.toFixed(2)}%
                  </span>
                </div>
                <div className="h-3 bg-cyber-bg rounded-full overflow-hidden border border-cyber-border/40">
                  <div
                    className="h-full bg-gradient-to-r from-neon-amber via-neon-cyan to-neon-lime transition-all duration-700 ease-out shadow-neon-soft"
                    style={{ width: `${Math.min(100, encoding.reduction)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 font-mono text-[9px] text-gray-600">
                  <span>0%</span><span>50%</span><span>99%</span>
                </div>
              </div>

              {/* Seed output */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-neon-cyan">AETHERVECTOR SEED</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={copySeed}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase bg-cyber-panel2/60 border border-cyber-border rounded-md text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/40 transition-all"
                    >
                      {copied ? <Check size={11} className="text-neon-lime" /> : <Copy size={11} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={downloadSeed}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono uppercase bg-cyber-panel2/60 border border-cyber-border rounded-md text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/40 transition-all"
                    >
                      <Download size={11} /> Save
                    </button>
                  </div>
                </div>
                <div className="relative bg-cyber-bg/80 border border-neon-cyan/20 rounded-md p-3 max-h-32 overflow-auto scanlines">
                  <code className="font-mono text-[11px] text-neon-cyan break-all leading-relaxed neon-text">
                    {encoding.seed}
                  </code>
                </div>
                <p className="font-mono text-[9px] text-gray-600 mt-1.5">
                  Δ-encoded · 2-decimal quantized · base64-packed · lossless decode
                </p>
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
