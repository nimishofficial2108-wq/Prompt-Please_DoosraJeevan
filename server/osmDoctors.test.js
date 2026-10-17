import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOverpassQuery, createOsmSearch, selectNearbyCare, validateCoordinates } from './osmDoctors.js';

const origin = { latitude: 28.6139, longitude: 77.2090 };
const elements = [
  { type: 'node', id: 1, lat: 28.625, lon: 77.22, tags: { name: 'Mapped Heart Practice', amenity: 'doctors', 'healthcare:speciality': 'cardiology', 'addr:city': 'New Delhi', phone: '+911100000000' } },
  { type: 'way', id: 2, center: { lat: 28.627, lon: 77.225 }, tags: { name: 'Heart Clinic', healthcare: 'clinic', 'healthcare:speciality': 'cardiology;internal', 'contact:website': 'https://example.org', 'addr:street': 'Sample Road' } },
  { type: 'node', id: 3, lat: 28.612, lon: 77.208, tags: { name: 'General Family Clinic', amenity: 'clinic' } },
  { type: 'node', id: 4, lat: 28.610, lon: 77.208, tags: { name: 'Skin Only Clinic', amenity: 'clinic', 'healthcare:speciality': 'dermatology' } },
  { type: 'node', id: 5, lat: 28.614, lon: 77.219, tags: { name: 'Community Hospital', amenity: 'hospital', 'healthcare:speciality': 'general' } },
  { type: 'way', id: 6, center: { lat: 28.62501, lon: 77.22001 }, tags: { name: 'Mapped Heart Practice', amenity: 'doctors', 'healthcare:speciality': 'cardiology' } },
  { type: 'node', id: 7, lat: 28.900, lon: 77.209, tags: { name: 'Far Away Hospital', amenity: 'hospital', 'healthcare:speciality': 'cardiology' } },
  { type: 'node', id: 8, lat: 28.612, lon: 77.209, tags: { amenity: 'doctors', 'contact:website': 'javascript:alert(1)' } },
  { type: 'node', id: 9, lat: 28.615, lon: 77.21, tags: { name: 'Unnamed specialty', amenity: 'pharmacy', 'healthcare:speciality': 'cardiology' } },
];

test('coordinate validation rejects absent or bogus values', () => {
  assert.deepEqual(validateCoordinates('28.61', 77.20), { lat: 28.61, lon: 77.2 });
  for (const lat of [null, undefined, '', 'NaN', false, 91]) assert.equal(validateCoordinates(lat, 77.2), null);
  assert.equal(validateCoordinates(28.6, -181), null);
});

test('Overpass query searches OSM healthcare tags including ways and relations', () => {
  const query = buildOverpassQuery(28.61, 77.2);
  assert.match(query, /nwr\(around:16000,28\.61,77\.2\)/);
  assert.match(query, /\["amenity"~"\^\(doctors\|clinic\|hospital\)\$"\]/);
  assert.match(query, /out center tags;/);
  assert.throws(() => buildOverpassQuery('oops', 3));
});

test('matches recorded speciality first, filters irrelevant specialities, and labels fallbacks honestly', () => {
  const results = selectNearbyCare(elements, { ...origin, specialty: 'Cardiologist' });
  assert.equal(results[0].name, 'Mapped Heart Practice');
  assert.equal(results[0].specialtyStatus, 'listed');
  assert.equal(results[1].name, 'Heart Clinic');
  assert.ok(results.every(r => r.name !== 'Skin Only Clinic' && r.name !== 'Far Away Hospital'));
  assert.equal(results.filter(r => r.name === 'Mapped Heart Practice').length, 1, 'deduped node and polygon');
  assert.ok(results.some(r => r.specialtyStatus === 'unconfirmed'));
  assert.ok(results.every(r => r.mapsUrl.includes('openstreetmap.org') && !('rating' in r)));
  assert.equal(results.length, 5);
  assert.ok(results.find(r => r.name.endsWith('(name not listed)')).website === null, 'unsafe URL removed');
  assert.equal(results.find(r => r.name === 'Heart Clinic').website, 'https://example.org/');
});

test('one public Overpass query is cached across specialties for the same area', async () => {
  let calls = 0;
  let body = '';
  let now = 10000;
  const mockFetch = async (url, init) => {
    calls += 1;
    assert.equal(url, 'https://overpass.example/api/interpreter');
    assert.equal(init.method, 'POST');
    body = String(init.body);
    return { ok: true, json: async () => ({ elements }) };
  };
  const search = createOsmSearch({ fetchFn: mockFetch, endpoint: 'https://overpass.example/api/interpreter', now: () => now });
  const cardio = await search({ ...origin, specialty: 'Cardiologist' });
  const gp = await search({ ...origin, specialty: 'General Physician' });
  assert.equal(calls, 1);
  assert.equal(cardio[0].name, 'Mapped Heart Practice');
  assert.ok(gp.some(p => p.name === 'Community Hospital'));
  assert.match(decodeURIComponent(body), /nwr\(around:16000/);
  assert.doesNotMatch(body, /Cardiologist|report|PDF/i, 'specialty and report data do not reach OSM query');
  now = 1_000_000;
  await search({ ...origin, specialty: 'Cardiologist' });
  assert.equal(calls, 2, 'expired cache should refresh');
});

test('busy Overpass service produces a safe retry message', async () => {
  const search = createOsmSearch({ fetchFn: async () => ({ ok: false, status: 429 }), minQueryGapMs: 0 });
  await assert.rejects(search({ ...origin, specialty: 'Nephrologist' }), e => e.statusCode === 503 && e.message.includes('busy'));
});
