interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  accent?: 'cyan' | 'magenta' | 'lime' | 'amber' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

const accentText: Record<string, string> = {
  cyan: 'text-neon-cyan',
  magenta: 'text-neon-magenta',
  lime: 'text-neon-lime',
  amber: 'text-neon-amber',
  red: 'text-neon-red',
};

const accentBar: Record<string, string> = {
  cyan: 'from-neon-cyan to-neon-blue',
  magenta: 'from-neon-magenta to-neon-pink',
  lime: 'from-neon-lime to-neon-cyan',
  amber: 'from-neon-amber to-neon-magenta',
  red: 'from-neon-red to-neon-magenta',
};

export default function StatCard({ label, value, unit, accent = 'cyan', size = 'md' }: StatCardProps) {
  const valSize = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl';
  return (
    <div className="relative bg-cyber-panel2/60 rounded-md border border-cyber-border/50 p-3 overflow-hidden">
      <div className={`absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r ${accentBar[accent]} opacity-60`} />
      <div className="font-mono text-[9px] uppercase tracking-widest text-gray-500 mb-1">{label}</div>
      <div className={`font-display font-bold ${valSize} ${accentText[accent]} leading-none`}>
        {value}
        {unit && <span className="text-sm text-gray-500 ml-1 font-mono">{unit}</span>}
      </div>
    </div>
  );
}
