// iOS Safari tints its toolbar with the theme-color meta tag, and the
// rubber-band area revealed above the page on scroll is painted by html/body.
// Both have to track whatever is at the top of the current screen or the bar
// and the scroll strip seam against the page. Home's hero gradient reaches the
// top edge; every other screen shows the page ground up there.
const readToken = (name, fallback) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name)
  return value.trim() || fallback
}

export const HERO_TOP_COLOR = () => readToken('--color-hero-gradient-start', '#0aa2cf')
export const PAGE_GROUND_COLOR = () => readToken('--color-page-ground', '#f9f9fb')

export function setThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', color)

  // Without this the chrome tints but the strip above the page stays white,
  // which is what shows every time a nurse scrolls or pulls the page down.
  document.documentElement.style.backgroundColor = color
  document.body.style.backgroundColor = color
}
