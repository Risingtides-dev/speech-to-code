// SSE client for consuming agent events

import { type AgentEvent, parseSSEData } from './event-types';

export type EventSourceState = 'connecting' | 'open' | 'closed' | 'error';

interface EventSourceOptions {
  onEvent: (event: AgentEvent) => void;
  onStateChange?: (state: EventSourceState) => void;
  onError?: (error: Error) => void;
}

interface EventConnection {
  controller: AbortController;
  body: ReadableStream<Uint8Array> | null;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
}

export class AgentEventSource {
  private connection: EventConnection | null = null;
  private state: EventSourceState = 'closed';
  private options: EventSourceOptions;

  constructor(options: EventSourceOptions) {
    this.options = options;
  }

  async connect(url: string = '/api/events/stream'): Promise<void> {
    if (this.state === 'open' || this.state === 'connecting') {
      return;
    }

    const connection: EventConnection = {
      controller: new AbortController(), body: null, reader: null,
    };
    this.connection = connection;
    const isCurrent = () => this.connection === connection && !connection.controller.signal.aborted;
    this.setState('connecting');

    try {
      if (!isCurrent()) return;
      const response = await fetch(url, {
        signal: connection.controller.signal,
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
      connection.body = response.body;
      if (!isCurrent()) return;

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      connection.reader = reader;
      this.setState('open');
      if (!isCurrent()) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (!isCurrent()) return;
        
        if (done) {
          this.setState('closed');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!isCurrent()) return;
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
      if (!isCurrent()) return;
      if ((error as Error).name === 'AbortError') {
        this.setState('closed');
        return;
      }

      this.setState('error');
      if (isCurrent()) {
        this.options.onError?.(error instanceof Error ? error : new Error('Unknown error'));
      }
    } finally {
      if (this.connection === connection) this.connection = null;
      // DONE, EOF, failure and supersession all retire this connection's resources.
      if (connection.reader) {
        try {
          await connection.reader.cancel();
        } catch { /* cancellation is best effort after an errored stream */ }
        connection.reader.releaseLock();
      } else if (connection.body && !connection.body.locked) {
        await connection.body.cancel().catch(() => {});
      }
    }
  }

  disconnect(): void {
    const connection = this.connection;
    // Revoke ownership before aborting: an old continuation cannot close a new one.
    this.connection = null;
    if (connection) {
      connection.controller.abort();
      if (connection.reader) {
        void connection.reader.cancel().catch(() => {});
      } else if (connection.body && !connection.body.locked) {
        void connection.body.cancel().catch(() => {});
      }
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
