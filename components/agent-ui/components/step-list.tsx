'use client';

import { cn } from '@/lib/utils';
import { Check, Circle, Loader2, X } from 'lucide-react';

interface Step {
  label: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  description?: string;
}

interface StepListProps {
  steps: Step[];
  currentStep?: number;
}

export function StepList({ steps, currentStep }: StepListProps) {
  const statusConfig = {
    pending: { icon: Circle, color: 'text-muted-foreground', line: 'bg-muted' },
    running: { icon: Loader2, color: 'text-blue-500', line: 'bg-blue-500' },
    complete: { icon: Check, color: 'text-emerald-500', line: 'bg-emerald-500' },
    error: { icon: X, color: 'text-red-500', line: 'bg-red-500' },
  };

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const config = statusConfig[step.status];
        const Icon = config.icon;
        const isLast = index === steps.length - 1;

        return (
          <div key={index} className="flex gap-3">
            {/* Status icon and line */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full border-2',
                step.status === 'complete' && 'border-emerald-500 bg-emerald-500/10',
                step.status === 'running' && 'border-blue-500 bg-blue-500/10',
                step.status === 'error' && 'border-red-500 bg-red-500/10',
                step.status === 'pending' && 'border-muted bg-muted/50',
              )}>
                <Icon className={cn(
                  'h-4 w-4',
                  config.color,
                  step.status === 'running' && 'animate-spin'
                )} />
              </div>
              {!isLast && (
                <div className={cn(
                  'w-0.5 flex-1 min-h-[24px]',
                  step.status === 'complete' ? 'bg-emerald-500' : 'bg-muted'
                )} />
              )}
            </div>

            {/* Content */}
            <div className={cn('pb-6', isLast && 'pb-0')}>
              <p className={cn(
                'font-medium',
                step.status === 'pending' && 'text-muted-foreground'
              )}>
                {step.label}
              </p>
              {step.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
