'use client';

import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  highlights?: number[];
  showLineNumbers?: boolean;
}

export function CodeBlock({ 
  code, 
  language = 'typescript', 
  filename, 
  highlights = [],
  showLineNumbers = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const lines = code.split('\n');

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          {filename && (
            <span className="text-xs font-mono text-zinc-400">
              {filename}
            </span>
          )}
          <span className="text-xs text-zinc-500 uppercase">
            {language}
          </span>
        </div>
        <button
          onClick={copyToClipboard}
          className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      {/* Code */}
      <div className="overflow-x-auto">
        <pre ref={codeRef} className="p-4 text-sm leading-relaxed">
          {lines.map((line, index) => (
            <div
              key={index}
              className={cn(
                'flex',
                highlights.includes(index + 1) && 'bg-yellow-500/10 -mx-4 px-4'
              )}
            >
              {showLineNumbers && (
                <span className="select-none w-8 text-right pr-4 text-zinc-600 text-xs">
                  {index + 1}
                </span>
              )}
              <code className="flex-1">{line || ' '}</code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
