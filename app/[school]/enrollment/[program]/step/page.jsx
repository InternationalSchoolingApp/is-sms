// Bare /{school}/enrollment/{program}/step: same session check + enrollment-stage-status redirect as
// /{school}/enrollment (login page when there's no session), instead of falling through to the backend 404.
export { default } from "../../page";
