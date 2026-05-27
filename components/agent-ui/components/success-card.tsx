'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuccessCardProps {
  title: string;
  message: string;
  actions?: Array<{ label: string; action: string }>;
  onAction?: (action: string) => void;
}

export function SuccessCard({ title, message, actions, onAction }: SuccessCardProps) {
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/10">
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        <span className="font-medium text-emerald-500">{title}</span>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <p className="text-sm text-emerald-200">{message}</p>
        
        {actions && actions.length > 0 && (
          <div className="flex gap-2 pt-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onAction?.(action.action)}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
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
