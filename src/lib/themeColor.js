// iOS Safari tints its toolbar with the theme-color meta tag, and that has to
// track whatever is at the top of the current screen or the bar seams against
// the page. Home's hero gradient reaches the top edge; every other screen shows
// the page ground up there.
const readToken = (name, fallback) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name)
  return value.trim() || fallback
}

export const HERO_TOP_COLOR = () => readToken('--color-hero-gradient-start', '#0aa2cf')
export const PAGE_GROUND_COLOR = () => readToken('--color-page-ground', '#f9f9fb')

export function setThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', color)
}
