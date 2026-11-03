# Upstream sync review: theBGuy/GitDesktop `master` → fork

Pre-sync review, written 2026-11-02, before any merge. Companion docs:
[fork-history.md](fork-history.md) (what the fork changes) and
[upstream-sync-conflicts.md](upstream-sync-conflicts.md) (how conflicts were or
will be resolved).

**Verdict: safe to sync, with four things to handle.** None of the fork's
behavior is lost or broken by upstream's changes. Two need a small edit while
merging (one textual conflict, one CI check), and two are cleanup around the
merge.

## Scope

| | |
| --- | --- |
| Fork base (merge-base) | `b5677e89` (v0.13.5) |
| Upstream head reviewed | `630e992e` (2026-11-02, "stabilize branch menu, publishing and tag details (#644)") |
| Upstream commits | 56 (releases v0.13.6 and v0.13.7 included), 0 behind |
| Files touched upstream | 632 |
| Files both sides edited | 7 |

Method: GitHub API (`gh api .../compare` and per-commit patches). No `git fetch`
or merge was run, so everything below is read from patches, not from a trial
merge. Items marked **predicted** have not been executed.

## Overlap with the fork

Upstream never touched the fork's AI core (`src/lib/ai/{providers,types,model-factory,models,client,context-budget}.ts`),
`AiProviderSection.tsx`, `GeneralSection.tsx`, `accounts.ts`, or `useAutoSwitchGhAccount.ts`.
The 7 shared files:

| File | Upstream change | Expected result |
| --- | --- | --- |
| `src/lib/settings/api.ts` | `DEFAULT_SETTINGS` and the heal logic moved to a new `heal.ts` | **Conflict** (see 1) |
| `src-tauri/src/github/pr.rs` | Many hunks (caching, rate limits, renames), none near `gh_repo_credential_username` | Clean textually; **check J** hazard (see 2) |
| `src-tauri/src/lib.rs` | Hunks at other `invoke_handler` entries | Clean (**predicted**) |
| `src/features/repository/RepositoryView.tsx` | Adds `PublishPendingBanner` import and element; comment rewrites | Clean (**predicted**); our import and hook call sit one line from upstream's import hunk |
| `src/features/help/content.ts` | About 60 hunks, nearest 7 lines from ours | Clean (**predicted**) |
| `site/src/data/capabilities.ts` | One label edited 3 lines after our inserted entry | Clean (**predicted**) |
| `README.md` | Hunks at lines 76 to 1150; ours at 33 and 1278 | Clean, but see 3 |

## What needs handling

### 1. `DEFAULT_SETTINGS` moved: our default would be lost (conflict)

Upstream #608 moved `DEFAULT_SETTINGS` (and the load-time heal) from
`src/lib/settings/api.ts` to `src/lib/settings/heal.ts`, re-exported from `api.ts`.
The fork added `autoSwitchGhAccount: true` inside the old block in `api.ts`, so
git will report a conflict there. Silently taking upstream's side would leave the
setting without a default, so the checkbox would start unchecked and the hook
(`=== true`) would never fire.

Resolution: take upstream's `api.ts`, keep the fork's `autoSwitchGhAccount: boolean`
field in the `AppSettings` interface, and add `autoSwitchGhAccount: true` to
`DEFAULT_SETTINGS` in `heal.ts`. The heal only enum-checks specific keys and
otherwise spreads the defaults, so a boolean needs no heal entry.

Also re-test after the merge: #608/#614/#617 rebuilt the Settings save flow (save
bar, discard confirm, leave guard). The fork's checkbox is a `form.AppField` in
`GeneralSection.tsx`, which upstream did not edit, so confirm in the running app
that toggling it, saving, and reopening Settings keeps the value.

### 2. New CI check J will likely flag `gh_repo_credential_username` (predicted)

Upstream #612 added check J to `scripts/check-rust-invariants.mjs`: in
`src-tauri/src/github/*.rs`, `if x.code != 0 { return Ok(None) }` is treated as
"a non-zero exit read as absence" unless the function calls
`classify_gh_failure` or is allowlisted. The fork's command in `pr.rs` has that
exact shape, though it runs `git config --get-urlmatch` (exit 1 means the key is
unset), not `gh`. Nothing is wrong at runtime; the required `checks` job would
fail after the sync.

I could not run the upstream script against the fork: a trial run of the
downloaded script was blocked, so this is a static reading of the regexes.

Fix, either one:
- **Preferred:** restructure so the exit check isn't the flagged shape, for example
  `if out.code == 0 { ...plausibility check... } else { None }`. It keeps
  upstream's script untouched, so there's nothing to re-conflict on later.
- Or add an entry to `GH_EXIT_ABSENCE_ALLOWLIST` with the rationale "local
  `git config` read; exit 1 means unset, not a gh failure". That edits an upstream
  file, so it can conflict on later syncs.

Run `pnpm checks` after the merge to confirm (it includes the scripts changed
upstream: `check-rust-invariants`, `check-banned-patterns`).

### 3. Clean the working tree before merging

`README.md` has an uncommitted line (a stray build path under Install) and upstream
edits `README.md`, so git will refuse to merge until it is committed, stashed or
discarded. Drop that line (it is not intended content) and decide what to do with
untracked `2.md`. The fork's own two commits are already on `master`.

### 4. The in-app updater still points at upstream (pre-existing, now urgent)

`src-tauri/tauri.conf.json` has the updater endpoint
`https://github.com/theBGuy/GitDesktop/releases/latest/download/latest.json` and
upstream's public key. Upstream has published v0.13.7, so a fork build at 0.13.5
(or 0.13.7 after the sync) can be offered upstream's next release, which would
replace the fork's providers and auto-switch with upstream's build. Upstream's
#642 also adds `"requireSignedVersion": true` to that block. The fork builds
without the signing key (the earlier local build exited non-zero at the
updater-signing step), so it can't publish its own updates.

Not changed here. Decide before distributing fork builds: point the endpoint at
the fork's releases with its own key, or disable the updater in fork builds.
Whatever is chosen is a new fork customization to record in
[fork-history.md](fork-history.md); the `tauri.conf.json` `plugins.updater` block
is a merge hotspot.

## Checked and fine

- **Account switch vs. new GitHub caching (#598, #604).** Upstream now memoizes
  repo metadata and viewer login, keyed by host and invalidated by an auth epoch.
  `changes_gh_account` in `runner.rs` matches `["auth", "switch", ..]`, and the fork's
  `gh_switch_account` runs `gh auth switch --hostname ... --user ...` through
  `run_gh`, so every auto-switch bumps the epoch and drops stale data. The
  upstream test `account_changing_commands_bump_the_auth_epoch` pins this.
- **Provider healing (#608).** The saved-provider heal checks against
  `ALL_PROVIDER_IDS`, derived from `PROVIDER_LABELS`, which includes `lm-studio`
  and `unsloth`, so saved settings with those providers survive loading.
- **Local-server connections (#642).** The security hardening blocks foreign
  webview navigation and redacts URLs in navigation logs. `tauri.conf.json` has
  `csp: null` and the fork's LM Studio and Unsloth calls go through the existing
  guarded fetch, so they are not navigation. Smoke-test one local provider anyway.
- **Dependencies.** `@ai-sdk/openai` 3.0.124 → 3.0.134 and `ai` 6.0.292 → 6.0.317
  are patch bumps, and the fork uses `createOpenAI(...).chat(...)`, as it did before
  the bump. Biome goes 2.5.15 → 2.6.3, so re-run `pnpm exec biome check ./src/`
  and expect possible formatting nits in fork files. `.node-version` is new (24).
- **Removed upstream files.** `check-rule-mirrors.mjs` and many `changelog.d/`
  fragments are deleted (folded into the changelog at release). The fork's
  fragments, if present, are unaffected.

## Not verified

- No trial merge was run, so the "clean" rows are predictions from hunk positions.
- Checks J (above) and K (`--no-ext-diff` on diff commands) were not run against
  the merged tree. K concerns code the fork didn't add.
- Runtime behavior after the merge (Settings save flow, local providers, auto-switch
  toast) needs a manual pass in the app.

## Suggested order

1. Resolve item 3 (clean tree), then `git fetch upstream` and merge on a branch.
2. Resolve conflicts per [upstream-sync-conflicts.md](upstream-sync-conflicts.md)
   and update that file with what actually happened.
3. Apply item 2.
4. `pnpm install`, `pnpm build`, `pnpm exec biome check ./src/`, `pnpm checks`,
   `cargo test --manifest-path src-tauri/Cargo.toml`,
   `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`.
5. Manual pass: both local providers, auto-switch toggle persisting through
   Settings Save.
6. Decide item 4, then update the fork base in [fork-history.md](fork-history.md).
