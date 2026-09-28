import { test, expect } from '@playwright/test';

test('page renders the real application and protects its configuration', async ({ request }) => {
  const response = await request.get('/');
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain('말 사이의 마음을 읽다');
  expect(html).toContain('대화 시작하기');
  expect(html).not.toContain('Bearer ');
});

test('missing key is explicit, never a fabricated analysis', async ({ request }) => {
  const response = await request.post('/api/analyze', { data: { transcript: ['방향은 좋은데 일정이 걱정돼요.'] }, headers: { Origin: 'http://localhost:3107' } });
  expect(response.status()).toBe(503);
  expect(await response.json()).toMatchObject({ code: 'NOT_CONFIGURED' });
  expect(response.headers()['cache-control']).toBe('no-store');
});

test('rejects unsupported, oversized, malformed and cross-origin requests', async ({ request }) => {
  for (const data of [null, {}, { transcript: [] }, { transcript: [4] }, { transcript: [' '] }, { transcript: ['x'.repeat(1201)] }, { transcript: Array(13).fill('발언') }]) {
    const response = await request.post('/api/analyze', { data: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
    expect(response.status()).toBe(400);
  }
  const oversized = await request.post('/api/analyze', { data: { transcript: ['x'.repeat(25_000)] } });
  expect(oversized.status()).toBe(413);
  const foreign = await request.post('/api/analyze', { data: { transcript: ['hello'] }, headers: { Origin: 'https://untrusted.example' } });
  expect(foreign.status()).toBe(403);
  const wrongType = await request.post('/api/analyze', { data: 'hello', headers: { 'Content-Type': 'text/plain' } });
  expect(wrongType.status()).toBe(415);
  const malformed = await request.post('/api/analyze', { data: '{invalid', headers: { 'Content-Type': 'application/json' } });
  expect(malformed.status()).toBe(400);
});
