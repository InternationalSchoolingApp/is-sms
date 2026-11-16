/**
 * Applies a school's `rootcss` block (see utils/schoolColorTheme.js) the same
 * way the legacy app does — a single <style id="themeColor"> tag holding the
 * school's CSS custom properties, so any component reading those variables
 * themes itself without each one needing its own fetch. Renders nothing
 * while `rootcss` hasn't resolved yet (or a school has none configured),
 * leaving the page on its default (International Schooling) styling.
 *
 * Plain children text in a <style> element, not dangerouslySetInnerHTML —
 * the browser parses it as CSS, never as HTML/script, so this is safe even
 * though `rootcss` is server-supplied markup-shaped text.
 */
export function SchoolThemeStyle({ rootcss }) {
  if (!rootcss) return null;
  return <style id="themeColor">{rootcss}</style>;
}
