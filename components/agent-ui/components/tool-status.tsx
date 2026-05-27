'use client';

import { cn } from '@/lib/utils';
import { Loader2, Check, X, Clock } from 'lucide-react';

interface ToolStatusProps {
  toolName: string;
  status: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  message?: string;
}

export function ToolStatus({ toolName, status, duration, message }: ToolStatusProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-muted-foreground',
      bg: 'bg-muted/50',
      label: 'Pending',
    },
    running: {
      icon: Loader2,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      label: 'Running',
    },
    success: {
      icon: Check,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      label: 'Complete',
    },
    error: {
      icon: X,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      label: 'Error',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-3 rounded-lg p-3', config.bg)}>
      <div className={cn('flex-shrink-0', config.color)}>
        <Icon 
          className={cn('h-5 w-5', status === 'running' && 'animate-spin')} 
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium truncate">
            {toolName}
          </span>
          <span className={cn('text-xs', config.color)}>
            {config.label}
          </span>
        </div>
        {message && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {message}
          </p>
        )}
      </div>
      {duration !== undefined && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {duration}ms
        </span>
      )}
    </div>
  );
}
