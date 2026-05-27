// Component registry mapping json-render specs to React components

import { ToolStatus } from './components/tool-status';
import { CodeBlock } from './components/code-block';
import { FileDiff } from './components/file-diff';
import { Terminal } from './components/terminal';
import { MetricCard } from './components/metric-card';
import { StepList } from './components/step-list';
import { ChoiceList } from './components/choice-list';
import { ErrorCard } from './components/error-card';
import { SuccessCard } from './components/success-card';
import { DataTable } from './components/data-table';
import { FileTree } from './components/file-tree';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { type ComponentType } from 'react';

// Registry maps component type names to React components
export const componentRegistry: Record<string, ComponentType<any>> = {
  // Status & Progress
  ToolStatus,
  ProgressBar: ({ value, label, variant }: { value: number; label?: string; variant?: string }) => (
    <div className="space-y-1.5">
      {label && <div className="text-sm text-muted-foreground">{label}</div>}
      <Progress 
        value={value} 
        className={cn(
          variant === 'success' && '[&>div]:bg-emerald-500',
          variant === 'warning' && '[&>div]:bg-amber-500',
          variant === 'error' && '[&>div]:bg-red-500',
        )}
      />
    </div>
  ),
  Spinner: ({ size, label }: { size?: 'sm' | 'md' | 'lg'; label?: string }) => (
    <div className="flex items-center gap-2">
      <Spinner className={cn(
        size === 'sm' && 'h-4 w-4',
        size === 'lg' && 'h-8 w-8',
        (!size || size === 'md') && 'h-6 w-6',
      )} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  ),
  StepList,

  // Code & Files
  CodeBlock,
  FileDiff,
  FileTree,
  Terminal,

  // Data Display
  DataTable,
  MetricCard,
  ErrorCard,
  SuccessCard,

  // Interactive
  ChoiceList,
  InputPrompt: ({ label, placeholder, type = 'text', defaultValue, onSubmit }: {
    label: string;
    placeholder?: string;
    type?: 'text' | 'password' | 'number';
    defaultValue?: string;
    onSubmit?: (value: string) => void;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSubmit?.(e.currentTarget.value);
          }
        }}
      />
    </div>
  ),
  ConfirmDialog: ({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel }: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'danger';
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{message}</p>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border hover:bg-muted"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={cn(
            'px-4 py-2 text-sm rounded-lg',
            variant === 'danger' 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  ),

  // Layout
  Stack: ({ direction = 'vertical', gap = 'md', align, children }: {
    direction?: 'vertical' | 'horizontal';
    gap?: 'sm' | 'md' | 'lg';
    align?: 'start' | 'center' | 'end' | 'stretch';
    children?: React.ReactNode;
  }) => (
    <div className={cn(
      'flex',
      direction === 'vertical' ? 'flex-col' : 'flex-row',
      gap === 'sm' && 'gap-2',
      gap === 'md' && 'gap-4',
      gap === 'lg' && 'gap-6',
      align === 'start' && 'items-start',
      align === 'center' && 'items-center',
      align === 'end' && 'items-end',
      align === 'stretch' && 'items-stretch',
    )}>
      {children}
    </div>
  ),
  Grid: ({ columns = 2, gap = 'md', children }: {
    columns?: number | string;
    gap?: 'sm' | 'md' | 'lg';
    children?: React.ReactNode;
  }) => (
    <div 
      className={cn(
        'grid',
        gap === 'sm' && 'gap-2',
        gap === 'md' && 'gap-4',
        gap === 'lg' && 'gap-6',
      )}
      style={{ 
        gridTemplateColumns: typeof columns === 'number' 
          ? `repeat(${columns}, minmax(0, 1fr))` 
          : columns 
      }}
    >
      {children}
    </div>
  ),
  Card: ({ title, description, variant, children }: {
    title?: string;
    description?: string;
    variant?: 'default' | 'outline' | 'ghost';
    children?: React.ReactNode;
  }) => (
    <Card className={cn(
      variant === 'ghost' && 'border-0 shadow-none bg-transparent',
    )}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      {children && <CardContent>{children}</CardContent>}
    </Card>
  ),
  Collapsible: ({ title, defaultOpen, icon, children }: {
    title: string;
    defaultOpen?: boolean;
    icon?: string;
    children?: React.ReactNode;
  }) => (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-muted/50">
        <span className="font-medium">{title}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  ),
};
