// SSE client for consuming agent events

import { type AgentEvent, parseSSEData } from './event-types';

export type EventSourceState = 'connecting' | 'open' | 'closed' | 'error';

interface EventSourceOptions {
  onEvent: (event: AgentEvent) => void;
  onStateChange?: (state: EventSourceState) => void;
  onError?: (error: Error) => void;
}

export class AgentEventSource {
  private abortController: AbortController | null = null;
  private state: EventSourceState = 'closed';
  private options: EventSourceOptions;

  constructor(options: EventSourceOptions) {
    this.options = options;
  }

  async connect(url: string = '/api/events/stream'): Promise<void> {
    if (this.state === 'open' || this.state === 'connecting') {
      return;
    }

    this.abortController = new AbortController();
    this.setState('connecting');

    try {
      const response = await fetch(url, {
        signal: this.abortController.signal,
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      this.setState('open');

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          this.setState('closed');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            this.setState('closed');
            return;
          }

          const event = parseSSEData(trimmed);
          if (event) {
            this.options.onEvent(event);
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.setState('closed');
        return;
      }

      this.setState('error');
      this.options.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  disconnect(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.setState('closed');
  }

  private setState(state: EventSourceState): void {
    if (this.state !== state) {
      this.state = state;
      this.options.onStateChange?.(state);
    }
  }

  getState(): EventSourceState {
    return this.state;
  }
}

// Hook-friendly event source
export function createEventSource(options: EventSourceOptions): AgentEventSource {
  return new AgentEventSource(options);
}
