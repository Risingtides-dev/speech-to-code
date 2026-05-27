'use client';

import { cn } from '@/lib/utils';

interface TerminalLine {
  type: 'input' | 'output' | 'error';
  text: string;
  timestamp?: number;
}

interface TerminalProps {
  lines: TerminalLine[];
  title?: string;
}

export function Terminal({ lines, title = 'Terminal' }: TerminalProps) {
  return (
    <div className="rounded-lg border bg-zinc-950 overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <span className="text-xs text-zinc-500 ml-2">{title}</span>
      </div>
      
      {/* Terminal content */}
      <div className="p-4 font-mono text-sm max-h-64 overflow-y-auto">
        {lines.map((line, index) => (
          <div
            key={index}
            className={cn(
              'whitespace-pre-wrap',
              line.type === 'input' && 'text-emerald-400',
              line.type === 'output' && 'text-zinc-300',
              line.type === 'error' && 'text-red-400'
            )}
          >
            {line.text}
          </div>
        ))}
        {/* Cursor */}
        <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse" />
      </div>
    </div>
  );
}
