'use client';

import { cn } from '@/lib/utils';

interface FileDiffProps {
  filename: string;
  before: string;
  after: string;
  language?: string;
}

export function FileDiff({ filename, before, after, language = 'typescript' }: FileDiffProps) {
  // Simple diff - find changed lines
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');

  return (
    <div className="rounded-lg border bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <span className="text-xs font-mono text-zinc-400">
          {filename}
        </span>
        <span className="text-xs text-zinc-500">
          {beforeLines.length !== afterLines.length
            ? `${Math.abs(afterLines.length - beforeLines.length)} lines ${afterLines.length > beforeLines.length ? 'added' : 'removed'}`
            : 'Modified'}
        </span>
      </div>
      
      {/* Diff view */}
      <div className="overflow-x-auto">
        <div className="p-4 text-sm leading-relaxed font-mono">
          {/* Removed lines */}
          {beforeLines.map((line, i) => {
            const isRemoved = !afterLines.includes(line);
            if (!isRemoved) return null;
            return (
              <div key={`rm-${i}`} className="flex bg-red-500/10 -mx-4 px-4">
                <span className="select-none w-6 text-red-400 text-xs">-</span>
                <code className="text-red-300">{line || ' '}</code>
              </div>
            );
          })}
          
          {/* Added lines */}
          {afterLines.map((line, i) => {
            const isAdded = !beforeLines.includes(line);
            if (!isAdded) return null;
            return (
              <div key={`add-${i}`} className="flex bg-emerald-500/10 -mx-4 px-4">
                <span className="select-none w-6 text-emerald-400 text-xs">+</span>
                <code className="text-emerald-300">{line || ' '}</code>
              </div>
            );
          })}

          {/* Context - unchanged lines */}
          {afterLines.filter(line => beforeLines.includes(line)).slice(0, 3).map((line, i) => (
            <div key={`ctx-${i}`} className="flex text-zinc-500">
              <span className="select-none w-6 text-zinc-600 text-xs">&nbsp;</span>
              <code>{line || ' '}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
