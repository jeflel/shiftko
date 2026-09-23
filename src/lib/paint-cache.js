// A paint cache for the tab screens.
//
// The tab pages are remounted on every return: App.jsx renders each behind
// `activeTab === '<tab>'`, so leaving a tab unmounts it and coming back mounts
// it again and replays every request. Before this, a returning screen drew its
// header only and held the rest until the slowest query landed. Each screen
// keeps its last payload here and seeds its state from it, so a return paints in
// the same frame while the refetch that always follows confirms it.
//
// A PAINT cache, never a source of truth. Nothing decides anything from it
// except which values the first render starts with; no request is ever skipped
// because of it; a cached value can only be one round trip stale. Module scope
// on purpose, the same shape as tab-scroll.js: it lives for the tab session and
// dies on a page load. Signing out clears it.
//
// Keys are the caller's business, with one convention: `<screen>:<userId>` plus
// any dimension that changes what the screen fetches. Home adds the role
// (coordinator and nurse fetch different shift windows and different sections),
// Schedule adds the tab (My Shifts and Team Schedule are separate components
// with their own queries). Getting a key wrong paints one user's rows into
// another's screen for one round trip, so the dimension is not optional.
//
// History: this was `home-cache.js` from 2026-09-22 until Schedule and Pool were
// given the same treatment the same day. Home's call sites are the reference
// implementation: read once with a lazy useState initialiser, `loading` starts
// false when the read returned something, the fetch effect only raises the
// loading state when it did not, and only a SUCCESSFUL read writes.

const paintCache = {}

export function readPaintCache(key) {
  if (!key) return null
  return paintCache[key] ?? null
}

// Merges rather than replaces, so two effects fetching different halves of one
// screen (Home's payload and its activation checklist, for example) can each
// write without discarding the other's values.
export function writePaintCache(key, patch) {
  if (!key) return
  paintCache[key] = { ...(paintCache[key] ?? {}), ...patch, cachedAt: Date.now() }
}

// Called on sign out. The keys already separate users, so this is hygiene
// rather than correctness: a signed-out session should not leave one nurse's
// name, unit and shifts in memory for whatever loads next.
export function clearPaintCache() {
  for (const key of Object.keys(paintCache)) delete paintCache[key]
}

// The one convention worth enforcing in code: a screen's key.
export function paintCacheKey(screen, userId, scope = '') {
  if (!userId) return null
  return scope ? `${screen}:${userId}:${scope}` : `${screen}:${userId}`
}
