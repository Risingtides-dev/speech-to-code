// Agent UI Catalog - Component Schema Definitions
// These schemas define what props each UI component accepts

import { z } from 'zod/v4';

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

// Component type mapping for the catalog
export const componentSchemas = {
  ToolStatus: ToolStatusSchema,
  ProgressBar: ProgressBarSchema,
  Spinner: SpinnerSchema,
  StepList: StepListSchema,
  CodeBlock: CodeBlockSchema,
  FileDiff: FileDiffSchema,
  FileTree: FileTreeSchema,
  Terminal: TerminalSchema,
  DataTable: DataTableSchema,
  MetricCard: MetricCardSchema,
  ErrorCard: ErrorCardSchema,
  SuccessCard: SuccessCardSchema,
  ChoiceList: ChoiceListSchema,
  InputPrompt: InputPromptSchema,
  ConfirmDialog: ConfirmDialogSchema,
  Stack: StackSchema,
  Grid: GridSchema,
  Card: CardSchema,
  Collapsible: CollapsibleSchema,
} as const;

export type ComponentType = keyof typeof componentSchemas;

// UI Spec format for streaming
export interface UISpec {
  component: ComponentType;
  props: Record<string, unknown>;
  children?: UISpec[];
  id?: string;
}

// Validate a spec against its schema
export function validateSpec(spec: UISpec): boolean {
  const schema = componentSchemas[spec.component];
  if (!schema) return false;
  
  const result = schema.safeParse(spec.props);
  return result.success;
}

// Catalog metadata for AI prompts
export const catalogMeta = {
  ToolStatus: { description: 'Display tool execution status with timing' },
  ProgressBar: { description: 'Show progress of long-running operations' },
  Spinner: { description: 'Loading indicator' },
  StepList: { description: 'Multi-step workflow progress' },
  CodeBlock: { description: 'Display code with syntax highlighting' },
  FileDiff: { description: 'Show before/after file changes' },
  FileTree: { description: 'Display file system structure' },
  Terminal: { description: 'Terminal output display' },
  DataTable: { description: 'Tabular data display' },
  MetricCard: { description: 'Single metric with trend' },
  ErrorCard: { description: 'Error message display' },
  SuccessCard: { description: 'Success message display' },
  ChoiceList: { description: 'Selection from options' },
  InputPrompt: { description: 'Request user text input' },
  ConfirmDialog: { description: 'Confirmation prompt' },
  Stack: { description: 'Vertical or horizontal stack layout' },
  Grid: { description: 'Grid layout' },
  Card: { description: 'Content card container' },
  Collapsible: { description: 'Expandable section' },
} as const;
