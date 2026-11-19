const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { after, afterEach, test } = require('node:test');

const compiled = mkdtempSync(path.join(tmpdir(), 'speech-event-client-'));
after(() => rmSync(compiled, { recursive: true, force: true }));
execFileSync(process.execPath, [
  require.resolve('typescript/bin/tsc'), '--module', 'CommonJS', '--target', 'ES2022',
  '--skipLibCheck', '--noEmitOnError', '--outDir', compiled,
  'lib/events/event-source.ts', 'lib/events/event-types.ts',
], { cwd: path.resolve(__dirname, '..'), stdio: 'pipe' });
const { AgentEventSource } = require(path.join(compiled, 'event-source.js'));
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fixture() {
  let controller, cancelled = 0;
  const stream = new ReadableStream({
    start(value) { controller = value; },
    cancel() { cancelled += 1; },
  });
  return {
    stream,
    response: new Response(stream),
    send(text) { controller.enqueue(new TextEncoder().encode(text)); },
    close() { try { controller.close(); } catch { /* already cancelled */ } },
    cancelled: () => cancelled,
  };
}

test('a late fetch response cannot reopen a disconnected client or emit stale events', async () => {
  const pending = deferred();
  const body = fixture();
  body.send('data: {"type":"text_delta","delta":"stale"}\n\n');
  body.close();
  global.fetch = () => pending.promise;
  const events = [], states = [];
  const source = new AgentEventSource({ onEvent: event => events.push(event), onStateChange: state => states.push(state) });
  const connecting = source.connect();
  source.disconnect();
  pending.resolve(body.response);
  await connecting;
  assert.deepEqual(events, []);
  assert.deepEqual(states, ['connecting', 'closed']);
  assert.equal(body.stream.locked, false);
});

for (const error of [new DOMException('old abort', 'AbortError'), new Error('old network failure')]) {
  test(`a superseded ${error.name} cannot close or report an error on the replacement`, async () => {
    const oldFetch = deferred();
    const current = fixture();
    const opened = deferred();
    let calls = 0;
    global.fetch = () => ++calls === 1 ? oldFetch.promise : Promise.resolve(current.response);
    const errors = [];
    const source = new AgentEventSource({
      onEvent() {}, onError: error => errors.push(error),
      onStateChange: state => { if (state === 'open') opened.resolve(); },
    });
    const previous = source.connect();
    source.disconnect();
    const replacement = source.connect();
    await opened.promise;
    oldFetch.reject(error);
    await previous;
    const stateBeforeCleanup = source.getState();
    current.close();
    await replacement;
    assert.equal(stateBeforeCleanup, 'open');
    assert.deepEqual(errors, []);
  });
}

test('disconnect cancels a pending reader and releases its lock', async () => {
  const body = fixture();
  const opened = deferred();
  global.fetch = async () => body.response;
  const source = new AgentEventSource({ onEvent() {}, onStateChange: state => { if (state === 'open') opened.resolve(); } });
  const connecting = source.connect();
  await opened.promise;
  source.disconnect();
  await new Promise(setImmediate);
  const cancellationCount = body.cancelled();
  const lockedAfterDisconnect = body.stream.locked;
  body.close();
  await connecting;
  assert.equal(cancellationCount, 1);
  assert.equal(lockedAfterDisconnect, false);
  assert.equal(source.getState(), 'closed');
});

test('DONE stops later events, cancels unread data and releases the reader', async () => {
  const body = fixture();
  body.send('data: [DONE]\n\ndata: {"type":"text_delta","delta":"after done"}\n\n');
  global.fetch = async () => body.response;
  const events = [];
  const source = new AgentEventSource({ onEvent: event => events.push(event) });
  await source.connect();
  const locked = body.stream.locked;
  body.close();
  assert.deepEqual(events, []);
  assert.equal(source.getState(), 'closed');
  assert.equal(body.cancelled(), 1);
  assert.equal(locked, false);
});

test('ordinary EOF delivers valid UTF-8 events once and releases the reader', async () => {
  const body = fixture();
  body.send('data: {"type":"text_delta","delta":"café"}\n\n');
  body.close();
  let calls = 0;
  global.fetch = async () => { calls += 1; return body.response; };
  const events = [];
  const source = new AgentEventSource({ onEvent: event => events.push(event) });
  const connecting = source.connect();
  await source.connect();
  await connecting;
  assert.equal(calls, 1);
  assert.deepEqual(events, [{ type: 'text_delta', delta: 'café' }]);
  assert.equal(source.getState(), 'closed');
  assert.equal(body.stream.locked, false);
});

test('an event callback failure reports the active error and releases the reader', async () => {
  const body = fixture();
  body.send('data: {"type":"text_delta","delta":"hello"}\n\n');
  global.fetch = async () => body.response;
  const errors = [];
  const failure = new Error('consumer failed');
  const source = new AgentEventSource({ onEvent() { throw failure; }, onError: error => errors.push(error) });
  await source.connect();
  const locked = body.stream.locked;
  body.close();
  assert.deepEqual(errors, [failure]);
  assert.equal(source.getState(), 'error');
  assert.equal(body.cancelled(), 1);
  assert.equal(locked, false);
});

test('disconnect from a callback fences remaining events in the same chunk', async () => {
  const body = fixture();
  body.send('data: {"type":"text_delta","delta":"first"}\n\ndata: {"type":"text_delta","delta":"stale"}\n\n');
  global.fetch = async () => body.response;
  const events = [];
  const source = new AgentEventSource({ onEvent(event) { events.push(event); source.disconnect(); } });
  await source.connect();
  body.close();
  assert.deepEqual(events, [{ type: 'text_delta', delta: 'first' }]);
  assert.equal(body.cancelled(), 1);
  assert.equal(body.stream.locked, false);
});
