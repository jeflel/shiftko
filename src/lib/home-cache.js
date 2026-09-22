// Home's last payload, so returning to the tab paints instead of waiting.
//
// Home is remounted on every return (App.jsx renders it behind
// `activeTab === 'home'`, so leaving the tab unmounts it), and a mount fires
// eight requests. With nothing cached the screen drew its greeting row only,
// because both content branches are gated on `!loading`: the header stayed and
// the rest of the page was blank until the slowest request landed. That is the
// pause Jefle described on 2026-09-22 ("it takes a lil bit to load, i remember
// back then it would be instant").
//
// This holds the last payload per user, so a remount paints from it in the same
// frame and the fetch that follows only confirms it.
//
// Module scope on purpose, the same shape as tab-scroll.js: it lives for the
// tab session and dies on a page load. A cached value can only ever be one
// network round trip stale, because the mount fetch ALWAYS runs and this cache
// never prevents a request or short-circuits one. It is a paint cache, never a
// source of truth: nothing outside Home reads it, and nothing decides anything
// from it except which values the first render starts with.
//
// Keyed by user AND role: the coordinator branch of Home fetches a different
// shifts window and no notifications or personal events at all, so one key for
// both would paint a coordinator's coverage picture into a nurse's screen for
// one round trip if the same browser ever switched accounts.

const homeCache = {}

function cacheKey(userId, isCoordinator) {
  return `${userId}:${isCoordinator ? 'coordinator' : 'nurse'}`
}

export function readHomeCache(userId, isCoordinator) {
  if (!userId) return null
  return homeCache[cacheKey(userId, isCoordinator)] ?? null
}

// Merges rather than replaces, so the profile payload and the activation
// checklist can be written from the two different effects that fetch them
// without either one throwing the other's values away.
export function writeHomeCache(userId, isCoordinator, patch) {
  if (!userId) return
  const key = cacheKey(userId, isCoordinator)
  homeCache[key] = { ...(homeCache[key] ?? {}), ...patch, cachedAt: Date.now() }
}

// Called on sign out. The key already separates users, so this is hygiene
// rather than correctness: a signed-out session should not leave a nurse's
// name, unit and shifts sitting in memory for whatever loads next.
export function clearHomeCache() {
  for (const key of Object.keys(homeCache)) delete homeCache[key]
}
