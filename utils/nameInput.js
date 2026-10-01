/**
 * Name-field input rule, ported from is-rest-api rather than invented:
 * every First/Middle/Last name input on the legacy signup forms uses
 * onkeydown="return M.isChars(event);" (seriLibrary.js), which blocks any key
 * that isn't a letter, space, or an editing/navigation key — so digits
 * (top-row and numpad) and symbols can't be typed.
 *
 * `isNameKeyAllowed` is that keyCode logic, branch for branch. The legacy rule
 * is keydown-only, so pasted/autofilled text bypassed it; `sanitizeName`
 * closes that gap with the same effective rule (letters + spaces only).
 */

// seriLibrary.js M.keys: backspace, tab, enter, left arrow, delete, numpad dot.
const EDIT_KEYS = [8, 9, 13, 37, 46, 110];

export function isNameKeyAllowed(e) {
  const code = e.keyCode;
  if (code === 0 || code === 229) return true; // tablet / IME composition
  if (e.shiftKey) return code >= 65 && code <= 90; // shift+anything else (incl. shift+digit symbols) is blocked
  if (code > 96 && code <= 122) return false; // numpad 1-9, numpad operators, F1-F11
  if (code === 16 || code === 39) return true; // shift, right arrow
  if (code === 32 || code === 127) return true; // space
  if (code >= 65 && code <= 90) return true; // A-Z
  return EDIT_KEYS.includes(code);
}

// Drops everything isNameKeyAllowed wouldn't let a user type. \p{L}/\p{M} keep
// accented and non-Latin letters, which arrive via IME (keyCode 229) in legacy.
export function sanitizeName(value) {
  return (value ?? "").replace(/[^\p{L}\p{M} ]/gu, "");
}

// Spread onto a name input; `setValue` receives the sanitized string.
export function nameFieldProps(setValue) {
  return {
    onKeyDown: (e) => {
      if (!isNameKeyAllowed(e)) e.preventDefault();
    },
    onChange: (e) => setValue(sanitizeName(e.target.value)),
  };
}
