const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return body;
}

/** Stats only. */
export function getPlayer(rsn, { mode = 'main', refresh = false } = {}) {
  const query = new URLSearchParams({ mode, refresh: String(refresh) });
  return request(`/api/player/${encodeURIComponent(rsn)}?${query}`);
}

/** Stats plus the quest plan. */
export function getPlan(rsn, { mode = 'main' } = {}) {
  const query = new URLSearchParams({ mode });
  return request(`/api/plan/${encodeURIComponent(rsn)}?${query}`);
}

/** Tick a quest off (or back on) for a player. */
export function setQuestCompleted(rsn, slug, completed) {
  return request(`/api/plan/${encodeURIComponent(rsn)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ slug, completed })
  });
}
