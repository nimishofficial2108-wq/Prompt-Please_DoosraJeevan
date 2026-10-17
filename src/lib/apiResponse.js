/**
 * Safely read the JSON returned by our own Express API.
 * Empty HTML/error pages (commonly a failed Vite proxy request) are not JSON.
 * Never include raw server response bodies in UI errors: they could contain PHI.
 */
export async function readApiJson(response, label = 'API') {
  let raw;
  try {
    raw = await response.text();
  } catch {
    throw new Error(`${label}: unable to read the server response (HTTP ${response.status}).`);
  }

  if (!raw.trim()) {
    throw new Error(
      `${label}: empty server response (HTTP ${response.status}). Check that the Express backend is running on port 3001 (npm run dev:all) and inspect its terminal logs.`
    );
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    const html = /^\s*(?:<!doctype html|<html)/i.test(raw);
    throw new Error(
      html
        ? `${label}: received an HTML page instead of JSON (HTTP ${response.status}). Check the /api Vite proxy and Express backend.`
        : `${label}: invalid JSON from server (HTTP ${response.status}). Check the backend terminal for the underlying error.`
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error(`${label}: server returned an unexpected response format (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(typeof body.error === 'string' && body.error
      ? body.error
      : `${label}: request failed with HTTP ${response.status}.`);
  }

  return body;
}
