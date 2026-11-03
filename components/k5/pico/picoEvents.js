// Lets any K–5 page ask the buddy (PicoGuide, mounted by K5Shell) to walk to an element
// (`pin` = its data-pin) and say something. Call it from a tap, so the buddy may talk.
export const PICO_SAY_EVENT = "k5-pico-say";

export function picoSay(text, pin = null) {
  window.dispatchEvent(new CustomEvent(PICO_SAY_EVENT, { detail: { text, pin } }));
}
