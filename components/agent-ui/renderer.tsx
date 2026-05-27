'use client';

// Custom renderer for agent UI
// Converts UISpec from events into React components

import { useMemo } from 'react';
import { componentRegistry } from './registry';
import { type AgentEvent, type UISpec as EventUISpec } from '@/lib/events/event-types';
import { cn } from '@/lib/utils';
import { ToolStatus } from './components/tool-status';

interface AgentRendererProps {
  events: AgentEvent[];
  className?: string;
}

// Render a single UI spec using the component registry
function RenderSpec({ spec }: { spec: EventUISpec }): JSX.Element | null {
  const Component = componentRegistry[spec.type];
  
  if (!Component) {
    console.warn(`[AgentRenderer] Unknown component type: ${spec.type}`);
    return null;
  }

  // Handle children
  let children: React.ReactNode = undefined;
  if (spec.children) {
    if (typeof spec.children === 'string') {
      children = spec.children;
    } else if (Array.isArray(spec.children)) {
      children = spec.children.map((child, i) => (
        <RenderSpec key={i} spec={child} />
      ));
    } else {
      children = <RenderSpec spec={spec.children} />;
    }
  }

  return <Component {...(spec.props || {})}>{children}</Component>;
}

export function AgentRenderer({ events, className }: AgentRendererProps) {
  // Extract UI specs from events
  const uiSpecs = useMemo(() => {
    return events
      .filter((e): e is { type: 'ui_render'; spec: EventUISpec } => e.type === 'ui_render')
      .map(e => e.spec);
  }, [events]);

  // Extract text deltas for streaming text display
  const streamingText = useMemo(() => {
    let text = '';
    for (const event of events) {
      if (event.type === 'text_delta') {
        text += event.delta;
      } else if (event.type === 'text_done') {
        text = event.text;
      }
    }
    return text;
  }, [events]);

  // Extract tool call statuses
  const toolCalls = useMemo(() => {
    const calls = new Map<string, {
      id: string;
      toolName: string;
      status: 'pending' | 'running' | 'success' | 'error';
      input?: unknown;
      output?: unknown;
      duration?: number;
    }>();

    for (const event of events) {
      switch (event.type) {
        case 'tool_call_start':
          calls.set(event.id, {
            id: event.id,
            toolName: event.toolName,
            status: 'running',
          });
          break;
        case 'tool_call_input':
          if (calls.has(event.id)) {
            calls.get(event.id)!.input = event.input;
          }
          break;
        case 'tool_call_output':
          if (calls.has(event.id)) {
            const call = calls.get(event.id)!;
            call.status = 'success';
            call.output = event.output;
            call.duration = event.duration;
          }
          break;
        case 'tool_call_error':
          if (calls.has(event.id)) {
            calls.get(event.id)!.status = 'error';
          }
          break;
      }
    }

    return Array.from(calls.values());
  }, [events]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Streaming text */}
      {streamingText && (
        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-foreground/90 leading-relaxed">
            {streamingText}
            <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
          </p>
        </div>
      )}

      {/* Tool call status badges */}
      {toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {toolCalls.map((call) => (
            <ToolStatus
              key={call.id}
              toolName={call.toolName}
              status={call.status}
              duration={call.duration}
            />
          ))}
        </div>
      )}

      {/* Rendered UI specs */}
      {uiSpecs.map((spec, index) => (
        <RenderSpec key={index} spec={spec} />
      ))}
    </div>
  );
}
