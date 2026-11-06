# AGENTS.md — GitDesktop

GitDesktop is an AI-native, keyboard-first Git desktop client (Tauri 2 +
React 19) with an Astro marketing site in `site/`. Codex and other agents that
follow the AGENTS.md convention auto-load this file whatever their role (Claude
sessions load `CLAUDE.md` instead), so it carries repo context and hard
boundaries only.

## Binding context — read before substantive work

`CLAUDE.md` and `.claude/skills/gd-conventions/SKILL.md` are the binding agent
context: the standing brief and the repo playbook of conventions and gotchas.
`CONTRIBUTING.md` holds the human conventions, `PRODUCT.md` the product intent.

## Hard boundaries

`.claude/skills/gd-conventions/SKILL.md` is the canonical playbook, and
`.claude/rules/repo-safety.md` excerpts the first four rules below; read
either in the tree.

- **Never edit `src/components/ui/`** — vendored shadcn/Base UI primitives; fix
  at the feature or call site (that folder's `README.md` inventories the
  sanctioned local deltas).
- **Never run repo-wide `cargo fmt`** in `src-tauri`; `rustfmt --edition 2021
  <file>` on individual new files only, never on a `mod.rs` (rustfmt follows
  its `mod` declarations into every child file).
- **`gd/session/*` branches are filtered from every branch surface** and never
  deleted — the user dogfoods agent sessions on them; deleting one breaks
  Resume.
- **`pnpm lint` is a rewrite, not a check.** It is `biome check --write` over
  `src/` AND `site/`; the check form is `pnpm exec biome check ./src/`. In a
  task worktree even that tree-wide check false-fails on CRLF, so the
  trustworthy gate is the per-file LF-copy `biome ci` form (gd-conventions),
  whose `__cigate__<name>` sibling lives beside the original for the length of
  the check and is deleted after, or whatever the spec's Verification field
  names. A run that must not create files reports tree-wide formatting as
  unverified instead.
- **A skill edited in one tree is edited in both.** The skills you load from
  `.agents/skills/<name>` have a committed twin at `.claude/skills/<name>`, and
  nothing propagates an edit between them — editing only the copy you read
  leaves the other store stale. `scripts/check-skill-mirrors.mjs` is a required
  `guards` step and fails on any difference beyond line endings, the two trees'
  `.claude/`-vs-`.agents/` path references, the `/cmd`-vs-`$cmd` sigil, and
  harness-only frontmatter keys. Skills it deliberately skips are declared in
  that script with their reason, and its header states the one difference the
  path rewrite cannot see.

## Verification commands

- `pnpm build` — typecheck plus frontend bundle. Plain `tsc --noEmit` is a no-op
  in this repo; only `tsc -b` (or `pnpm build`) typechecks.
- `pnpm run checks` — the repo guard scripts CI runs.
- `pnpm test` — Vitest component tests (jsdom).
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
- `cd site && pnpm build` — the marketing site.

## When the run was given a task spec

Stay strictly inside its stated file scope: a spec that looks wrong, or a fix
that would need a file the spec did not list, is reported back rather than
improvised around. A Permission-denied on a path outside the workspace is an
environment limit — report it, don't work around it.

## Browser automation safety

- **Own apps / CI tests:** the pinned Playwright/Puppeteer browser is fine. Keep the packages and browsers updated regularly (`npx playwright install chromium` after each upgrade), and keep each project on the latest Playwright release, not just the newest one already in the repo.
- **Untrusted or open-web browsing and scraping:** always launch with `chromiumSandbox: true`. Never pass `--no-sandbox`.
- **Don't use the system Chrome for Playwright.** Always use Playwright's own bundled browsers, and keep them current by upgrading `playwright` / `@playwright/mcp` and re-running `npx playwright install`. Why:
  - **Isolation:** Playwright launches with a fresh, throwaway profile. System Chrome sits next to your real profile (logins, cookies, saved passwords), so a compromised automation browser could reach them.
  - **Version match:** each Playwright release is tested against its own Chromium build. System Chrome auto-updates on Google's schedule and can break the DevTools protocol or Playwright's patches without warning, which makes failures hard to diagnose.
  - **Reproducibility:** everyone on the team and CI gets the same browser. System Chrome gives every machine a different build.
  - **Fewer restrictions:** branded Chrome has been tightening automation flags and extension loading; bundled Chromium doesn't have those limits (verify for current versions).
  - **The tradeoff:** system Chrome auto-updates, so it is rarely stale. Don't switch browsers to solve that. Fix it with regular upgrades of `playwright*`, `chromiumSandbox: true`, container isolation, and a Dependabot/Renovate rule or scheduled run of this audit.
  - **Exception:** use a system browser only for human-in-the-loop work that needs a real logged-in session. Even then, use a dedicated Chrome profile created just for automation, never your daily profile, and never for open-web agents.
- **Chrome CDP (`connectOverCDP`, remote debugging port):** use it to attach to an existing browser, not as the default way to launch one. Acceptable for:
  - debugging and profiling (e.g. Chrome DevTools MCP, traces, heap snapshots);
  - a human-driven session, using a dedicated automation profile (`--user-data-dir`), never the daily profile;
  - remote or cloud browsers and containers that expose a CDP endpoint (good for isolation);
  - Electron/embedded Chromium that Playwright can't launch directly.
  Rules:
  - A debugging port is full remote control (cookies, JS on any tab). Bind to `127.0.0.1` only, never expose it on a network, and treat it like a credential.
  - Newer Chrome versions refuse the debugging port on the default profile, so use a separate profile (verify for current versions).
  - `connectOverCDP` has lower fidelity than Playwright's own protocol, and it is Chromium-only.
  - For tests against our own apps use bundled Chromium via `launch()`. For untrusted web or AI agents use bundled Chromium with `chromiumSandbox: true` in a container, or a remote CDP browser in a throwaway environment.
- **AI agents that navigate the open web:** run them in a non-root container or throwaway VM/profile so the host is isolated. Give them no access to personal files, `.env` files and API keys, SSH keys, cloud credentials or the daily browser profile. Prompt injection from a page can steer the agent, so assume anything the agent can reach can be leaked.
- **Patched is not safe:** even the latest Playwright bundles a Chromium major that lags current Stable, and Google stops patching older majors. For agents and scrapers, an up-to-date Playwright is never a green light on its own. It must be paired with the enabled sandbox and strict containerization.
- **Docker/CI:** never run Playwright or Puppeteer as root. Use a non-root user so the Chromium sandbox stays active, and don't add `--no-sandbox` to make a container work.
- **Don't rely on defaults:** Playwright's `chromiumSandbox` default is off (verify for current versions). Set `chromiumSandbox: true` explicitly on every launch, and always for anything that browses untrusted sites, so the setting doesn't depend on a default that may differ by version or config.
- **Don't weaken the browser to make a test pass:** no `--disable-web-security`, `--disable-site-isolation-trials` or `ignoreHTTPSErrors` by default. If one specific test needs one, scope it to that test and comment why.
- **Check the latest version, don't copy one:** find the latest Playwright with `npm view playwright version` and read its Chromium from `browsers.json`. Never rely on a version number written in a doc, an earlier report or another repo; they go stale within weeks.
- **Playwright has two Chromium builds per revision:** the full browser and the headless shell. Both are downloaded by `npx playwright install chromium`; `--no-shell` skips the shell if no test runs headless without a `channel`.
- **Persistent browser profiles hold logins and cookies.** Keep them in a git-ignored folder, never in a tracked path, and delete them when the test is finished. A signed-in test account in a profile is a live session.
- **Test servers bind to `127.0.0.1`,** never all interfaces.
- **Secrets stay out of git:** API keys, signing keys and `.env` files with credentials are git-ignored, and a key that was ever committed is revoked, not just deleted.
- **In-app WebViews:** treat route params and deep links as untrusted input. Allow https only, accept no raw `html` param, and let only the app's own pages send navigation messages.
- **Remotion and similar:** these ship their own headless shell in each project's `node_modules`. Upgrade them with the project, since a global browser update won't fix them.
- Never run delete or uninstall commands from an audit without human review.
