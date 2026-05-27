// Agent UI Catalog for json-render
// Defines the component library available to the coding agent

import { z } from 'zod/v4';
import { createCatalog } from '@json-render/core';

// Schema definitions for each component
export const ToolStatusSchema = z.object({
  toolName: z.string(),
  status: z.enum(['pending', 'running', 'success', 'error']),
  duration: z.number().optional(),
  message: z.string().optional(),
});

export const ProgressBarSchema = z.object({
  value: z.number().min(0).max(100),
  label: z.string().optional(),
  variant: z.enum(['default', 'success', 'warning', 'error']).optional(),
});

export const SpinnerSchema = z.object({
  size: z.enum(['sm', 'md', 'lg']).optional(),
  label: z.string().optional(),
});

export const StepSchema = z.object({
  label: z.string(),
  status: z.enum(['pending', 'running', 'complete', 'error']),
  description: z.string().optional(),
});

export const StepListSchema = z.object({
  steps: z.array(StepSchema),
  currentStep: z.number().optional(),
});

export const CodeBlockSchema = z.object({
  code: z.string(),
  language: z.string().optional(),
  filename: z.string().optional(),
  highlights: z.array(z.number()).optional(),
  showLineNumbers: z.boolean().optional(),
});

export const FileDiffSchema = z.object({
  filename: z.string(),
  before: z.string(),
  after: z.string(),
  language: z.string().optional(),
});

export const FileNodeSchema: z.ZodType<FileNode> = z.object({
  name: z.string(),
  type: z.enum(['file', 'directory']),
  children: z.lazy(() => z.array(FileNodeSchema)).optional(),
  icon: z.string().optional(),
});

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  icon?: string;
}

export const FileTreeSchema = z.object({
  files: z.array(FileNodeSchema),
  selectedPath: z.string().optional(),
});

export const TerminalLineSchema = z.object({
  type: z.enum(['input', 'output', 'error']),
  text: z.string(),
  timestamp: z.number().optional(),
});

export const TerminalSchema = z.object({
  lines: z.array(TerminalLineSchema),
  title: z.string().optional(),
});

export const ColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  width: z.string().optional(),
});

export const DataTableSchema = z.object({
  columns: z.array(ColumnSchema),
  rows: z.array(z.record(z.unknown())),
  sortable: z.boolean().optional(),
});

export const MetricCardSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  change: z.number().optional(),
  trend: z.enum(['up', 'down', 'neutral']).optional(),
  icon: z.string().optional(),
});

export const ErrorCardSchema = z.object({
  title: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  actions: z.array(z.object({
    label: z.string(),
    action: z.string(),
  })).optional(),
});

export const SuccessCardSchema = z.object({
  title: z.string(),
  message: z.string(),
  actions: z.array(z.object({
    label: z.string(),
    action: z.string(),
  })).optional(),
});

export const OptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  description: z.string().optional(),
  disabled: z.boolean().optional(),
});

export const ChoiceListSchema = z.object({
  options: z.array(OptionSchema),
  selected: z.string().optional(),
  multiSelect: z.boolean().optional(),
});

export const InputPromptSchema = z.object({
  label: z.string(),
  placeholder: z.string().optional(),
  type: z.enum(['text', 'password', 'number']).optional(),
  defaultValue: z.string().optional(),
});

export const ConfirmDialogSchema = z.object({
  title: z.string(),
  message: z.string(),
  confirmLabel: z.string().optional(),
  cancelLabel: z.string().optional(),
  variant: z.enum(['default', 'danger']).optional(),
});

export const StackSchema = z.object({
  direction: z.enum(['vertical', 'horizontal']).optional(),
  gap: z.enum(['sm', 'md', 'lg']).optional(),
  align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
});

export const GridSchema = z.object({
  columns: z.union([z.number(), z.string()]).optional(),
  gap: z.enum(['sm', 'md', 'lg']).optional(),
});

export const CardSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  variant: z.enum(['default', 'outline', 'ghost']).optional(),
});

export const CollapsibleSchema = z.object({
  title: z.string(),
  defaultOpen: z.boolean().optional(),
  icon: z.string().optional(),
});

// Create the catalog with all components
export const agentCatalog = createCatalog({
  // Status & Progress
  ToolStatus: {
    schema: ToolStatusSchema,
    description: 'Display tool execution status with timing',
  },
  ProgressBar: {
    schema: ProgressBarSchema,
    description: 'Show progress of long-running operations',
  },
  Spinner: {
    schema: SpinnerSchema,
    description: 'Loading indicator',
  },
  StepList: {
    schema: StepListSchema,
    description: 'Multi-step workflow progress',
  },

  // Code & Files
  CodeBlock: {
    schema: CodeBlockSchema,
    description: 'Display code with syntax highlighting',
  },
  FileDiff: {
    schema: FileDiffSchema,
    description: 'Show before/after file changes',
  },
  FileTree: {
    schema: FileTreeSchema,
    description: 'Display file system structure',
  },
  Terminal: {
    schema: TerminalSchema,
    description: 'Terminal output display',
  },

  // Data Display
  DataTable: {
    schema: DataTableSchema,
    description: 'Tabular data display',
  },
  MetricCard: {
    schema: MetricCardSchema,
    description: 'Single metric with trend',
  },
  ErrorCard: {
    schema: ErrorCardSchema,
    description: 'Error message display',
  },
  SuccessCard: {
    schema: SuccessCardSchema,
    description: 'Success message display',
  },

  // Interactive
  ChoiceList: {
    schema: ChoiceListSchema,
    description: 'Selection from options',
  },
  InputPrompt: {
    schema: InputPromptSchema,
    description: 'Request user text input',
  },
  ConfirmDialog: {
    schema: ConfirmDialogSchema,
    description: 'Confirmation prompt',
  },

  // Layout
  Stack: {
    schema: StackSchema,
    description: 'Vertical or horizontal stack',
  },
  Grid: {
    schema: GridSchema,
    description: 'Grid layout',
  },
  Card: {
    schema: CardSchema,
    description: 'Content card container',
  },
  Collapsible: {
    schema: CollapsibleSchema,
    description: 'Expandable section',
  },
});

export type AgentCatalog = typeof agentCatalog;
