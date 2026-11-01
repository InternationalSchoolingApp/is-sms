<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Timezone handling rule

Applies to both `is-sms` and `is-rest-api` (see is-rest-api/CLAUDE.md for the mirrored copy).

Whenever any timezone-related implementation, debugging, refactoring, or review is performed in either project:

- Always use `Asia/Singapore` as the fallback timezone when the configured timezone is missing, null, blank, invalid, or cannot be resolved.
- Persist/save `Asia/Singapore` in the appropriate existing configuration or storage wherever required.
- Never overwrite an explicitly configured valid timezone.
- Preserve existing project architecture and avoid unrelated changes.
