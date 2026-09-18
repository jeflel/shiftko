// Where the user left each tab.
//
// The whole app scrolls inside one element (.app-content), shared by every tab,
// so switching tabs used to inherit whatever offset the outgoing tab left in
// that single scroller. Each tab now records its own offset on the way out and
// gets it back on the way in.
//
// Module scope on purpose: the record has to outlive a tab unmounting (tabs
// are swapped, not hidden). It deliberately does NOT outlive a page load, so a
// fresh load still opens at the top.

const tabScrollPositions = {}

export function saveTabScroll(tab, offset) {
  if (!tab || typeof offset !== 'number' || Number.isNaN(offset)) return
  tabScrollPositions[tab] = offset
}

export function getTabScroll(tab) {
  const offset = tabScrollPositions[tab]
  return typeof offset === 'number' ? offset : null
}

export function hasSavedTabScroll(tab) {
  return typeof tabScrollPositions[tab] === 'number'
}
