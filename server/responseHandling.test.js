import test from 'node:test';
import assert from 'node:assert/strict';
import { readApiJson } from '../src/lib/apiResponse.js';
import { readProviderResponse } from './providerResponse.js';

test('frontend: valid JSON success', async () => {
  assert.deepEqual(await readApiJson(new Response('{"withinRange":[]}', {status: 200})), {withinRange: []});
});
test('frontend: empty 502 gets clear backend hint', async () => {
  await assert.rejects(readApiJson(new Response('', {status: 502}), 'Report analysis'), /empty server response \(HTTP 502\).*Express backend/);
});
test('frontend: HTML proxy error is identified', async () => {
  await assert.rejects(readApiJson(new Response('<html>Bad Gateway</html>', {status: 502})), /HTML page instead of JSON/);
});
test('frontend: JSON API error is shown', async () => {
  await assert.rejects(readApiJson(new Response('{"error":"Grok API key missing"}', {status: 503})), /Grok API key missing/);
});
test('frontend: unexpected JSON shape is rejected', async () => {
  await assert.rejects(readApiJson(new Response('[]', {status: 200})), /unexpected response format/);
});
test('provider: valid JSON success', async () => {
  assert.deepEqual(await readProviderResponse(new Response('{"id":"file_1"}', {status: 200}), 'xAI file upload'), {id: 'file_1'});
});
test('provider: empty successful response is identified', async () => {
  await assert.rejects(readProviderResponse(new Response('', {status: 200}), 'xAI file upload'), /empty response/);
});
test('provider: invalid JSON is identified', async () => {
  await assert.rejects(readProviderResponse(new Response('not json', {status: 200}), 'Grok analysis'), /invalid JSON/);
});
test('provider: authentication error does not expose response body', async () => {
  await assert.rejects(readProviderResponse(new Response('PRIVATE PATIENT INFO', {status: 401}), 'Grok analysis'), (err) => err.message.includes('HTTP 401') && !err.message.includes('PRIVATE PATIENT INFO'));
});
