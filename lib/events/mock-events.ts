// Mock event generator for demo/testing
// Simulates tool calls from a coding agent

import { type AgentEvent, type UISpec, formatSSEEvent } from './event-types';

const MOCK_TOOL_CALLS = [
  {
    toolName: 'Read',
    input: { file_path: '/app/page.tsx' },
    output: { content: 'export default function Page() { return <div>Hello</div> }', lines: 1 },
    duration: 150,
  },
  {
    toolName: 'Grep',
    input: { pattern: 'useState', path: '/app' },
    output: { files: ['page.tsx', 'components/form.tsx'], matches: 5 },
    duration: 300,
  },
  {
    toolName: 'Edit',
    input: { file_path: '/app/page.tsx', old_string: 'Hello', new_string: 'Hello World' },
    output: { success: true, changes: 1 },
    duration: 200,
  },
  {
    toolName: 'Bash',
    input: { command: 'pnpm test' },
    output: { exitCode: 0, stdout: 'All tests passed', stderr: '' },
    duration: 2000,
  },
  {
    toolName: 'Write',
    input: { file_path: '/app/new-component.tsx', content: '...' },
    output: { success: true, bytesWritten: 1024 },
    duration: 100,
  },
];

// Generate a sequence of mock events
export async function* generateMockEvents(): AsyncGenerator<AgentEvent> {
  let eventId = 0;

  // Initial text response
  const responseText = "I'll help you with that. Let me analyze the codebase and make the necessary changes.";
  
  for (const char of responseText) {
    yield { type: 'text_delta', delta: char };
    await delay(20);
  }
  yield { type: 'text_done', text: responseText };

  // Simulate tool calls
  for (const toolCall of MOCK_TOOL_CALLS.slice(0, 3)) {
    const id = `tool_${++eventId}`;

    // Tool call start
    yield {
      type: 'tool_call_start',
      id,
      toolName: toolCall.toolName,
      timestamp: Date.now(),
    };
    await delay(100);

    // Tool call input
    yield {
      type: 'tool_call_input',
      id,
      input: toolCall.input,
    };
    await delay(toolCall.duration);

    // Tool call output
    yield {
      type: 'tool_call_output',
      id,
      output: toolCall.output,
      duration: toolCall.duration,
    };
    await delay(200);

    // UI render for tool result
    yield {
      type: 'ui_render',
      spec: toolCallToUISpec(toolCall.toolName, toolCall.input, toolCall.output),
    };
    await delay(100);
  }

  // Final response
  const finalText = "Done! I've made the changes. The component has been updated.";
  for (const char of finalText) {
    yield { type: 'text_delta', delta: char };
    await delay(15);
  }
  yield { type: 'text_done', text: finalText };
}

// Convert tool call to UI specification for json-render
function toolCallToUISpec(
  toolName: string, 
  input: unknown, 
  output: unknown
): UISpec {
  switch (toolName) {
    case 'Read':
      return {
        type: 'CodeBlock',
        props: {
          code: (output as { content: string }).content,
          language: 'tsx',
          filename: (input as { file_path: string }).file_path,
        },
      };
    
    case 'Grep':
      return {
        type: 'DataTable',
        props: {
          columns: [
            { key: 'file', label: 'File' },
            { key: 'matches', label: 'Matches' },
          ],
          rows: (output as { files: string[] }).files.map(f => ({
            file: f,
            matches: Math.floor(Math.random() * 5) + 1,
          })),
        },
      };

    case 'Edit':
      return {
        type: 'FileDiff',
        props: {
          filename: (input as { file_path: string }).file_path,
          before: (input as { old_string: string }).old_string,
          after: (input as { new_string: string }).new_string,
        },
      };

    case 'Bash':
      return {
        type: 'Terminal',
        props: {
          lines: [
            { type: 'input', text: `$ ${(input as { command: string }).command}` },
            { type: 'output', text: (output as { stdout: string }).stdout },
          ],
        },
      };

    case 'Write':
      return {
        type: 'SuccessCard',
        props: {
          title: 'File Created',
          message: `Created ${(input as { file_path: string }).file_path}`,
        },
      };

    default:
      return {
        type: 'Card',
        props: {
          title: toolName,
          description: JSON.stringify(output),
        },
      };
  }
}

// Create SSE stream from mock events
export async function createMockEventStream(): Promise<ReadableStream> {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generateMockEvents()) {
          const sseData = formatSSEEvent(event);
          controller.enqueue(encoder.encode(sseData));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
