# Spy Chase implementation rules
Read docs/phase0/PRODUCT.md and DESIGN.md before extending this new project. Physical station games stay outside the app. Business configuration is event data. Never copy the old generic activity engine or UI into this project. Every protected page/API/action must check active individual identity, event membership and required role/assigned station on the server. Do not expose raw password hashes or session tokens. Score completion, ledger writes and progression will be one atomic, idempotent operation in Phase 5. Keep Agent Contact separate from team scores and disabled until policy is chosen. New screens use shared spy design tokens, readable actions and mobile layouts. No placeholder controls pretending to work.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
