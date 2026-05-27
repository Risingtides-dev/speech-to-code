'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
}

export function MetricCard({ label, value, change, trend = 'neutral', icon }: MetricCardProps) {
  const trendConfig = {
    up: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    down: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
    neutral: { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted' },
  };

  const config = trendConfig[trend];
  const TrendIcon = config.icon;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {change !== undefined && (
          <div className={cn('flex items-center gap-1 rounded-full px-2 py-0.5', config.bg)}>
            <TrendIcon className={cn('h-3 w-3', config.color)} />
            <span className={cn('text-xs font-medium', config.color)}>
              {change > 0 ? '+' : ''}{change}%
            </span>
          </div>
        )}
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
      </div>
    </div>
  );
}
