# Fork history

What this fork (`guideaxon/GitDesktop`) changes relative to upstream
(`theBGuy/GitDesktop`). Use it as the checklist when syncing upstream, so the
customizations survive the merge.

- **Fork base:** `b5677e89` (2026-10-20, "fix(git,history,repository): close stale
  dialogs and guard squash operations (#577)"), app version 0.13.5. Everything
  before it is upstream history.
- **Fork commits:** 2 original customizations (GuideAxon, 2026-10-20), plus the
  browser-automation security hardening below (customization 4).
- **Last upstream sync:** 2026-11-06, merge of `upstream/master` `49197523`
  ("add state tabs and review history posting (#653)", v0.13.8). The earlier sync
  merged `630e992e` (v0.13.7+). One textual conflict, in `RepositoryView.tsx`
  imports (see [Merge hotspots](#merge-hotspots)).
- **Uncommitted at the time of writing:** a stray build-path line in `README.md`
  (see [Loose ends](#loose-ends)).
- Gathered from `git log` / `git show` on `master`. The `upstream` remote is
  configured but has not been fetched here, so there are no `upstream/*` refs to
  diff against yet.

## Customizations

### 1. Local-server AI providers: LM Studio and Unsloth (`b9e2c5eb`)

Two new providers (`lm-studio`, `unsloth`) in the Provider dropdown for the
generation, review and security-audit pickers. Both speak the OpenAI-compatible
chat API, need no API key, and live at `<server>/v1`.

| Behavior | Detail |
| --- | --- |
| Default URLs | LM Studio `http://localhost:1234`, Unsloth `http://localhost:8888` (the Unsloth port is a guess; confirm it). A trailing `/` or `/v1` in the typed URL is tolerated. |
| Default model | Switching to LM Studio pre-fills `qwen/qwen3.6-35b-a3b`. Unsloth has none. |
| Auto-detect | Models come from `<server>/v1/models`, embedding models skipped. A blank model at run time uses the first listed model; LM Studio falls back to the Qwen id when the server is unreachable or lists nothing. |
| Host allow-list | A non-localhost URL goes through the existing Allowed hosts check and "Allow host" prompt. |
| Default provider | Unchanged (still Anthropic). |

Files:

- **New:** `src/lib/ai/local-server.ts` (`listLocalServerModels`,
  `resolveLocalModel`).
- **Edited, AI core:**
  - `src/lib/ai/providers.ts`: labels, `LocalServerProviderId`,
    `LOCAL_SERVER_DEFAULT_URLS`, `isLocalServerProvider`, `localServerApiRoot`,
    `MODEL_SUGGESTIONS`, and `isLocalProvider` now includes both.
  - `src/lib/ai/types.ts`: the two provider ids plus `lmStudioBaseUrl` /
    `unslothBaseUrl` on the AI settings.
  - `src/lib/ai/model-factory.ts`: `createOpenAI(...).chat(model)` branch for both.
  - `src/lib/ai/models.ts`: model listing branch.
  - `src/lib/ai/client.ts`: resolves the model through `resolveLocalModel` before
    `createModel`.
  - `src/lib/ai/context-budget.ts`: the two ids in the provider switch.
- **Edited, settings UI:** `src/features/settings/AiProviderSection.tsx`
  (`LocalServerConfig` URL field, "Auto-detect from server" placeholder, host-allow
  wiring and in-use hints for the new URLs).
- **Docs:** README bullet, `src/features/help/content.ts` guide entry, and a
  changelog fragment `changelog.d/added-lm-studio-unsloth-providers.md`. No site
  capability entry was added for this one.

### 2. Auto-switch the GitHub CLI account per repository (`b9e2c5eb`)

On opening a repo, read its `credential.username` for the GitHub host and, if
`gh` already holds that account and it isn't active, switch to it and show a toast.

- Reads the value with `git config --get-urlmatch`, so it matches what a push
  would use, including `includeIf` files.
- No-ops when no username is pinned, the account is already active, `gh` doesn't
  know the account, or the setting is off.
- The switch is global to `gh`, not per repo. A failed switch toasts an error on
  every repo open.
- Setting: "Switch GitHub account to match the repository" in Settings → General,
  on by default (`autoSwitchGhAccount`).

Files:

- **New:** `src/features/repository/useAutoSwitchGhAccount.ts`.
- **Edited, backend:** `src-tauri/src/github/pr.rs` (new
  `gh_repo_credential_username` command), `src-tauri/src/lib.rs` (registered in the
  invoke handler, next to `gh_switch_account`).
- **Edited, frontend:**
  - `src/features/repository/RepositoryView.tsx`: calls the hook.
  - `src/lib/git/api/accounts.ts`: `ghRepoCredentialUsername`.
  - `src/lib/settings/api.ts`: `autoSwitchGhAccount` type and default `true`.
  - `src/features/settings/GeneralSection.tsx`: the checkbox and help text.
- **Docs:** README, `src/features/help/content.ts`,
  `site/src/data/capabilities.ts` (5 lines), and a changelog fragment
  `changelog.d/added-auto-switch-gh-account.md`.

### 3. README edits (`ff3da8f0`, plus one uncommitted line)

Small README changes (7 insertions, 3 deletions). Re-check the Install section
after a merge, since upstream edits there too.

### 4. Browser-automation security hardening (2026-11-06)

Result of auditing this repo for stale or unsafe bundled browsers. GitDesktop is a
Tauri app on the system WebView2 and has no Playwright, Puppeteer, Remotion or
Electron dependency, so the changes are guardrails and docs, not dependency bumps.

| Change | Detail |
| --- | --- |
| Agent guide rules | A "Browser automation safety" section appended to `CLAUDE.md` and `AGENTS.md` (identical text): bundled Chromium only, `chromiumSandbox: true` set explicitly, never `--no-sandbox`, non-root containers, no weakening flags, CDP and debug-port rules, secrets out of git. |
| MCP config | `.mcp.json` runs `pnpm exec shadcn mcp` instead of `npx shadcn@latest mcp`. `shadcn` is already a devDependency, so the lockfile pins it and Renovate bumps it. Needs `pnpm install` first. |
| Agent Dockerfile starter | The commented Playwright example in `src-tauri/src/agent_sandbox.rs` now uses `playwright@<version>` (not `@latest`), says to keep the Chromium sandbox on, and says to install as root then switch back to `USER node`. A doc comment on `CUSTOM_DOCKERFILE_STARTER` records why. |
| Debug port note | `TROUBLESHOOTING.md`: close GitDesktop when finished with the WebView2 remote-debugging port. |

Files:

- **Edited:** `CLAUDE.md`, `AGENTS.md`, `.mcp.json`, `TROUBLESHOOTING.md`,
  `src-tauri/src/agent_sandbox.rs`.
- **New:** `changelog.d/changed-agent-dockerfile-starter-playwright.md`.

Audit findings left as they are:

- The vendored `impeccable` skill passes `--no-sandbox` when `CI` is set
  (`.claude/skills/impeccable/scripts/detector/engines/browser/detect-url.mjs`, and
  the `.agents/` copy). Puppeteer is not installed and the scan targets the user's
  own dev server. Left alone because `skills-lock.json` tracks the vendored files.
- `pnpm audit --prod` reports a moderate `minimatch` and a low `deepmerge` issue,
  both reached only through the `shadcn` CLI and both already in the lockfile before
  the 2026-11-06 sync.
- No committed credentials, Dockerfiles, deep-link WebViews or capability changes
  were found in this repo or in the upstream commits merged on 2026-11-06.

## Merge hotspots

Files both sides are likely to touch, ordered by conflict risk. Resolve by keeping
upstream's change and re-adding the fork lines listed above.

1. `src/lib/ai/providers.ts`, `types.ts`, `model-factory.ts`, `models.ts`,
   `client.ts`, `context-budget.ts`: every new upstream provider edits the same
   unions and switches. Upstream may add exhaustive `Record<AiProviderId, ...>`
   maps, which fail `tsc` until `lm-studio` and `unsloth` entries are added.
2. `src/features/settings/AiProviderSection.tsx` and `GeneralSection.tsx`.
3. `src/features/help/content.ts`, `README.md`, `site/src/data/capabilities.ts`.
4. `src-tauri/src/github/pr.rs` and `src-tauri/src/lib.rs` (the invoke handler
   list).
5. `src/lib/settings/api.ts`: settings type and defaults.
6. `src/features/repository/RepositoryView.tsx`: upstream edits the import block
   and moves components out. The 2026-11-06 sync conflicted on one line: keep
   upstream's `TabPanel` import and the fork's `useAutoSwitchGhAccount` import,
   in that sort order.
7. Security hardening files: the appended section at the end of `CLAUDE.md` and
   `AGENTS.md` (conflicts if upstream appends there too), `.mcp.json`,
   `TROUBLESHOOTING.md`, and the starter text in `agent_sandbox.rs`. Keep the
   fork's wording and re-check that `.mcp.json` still points at `pnpm exec`.

## Sync checklist

1. `git fetch upstream`, then compare from the fork base:
   `git log b5677e89..upstream/master --oneline`.
2. Merge (or rebase) on a branch, not `master`.
3. Resolve the hotspots above, then verify with `pnpm build`,
   `pnpm exec biome check ./src/`, and
   `cargo test --manifest-path src-tauri/Cargo.toml`.
4. In the app, confirm both local providers still appear and resolve a model, and
   the auto-switch checkbox is still in Settings → General.
5. Update the fork base and the "Last upstream sync" line in this file to the new
   upstream commit.
6. Re-run the security checks: `pnpm audit --prod`, a diff of
   `src-tauri/capabilities/` and `tauri.conf.json`, and a scan of the merged
   upstream diff for new process spawns, HTML sinks and dependencies.

## Loose ends

- `README.md` has an uncommitted line under the Install heading,
  `D:\Github\GitDesktop\src-tauri\target\release`, a local build path that looks
  accidental. Drop it before committing.
- `2.md` (untracked) holds scratch notes and does not belong in the repo.
- The two changelog fragments and the README bullet named in the `b9e2c5eb`
  message did not show up in that commit's file list. Check that
  `changelog.d/added-lm-studio-unsloth-providers.md` and
  `changelog.d/added-auto-switch-gh-account.md` exist; if not, recreate them from
  the sections above.
- No site `FeatureRow` or capability entry exists for the local providers.
