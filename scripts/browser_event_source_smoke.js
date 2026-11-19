async (page) => {
  const root = 'http://127.0.0.1:18765';
  const unexpectedApiRequests = [];
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== root) return route.abort();
    if (url.pathname.startsWith('/api/')) {
      unexpectedApiRequests.push(url.pathname);
      return route.fulfill({ status: 503, json: { error: 'fixture blocks backend calls' } });
    }
    return route.continue();
  });
  await page.addInitScript(() => {
    // Report permission without opening a microphone or requesting media.
    navigator.permissions.query = async () => Object.assign(new EventTarget(), { state: 'granted' });
    window.__streamFixtures = [];
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input.url, location.href);
      if (url.pathname !== '/api/events/stream') return nativeFetch(input, init);
      let controller;
      const fixture = { aborted: false, cancelled: 0 };
      const stream = new ReadableStream({
        start(value) { controller = value; },
        cancel() { fixture.cancelled += 1; },
      });
      fixture.stream = stream;
      fixture.send = text => controller.enqueue(new TextEncoder().encode(text));
      init.signal.addEventListener('abort', () => { fixture.aborted = true; });
      window.__streamFixtures.push(fixture);
      return new Response(stream, { headers: { 'content-type': 'text/event-stream' } });
    };
  });
  await page.goto(root);
  await page.getByRole('button', { name: 'Run Demo', exact: true }).click();
  await page.waitForFunction(() => window.__streamFixtures.length === 1);
  await page.evaluate(() => window.__streamFixtures[0].send('data: {"type":"text_delta","delta":"first fixture text"}\n\n'));
  await page.getByText('first fixture text', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Try demo mode', exact: true }).click();
  await page.waitForFunction(() => window.__streamFixtures.length === 2 && !window.__streamFixtures[0].stream.locked);
  await page.evaluate(() => window.__streamFixtures[1].send('data: {"type":"text_delta","delta":"replacement fixture text"}\n\n'));
  await page.getByText('replacement fixture text', { exact: true }).waitFor();
  const firstTextGone = await page.getByText('first fixture text', { exact: true }).count() === 0;
  await page.evaluate(() => window.__streamFixtures[1].send('data: [DONE]\n\n'));
  await page.waitForFunction(() => !window.__streamFixtures[1].stream.locked);
  const proof = await page.evaluate(() => ({
    firstAborted: window.__streamFixtures[0].aborted,
    firstCancelledOnce: window.__streamFixtures[0].cancelled === 1,
    firstReaderReleased: !window.__streamFixtures[0].stream.locked,
    doneCancelledOnce: window.__streamFixtures[1].cancelled === 1,
    doneReaderReleased: !window.__streamFixtures[1].stream.locked,
  }));
  Object.assign(proof, { replacementOnlyDisplayed: firstTextGone, unexpectedApiRequests,
    transport: 'mocked in browser', microphoneOpened: false, productionActions: false });
  if (!Object.entries(proof).filter(([key]) => !['transport', 'unexpectedApiRequests', 'microphoneOpened', 'productionActions'].includes(key)).every(([, value]) => value) || unexpectedApiRequests.length) {
    throw new Error(JSON.stringify(proof));
  }
  await page.evaluate(proof => { window.__eventSourceProof = proof; }, proof);
  console.log(JSON.stringify(proof));
}
