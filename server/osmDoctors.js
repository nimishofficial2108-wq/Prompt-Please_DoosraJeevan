/**
 * Public OpenStreetMap / Overpass lookup for DoosraJeevan's demo doctor finder.
 * No Google key, location database, or personal report data is required.
 * Data can be incomplete; never treat an OSM tag as credential verification.
 */

export const OSM_RADIUS_METERS = 15_000;
export const OSM_MAX_RESULTS = 5;

const DEFAULT_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_LIMIT = 80;

// OSM uses British spelling for some healthcare:speciality values.
const SPECIALTY_TAGS = {
  'General Physician': ['general', 'internal', 'family_medicine', 'general_practice'],
  Cardiologist: ['cardiology'],
  Endocrinologist: ['endocrinology'],
  Nephrologist: ['nephrology'],
  Hematologist: ['haematology', 'hematology'],
  Gastroenterologist: ['gastroenterology'],
  Neurologist: ['neurology'],
  Pulmonologist: ['pulmonology', 'respiratory_medicine'],
  Rheumatologist: ['rheumatology'],
  Dermatologist: ['dermatology'],
  Urologist: ['urology'],
  Gynecologist: ['gynaecology', 'gynecology', 'obstetrics'],
};

function numericCoordinate(value, lower, upper) {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= lower && n <= upper ? n : null;
}

export function validateCoordinates(latitude, longitude) {
  const lat = numericCoordinate(latitude, -90, 90);
  const lon = numericCoordinate(longitude, -180, 180);
  return lat === null || lon === null ? null : { lat, lon };
}

export function buildOverpassQuery(latitude, longitude) {
  // ~1km padding accommodates rounded, cacheable lookup centers. We still
  // filter output to 15km from the user's actual location.
  const coords = validateCoordinates(latitude, longitude);
  if (!coords) throw new Error('Invalid geographic coordinates.');
  const { lat, lon } = coords;
  return `[out:json][timeout:22];\n(\n  nwr(around:16000,${lat},${lon})["amenity"~"^(doctors|clinic|hospital)$"];\n  nwr(around:16000,${lat},${lon})["healthcare"~"^(doctor|clinic|hospital)$"];\n);\nout center tags;`;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const d2r = Math.PI / 180;
  const dLat = (lat2 - lat1) * d2r;
  const dLon = (lon2 - lon1) * d2r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dLon / 2) ** 2;
  return (6371 * 2) * Math.asin(Math.min(1, Math.sqrt(a)));
}

function stripText(v, max = 180) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function getKind(tags) {
  if (tags.amenity === 'doctors' || tags.healthcare === 'doctor') return 'Doctor’s practice';
  if (tags.amenity === 'clinic' || tags.healthcare === 'clinic') return 'Clinic';
  if (tags.amenity === 'hospital' || tags.healthcare === 'hospital') return 'Hospital';
  return null;
}

function addressFromTags(tags) {
  const full = stripText(tags['addr:full']);
  if (full) return full;
  const street = [stripText(tags['addr:housenumber'], 30), stripText(tags['addr:street'])].filter(Boolean).join(' ');
  const pieces = [street, tags['addr:suburb'], tags['addr:city'] || tags['addr:town'] || tags['addr:village'], tags['addr:postcode']]
    .map(x => stripText(x, 100)).filter(Boolean);
  return [...new Set(pieces)].join(', ') || 'Address not recorded in OpenStreetMap';
}

function safeWebUrl(raw) {
  const input = stripText(raw, 500);
  if (!input) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.')) return null;
    return url.toString();
  } catch { return null; }
}

function specialtyValues(raw) {
  return stripText(raw, 350).toLowerCase().split(/[;,|]/g).map(s => s.trim().replace(/[ -]+/g, '_')).filter(Boolean);
}

function matchesSpecialty(tags, specialty) {
  const wants = SPECIALTY_TAGS[specialty] || [];
  const listed = specialtyValues(tags['healthcare:speciality']);
  const matched = listed.some(value => wants.includes(value));
  // Explicitly different specialist categories are not relevant fallbacks.
  const general = listed.some(value => SPECIALTY_TAGS['General Physician'].includes(value));
  return { matched, fallbackAllowed: listed.length === 0 || general, listed };
}

/**
 * Convert an Overpass response to a small, safe set of geo-sorted candidates.
 * A mapped speciality has priority. A general clinic is fallback only: never
 * claim it employs a given specialist merely because it is nearby.
 */
export function selectNearbyCare(elements, { latitude, longitude, specialty, limit = OSM_MAX_RESULTS }) {
  const coords = validateCoordinates(latitude, longitude);
  if (!coords) throw new Error('Invalid geographic coordinates.');
  if (!SPECIALTY_TAGS[specialty]) throw new Error('Unsupported specialty.');
  if (!Array.isArray(elements)) throw new Error('Unexpected Overpass response.');

  const mapped = [];
  for (const item of elements) {
    if (!item || !['node', 'way', 'relation'].includes(item.type) || !Number.isSafeInteger(item.id) || item.id <= 0) continue;
    const tags = item.tags || {};
    const kind = getKind(tags);
    if (!kind) continue;
    const lat = numericCoordinate(item.lat ?? item.center?.lat, -90, 90);
    const lon = numericCoordinate(item.lon ?? item.center?.lon, -180, 180);
    if (lat === null || lon === null) continue;
    const km = distanceKm(coords.lat, coords.lon, lat, lon);
    if (km > OSM_RADIUS_METERS / 1000) continue;

    const relevance = matchesSpecialty(tags, specialty);
    if (!relevance.matched && !relevance.fallbackAllowed) continue;
    const mappedName = stripText(tags['name:en'] || tags.name || tags.operator, 120);
    const title = mappedName || `${kind} (name not listed)`;
    const urlType = item.type;
    const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
    const phone = stripText(tags['contact:phone'] || tags.phone, 75) || null;
    const result = {
      id: `osm-${urlType}-${item.id}`,
      name: title,
      type: kind,
      specialtyStatus: relevance.matched ? 'listed' : 'unconfirmed',
      specialtyDescription: relevance.matched ? `Requested specialty listed in OSM (not independently verified)` : 'Requested specialty not confirmed; call before visiting',
      address: addressFromTags(tags),
      phone,
      website: safeWebUrl(tags['contact:website'] || tags.website),
      mapsUrl: mapUrl,
      osmUrl: `https://www.openstreetmap.org/${urlType}/${item.id}`,
      distanceKm: Number(km.toFixed(1)),
      // Internal rank attributes removed before returning to browser.
      _distance: km,
      _match: relevance.matched,
      _kindOrder: kind === 'Doctor’s practice' ? 0 : kind === 'Clinic' ? 1 : 2,
      _lat: lat,
      _lon: lon,
    };
    mapped.push(result);
  }

  mapped.sort((a,b) => Number(b._match)-Number(a._match) || a._kindOrder-b._kindOrder || a._distance-b._distance);
  const out = [];
  const seenId = new Set();
  const seenNamesAndLocations = [];
  for (const place of mapped) {
    if (seenId.has(place.id)) continue;
    // Nodes + polygons often describe the same venue; remove close same-name duplicates.
    if (!place.name.endsWith('(name not listed)') && seenNamesAndLocations.some(p => p.name.toLowerCase() === place.name.toLowerCase() && distanceKm(p.lat,p.lon,place._lat,place._lon) < 0.12)) continue;
    seenId.add(place.id);
    seenNamesAndLocations.push({ name: place.name, lat: place._lat, lon: place._lon });
    const { _distance, _match, _kindOrder, _lat, _lon, ...publicFields } = place;
    out.push({ ...publicFields, distanceKm: Number(place._distance.toFixed(1)) });
    if (out.length >= limit) break;
  }
  return out;
}

/** Shared cached source lookup; specialty mapping doesn't cost another API call. */
export function createOsmSearch({
  fetchFn = globalThis.fetch,
  endpoint = DEFAULT_ENDPOINT,
  cacheTtlMs = CACHE_TTL_MS,
  minQueryGapMs = 1_500,
  now = Date.now,
} = {}) {
  const cache = new Map();
  let previousQueryAt = -Infinity;

  async function lookup(lat, lon) {
    // ~1km tile. Requesting a rounded center protects sub-street precision
    // from the public OSM service and allows nearby repeat requests to cache.
    const gridLat = Number(lat.toFixed(2));
    const gridLon = Number(lon.toFixed(2));
    const cacheKey = `${gridLat}:${gridLon}`;
    const stored = cache.get(cacheKey);
    if (stored && stored.expiresAt > now()) return stored.promise;
    if (now() - previousQueryAt < minQueryGapMs) {
      const e = new Error('Please wait a moment before searching another area.');
      e.statusCode = 429;
      throw e;
    }
    previousQueryAt = now();
    const query = buildOverpassQuery(gridLat, gridLon);
    const promise = (async () => {
      let response;
      try {
        response = await fetchFn(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'DoosraJeevan-Hackathon/1.0 (educational healthcare map search)' },
          body: new URLSearchParams({ data: query }).toString(),
          signal: AbortSignal.timeout(29_000),
        });
      } catch {
        const e = new Error('OpenStreetMap search is temporarily unavailable. Please try again.');
        e.statusCode = 503;
        throw e;
      }
      if (!response.ok) {
        const e = new Error(response.status === 429 || response.status === 504
          ? 'The free OpenStreetMap service is busy. Wait and try again.'
          : 'OpenStreetMap search is temporarily unavailable. Please retry.');
        e.statusCode = 503;
        throw e;
      }
      let parsed;
      try { parsed = await response.json(); }
      catch {
        const e = new Error('OpenStreetMap returned an unreadable response. Please retry.');
        e.statusCode = 502;
        throw e;
      }
      if (!Array.isArray(parsed.elements)) {
        const e = new Error('Unexpected OpenStreetMap response. Please retry.');
        e.statusCode = 502;
        throw e;
      }
      return parsed.elements;
    })();
    cache.set(cacheKey, { expiresAt: now() + cacheTtlMs, promise });
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
    try { return await promise; }
    catch (error) { cache.delete(cacheKey); throw error; }
  }

  return async function findNearbyCare({ specialty, latitude, longitude }) {
    if (!SPECIALTY_TAGS[specialty]) {
      const e = new Error('Select a supported specialty.'); e.statusCode = 400; throw e;
    }
    const coords = validateCoordinates(latitude, longitude);
    if (!coords) {
      const e = new Error('Allow location access to search nearby care.'); e.statusCode = 400; throw e;
    }
    const elements = await lookup(coords.lat, coords.lon);
    return selectNearbyCare(elements, { latitude: coords.lat, longitude: coords.lon, specialty });
  };
}

export const findNearbyCare = createOsmSearch({ endpoint: process.env.OVERPASS_API_URL || DEFAULT_ENDPOINT });
