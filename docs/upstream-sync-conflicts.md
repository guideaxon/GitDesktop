# Upstream sync: conflict resolution log

Records how each merge conflict between upstream (`theBGuy/GitDesktop`) and the
fork's customizations was resolved, so the same call can be repeated next sync.
The fork's customizations are listed in [fork-history.md](fork-history.md); the
pre-sync analysis is in [upstream-sync-review.md](upstream-sync-review.md).

## How to use this file

- Add one dated section per sync, newest first. List each conflicted file, what each
  side did, and the resolution.
- Standing rules below apply to every sync; put a new rule there when a resolution
  generalizes.
- A **Predicted** entry comes from reading patches before merging. Replace it with
  what actually happened, keeping the note if the prediction was wrong.

## Standing rules

1. **Upstream structure wins, fork behavior is re-applied.** When upstream moves or
   renames code the fork edited, take upstream's layout and re-add the fork's lines in
   the new place. Never take "ours" for a whole file.
2. **Provider lists.** After any merge touching `src/lib/ai/`, confirm `lm-studio` and
   `unsloth` still appear in `PROVIDER_LABELS`, `AiProviderId`, `MODEL_SUGGESTIONS`,
   `isLocalProvider`, and every `switch` or `Record<AiProviderId, ...>` upstream added.
   `tsc` flags the missing ones.
3. **Settings defaults live in `src/lib/settings/heal.ts`** (since upstream #608),
   not `api.ts`. The fork's `autoSwitchGhAccount: true` goes in `DEFAULT_SETTINGS`
   there; its type stays in the `AppSettings` interface in `api.ts`.
4. **Fork Rust in `src-tauri/src/github/` must pass upstream's invariant checks**
   (`pnpm checks`). Fix the fork's code before adding to an upstream allowlist, so
   upstream files stay untouched.
5. **Docs files** (`README.md`, `help/content.ts`, `capabilities.ts`): keep both
   sides' lines; the fork's additions are the "Several GitHub accounts" bullet and
   the LM Studio / Unsloth bullets listed in fork-history.
6. **Lockfiles** (`pnpm-lock.yaml`, `Cargo.lock`): take upstream's, then run
   `pnpm install` and `cargo check` to regenerate. Never hand-merge.

## Sync of 2026-11-06 → upstream `49197523` (v0.13.8, 11 commits)

One conflicted file out of 283 changed upstream.

| File | Upstream | Fork | Resolution |
| --- | --- | --- | --- |
| `src/features/repository/RepositoryView.tsx` | Added `import { TabPanel } from "./TabPanel"` and moved `TabPanel` out of the file | Added `import { useAutoSwitchGhAccount } from "./useAutoSwitchGhAccount"` at the same spot | Kept both imports, sorted case-insensitively (`TabPanel`, `useAutoSwitchGhAccount`, `usePrNotifications`). The hook call is still at the top of the component. |

Checked after the merge: `pnpm exec tsc -b --noEmit`, `pnpm changelog:check`, and the
`agent_sandbox` tests plus clippy. `biome check` reports formatting on this file only
because of the worktree CRLF false-fail described in the repo safety rules.

Security pass over the upstream diff: no change to `src-tauri/capabilities/` or
`tauri.conf.json`, no new process-spawning or HTML-injection code outside tests,
and the new `git_blob_sizes` command validates object ids and rejects traversal,
absolute paths, symlinks and reserved device names. New dependencies are Vitest and
Testing Library (dev only) plus routine bumps.

## Sync of 2026-11-02 → upstream `630e992e` (v0.13.7 plus 29 later commits)

Merged on branch `sync/upstream-2026-11-02` (`git merge upstream/master`). Two files
conflicted; the other five shared files auto-merged, as predicted.

### `src/lib/settings/api.ts` (conflict, as predicted)
- **Upstream:** moved `DEFAULT_SETTINGS` and the heal to `heal.ts`; `api.ts` re-exports.
- **Fork:** `autoSwitchGhAccount: true` inside the old `DEFAULT_SETTINGS` block.
- **Resolution:** dropped the whole conflicted block (upstream's side, the block is
  gone from `api.ts`); the interface field `autoSwitchGhAccount: boolean` auto-merged
  and stays; added `autoSwitchGhAccount: true` to `DEFAULT_SETTINGS` in `heal.ts`,
  right after `autoFetchInterval`.

### `site/src/data/capabilities.ts` (conflict, NOT predicted)
- **Upstream:** reworded the "Sign in & reconnect in-app" label (rate-limit backoff).
- **Fork:** inserted the "Per-folder GitHub accounts" entry directly before that entry,
  so git saw both edits as adjacent. The review had called this clean.
- **Resolution:** kept both: the fork's entry, then upstream's reworded label.
- **Lesson:** a fork entry inserted next to an entry upstream edits will conflict even
  when the hunks look 3 lines apart. Prefer appending fork capability lines at the end
  of their group to avoid this.

### `src-tauri/src/github/pr.rs` (auto-merged, check J hazard fixed)
- **Upstream:** check J rejects `if out.code != 0 { return Ok(None) }` in `github/*.rs`.
- **Fork:** `gh_repo_credential_username` had that shape (a `git config` exit 1 = unset).
- **Resolution:** rewrote it as `let username = if out.code == 0 { stdout } else { String::new() }`
  with a one-line comment; behavior is identical (an empty username is not plausible,
  so the command still returns `None`). Upstream's allowlist is untouched.
- **Verify:** `pnpm checks` and the `pr.rs` tests (not run yet).

### `RepositoryView.tsx`, `lib.rs`, `content.ts`, `README.md`
- Auto-merged. Still check that the fork's `useAutoSwitchGhAccount` import and call, the
  `gh_repo_credential_username` entry, the two help bullets, and the README bullets
  survived.

### Not a conflict, but decide
- **Updater endpoint** in `src-tauri/tauri.conf.json` still targets upstream's
  releases and key (review item 4). Record the decision here once made.
