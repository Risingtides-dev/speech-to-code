const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { after, beforeEach, afterEach, test } = require('node:test');

const compiled = mkdtempSync(path.join(tmpdir(), 'speech-voice-client-'));
after(() => rmSync(compiled, { recursive: true, force: true }));
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--module', 'CommonJS',
  '--target', 'ES2022', '--skipLibCheck', '--noEmitOnError', '--outDir', compiled,
  'lib/voice/xai-client.ts', 'lib/voice/audio-player.ts', 'lib/voice/audio-processor.ts', 'lib/voice/timing.ts',
], { cwd: path.resolve(__dirname, '..'), stdio: 'pipe' });
const { XAIVoiceClient } = require(path.join(compiled, 'xai-client.js'));
const saved = Object.fromEntries(['fetch', 'WebSocket', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']
  .map(key => [key, global[key]]));
const navigatorDescriptor = Object.getOwnPropertyDescriptor(global, 'navigator');
let timers, clients, nextTimer;

class Socket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances = [];
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; this.closes = []; Socket.instances.push(this); }
  send(text) { this.sent.push(JSON.parse(text)); }
  close(code, reason) { this.readyState = 3; this.closes.push({ code, reason }); }
  open() { this.readyState = 1; this.onopen?.({}); }
  closed(code) { this.readyState = 3; this.onclose?.({ code, reason: 'fixture' }); }
}

beforeEach(() => {
  timers = new Map(); clients = []; nextTimer = 0; Socket.instances = [];
  global.WebSocket = Socket;
  Object.defineProperty(global, 'navigator', { configurable: true, value: { userAgent: 'voice fixture' } });
  global.setTimeout = (fn, delay) => { const timer = { id: ++nextTimer, fn, delay, kind: 'timeout' }; timers.set(timer.id, timer); return timer; };
  global.setInterval = (fn, delay) => { const timer = { id: ++nextTimer, fn, delay, kind: 'interval' }; timers.set(timer.id, timer); return timer; };
  global.clearTimeout = global.clearInterval = timer => timers.delete(timer?.id);
});

afterEach(async () => {
  try { for (const client of clients) await client.dispose(); }
  finally {
    for (const [key, value] of Object.entries(saved)) global[key] = value;
    if (navigatorDescriptor) Object.defineProperty(global, 'navigator', navigatorDescriptor);
    else delete global.navigator;
  }
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function response(token = 'fixture-token') {
  return { ok: true, json: async () => ({ token, expires_at: new Date(Date.now() + 60_000).toISOString() }) };
}
function client(options = {}) { const value = new XAIVoiceClient(options); clients.push(value); return value; }
async function tick() { await new Promise(setImmediate); }
function refreshTimer() { return [...timers.values()].find(timer => timer.kind === 'timeout' && timer.delay > 10_000); }
function retryTimer() { return [...timers.values()].find(timer => timer.kind === 'timeout' && timer.delay === 1_000); }
async function run(timer) { timers.delete(timer.id); await timer.fn(); await tick(); }
async function connected(options = {}) {
  const value = client(options);
  assert.equal(await value.connect(), true);
  const socket = Socket.instances.at(-1); socket.open();
  assert.equal(value.getConnectionState(), 'connected');
  return { value, socket };
}

test('disconnect fences a late token response before any socket can open', async () => {
  const pending = deferred(); let signal;
  global.fetch = (_url, options) => { signal = options.signal; return pending.promise; };
  const value = client();
  const connecting = value.connect();
  value.disconnect();
  pending.resolve(response());
  await connecting;
  assert.equal(Socket.instances.length, 0);
  assert.equal(value.getConnectionState(), 'disconnected');
  assert.equal(signal?.aborted, true);
  assert.equal(timers.size, 0);
});

test('a stale token-fetch failure cannot error a replacement session', async () => {
  const pending = deferred(); let requests = 0;
  global.fetch = () => ++requests === 1 ? pending.promise : Promise.resolve(response());
  const errors = []; const value = client({ onError: error => errors.push(error) });
  const first = value.connect(); value.disconnect();
  await value.connect(); Socket.instances.at(-1).open();
  pending.reject(new Error('old fixture failure')); await first;
  assert.equal(value.getConnectionState(), 'connected');
  assert.deepEqual(errors, []);
});

test('queued old socket callbacks cannot retire or emit into a replacement', async () => {
  global.fetch = async () => response();
  const text = [];
  const { value, socket } = await connected({ onAgentText: value => text.push(value) });
  const stale = { close: socket.onclose, message: socket.onmessage, error: socket.onerror };
  value.disconnect(); await value.connect(); const current = Socket.instances.at(-1); current.open();
  stale.close({ code: 1000, reason: 'old close' });
  stale.message({ data: JSON.stringify({ type: 'response.audio_transcript.delta', delta: 'old text' }) });
  stale.error({});
  assert.equal(value.getConnectionState(), 'connected');
  assert.deepEqual(text, []);
  current.onmessage({ data: JSON.stringify({ type: 'response.audio_transcript.delta', delta: 'current text' }) });
  assert.deepEqual(text, ['current text']);
});

test('disconnect retires queued reconnect work even after the socket has closed', async () => {
  let requests = 0; global.fetch = async () => { requests += 1; return response(); };
  const { value, socket } = await connected(); socket.closed(1006);
  const queued = retryTimer(); assert.ok(queued);
  value.disconnect();
  const remainingTimers = timers.size;
  await queued.fn(); await tick();
  assert.equal(remainingTimers, 0);
  assert.equal(requests, 1);
  assert.equal(value.getConnectionState(), 'disconnected');
});

test('disconnect clears token-refresh and heartbeat timers', async () => {
  global.fetch = async () => response();
  const { value } = await connected(); assert.ok(refreshTimer());
  value.disconnect();
  assert.equal(timers.size, 0);
});

test('a late token refresh cannot update or schedule work for a replacement socket', async () => {
  const pending = deferred(); let requests = 0;
  global.fetch = () => ++requests === 2 ? pending.promise : Promise.resolve(response(`fixture-${requests}`));
  const { value } = await connected();
  const timer = refreshTimer(); timers.delete(timer.id); const refreshing = timer.fn();
  value.disconnect(); await value.connect(); const current = Socket.instances.at(-1); current.open();
  pending.resolve(response('stale-refresh')); await refreshing; await tick();
  assert.ok(!current.sent.some(message => message.session?.token === 'stale-refresh'));
  assert.equal([...timers.values()].filter(timer => timer.kind === 'timeout').length, 1);
  assert.equal(value.getConnectionState(), 'connected');
});

test('active token refresh still updates its own socket and arms one next refresh', async () => {
  let requests = 0; global.fetch = async () => response(`fixture-${++requests}`);
  const { value, socket } = await connected(); await run(refreshTimer());
  assert.ok(socket.sent.some(message => message.session?.token === 'fixture-2'));
  assert.equal([...timers.values()].filter(timer => timer.kind === 'timeout').length, 1);
  assert.equal(value.getConnectionState(), 'connected');
});

test('an abnormal close still reconnects once with one fresh timer set', async () => {
  let requests = 0; global.fetch = async () => { requests += 1; return response(); };
  const { value, socket } = await connected(); socket.closed(1006); await run(retryTimer());
  const current = Socket.instances.at(-1); assert.notEqual(current, socket); current.open();
  assert.equal(requests, 2);
  assert.equal(value.getConnectionState(), 'connected');
  assert.equal([...timers.values()].filter(timer => timer.kind === 'timeout').length, 1);
  assert.equal([...timers.values()].filter(timer => timer.kind === 'interval').length, 1);
});

test('an active token endpoint failure still reports an error without opening a socket', async () => {
  global.fetch = async () => ({ ok: false, status: 503 });
  const errors = []; const value = client({ onError: error => errors.push(error) });
  assert.equal(await value.connect(), false);
  assert.equal(value.getConnectionState(), 'error');
  assert.equal(errors.length, 1);
  assert.equal(Socket.instances.length, 0);
});

for (const kind of ['refresh', 'reconnect']) {
  test(`a queued old ${kind} callback cannot discard the replacement timer handle`, async () => {
    global.fetch = async () => response();
    const { value, socket } = await connected();
    if (kind === 'reconnect') socket.closed(1006);
    const stale = kind === 'refresh' ? refreshTimer() : retryTimer();
    value.disconnect();
    await value.connect(); const current = Socket.instances.at(-1); current.open();
    if (kind === 'reconnect') current.closed(1006);
    await stale.fn(); await tick();
    value.disconnect();
    assert.equal(timers.size, 0, 'the replacement timer must remain owned and cancellable');
  });
}
