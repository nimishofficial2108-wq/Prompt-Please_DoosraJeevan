/** Parse third-party responses without leaking response bodies or uploaded content. */
export async function readProviderResponse(response, provider) {
  let raw;
  try {
    raw = await response.text();
  } catch {
    throw new Error(`${provider}: could not read the response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    let hint = 'Check your API configuration and account access.';
    if (response.status === 401 || response.status === 403) hint = 'Check XAI_API_KEY and model permissions.';
    if (response.status === 402) hint = 'Check xAI billing or available credits.';
    if (response.status === 404) hint = 'Check the model name and API endpoint.';
    if (response.status === 429) hint = 'You may have reached your API rate limit; retry later.';
    if (response.status >= 500) hint = 'The xAI service may be temporarily unavailable; retry later.';
    // Never forward upstream text; errors could contain report details.
    throw new Error(`${provider} returned HTTP ${response.status}. ${hint}`);
  }

  if (!raw.trim()) {
    throw new Error(`${provider}: received an empty response (HTTP ${response.status}). Retry and check server connectivity.`);
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Non-object response');
    return parsed;
  } catch {
    throw new Error(`${provider}: received invalid JSON (HTTP ${response.status}). Try again later.`);
  }
}
