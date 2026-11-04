import type { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
  accent?: 'cyan' | 'magenta' | 'lime' | 'amber';
  icon?: ReactNode;
  glow?: boolean;
}

const accentText: Record<string, string> = {
  cyan: 'text-neon-cyan',
  magenta: 'text-neon-magenta',
  lime: 'text-neon-lime',
  amber: 'text-neon-amber',
};

const accentBorder: Record<string, string> = {
  cyan: 'border-neon-cyan/30',
  magenta: 'border-neon-magenta/30',
  lime: 'border-neon-lime/30',
  amber: 'border-neon-amber/30',
};

const glowClass: Record<string, string> = {
  cyan: 'shadow-neon-cyan',
  magenta: 'shadow-neon-magenta',
  lime: 'shadow-neon-soft',
  amber: 'shadow-neon-soft',
};

export default function Panel({ children, className = '', title, accent = 'cyan', icon, glow = false }: PanelProps) {
  return (
    <div
      className={`relative aether-panel rounded-lg ${accentBorder[accent]} ${glow ? glowClass[accent] : ''} glow-border ${className}`}
    >
      {title && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-cyber-border/60">
          {icon && <span className={accentText[accent]}>{icon}</span>}
          <h3 className={`font-display text-xs font-bold tracking-[0.2em] uppercase ${accentText[accent]}`}>
            {title}
          </h3>
          <div className="ml-auto flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full bg-current ${accentText[accent]} animate-flicker`} />
            <span className="font-mono text-[9px] text-gray-600">ONLINE</span>
          </div>
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
