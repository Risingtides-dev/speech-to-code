'use client';

import { cn } from '@/lib/utils';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorCardProps {
  title: string;
  message: string;
  stack?: string;
  actions?: Array<{ label: string; action: string }>;
  onAction?: (action: string) => void;
  onDismiss?: () => void;
}

export function ErrorCard({ title, message, stack, actions, onAction, onDismiss }: ErrorCardProps) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-red-500/20 bg-red-500/10">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="font-medium text-red-500">{title}</span>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-red-500/60 hover:text-red-500">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <p className="text-sm text-red-200">{message}</p>
        
        {stack && (
          <pre className="text-xs font-mono text-red-300/70 bg-red-950/50 p-3 rounded overflow-x-auto max-h-32">
            {stack}
          </pre>
        )}
        
        {actions && actions.length > 0 && (
          <div className="flex gap-2 pt-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onAction?.(action.action)}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
