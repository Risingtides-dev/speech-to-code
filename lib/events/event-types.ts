// Agent event types for tool call streaming

export type ToolCallStatus = 
  | 'pending' 
  | 'running' 
  | 'success' 
  | 'error';

export interface ToolCallEvent {
  type: 'tool_call_start';
  id: string;
  toolName: string;
  timestamp: number;
}

export interface ToolCallInputEvent {
  type: 'tool_call_input';
  id: string;
  input: unknown;
}

export interface ToolCallOutputEvent {
  type: 'tool_call_output';
  id: string;
  output: unknown;
  duration?: number;
}

export interface ToolCallErrorEvent {
  type: 'tool_call_error';
  id: string;
  error: string;
}

export interface TextDeltaEvent {
  type: 'text_delta';
  delta: string;
}

export interface TextDoneEvent {
  type: 'text_done';
  text: string;
}

export interface UIPatchEvent {
  type: 'ui_patch';
  patch: JsonPatch;
}

export interface UIRenderEvent {
  type: 'ui_render';
  spec: UISpec;
}

// JSON Patch operations (RFC 6902)
export interface JsonPatch {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

// json-render UI specification
export interface UISpec {
  type: string;
  props?: Record<string, unknown>;
  children?: UISpec | UISpec[] | string;
}

export type AgentEvent = 
  | ToolCallEvent
  | ToolCallInputEvent
  | ToolCallOutputEvent
  | ToolCallErrorEvent
  | TextDeltaEvent
  | TextDoneEvent
  | UIPatchEvent
  | UIRenderEvent;

// Tool call state for tracking
export interface ToolCallState {
  id: string;
  toolName: string;
  status: ToolCallStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  startTime: number;
  endTime?: number;
}

// Parse SSE data line
export function parseSSEData(line: string): AgentEvent | null {
  if (!line.startsWith('data: ')) return null;
  
  const data = line.slice(6);
  if (data === '[DONE]') return null;
  
  try {
    return JSON.parse(data) as AgentEvent;
  } catch {
    return null;
  }
}

// Format event for SSE
export function formatSSEEvent(event: AgentEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
