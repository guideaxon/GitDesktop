# Fork history

What this fork (`guideaxon/GitDesktop`) changes relative to upstream
(`theBGuy/GitDesktop`). Use it as the checklist when syncing upstream, so the
customizations survive the merge.

- **Fork base:** `b5677e89` (2026-10-20, "fix(git,history,repository): close stale
  dialogs and guard squash operations (#577)"), app version 0.13.5. Everything
  before it is upstream history.
- **Fork commits:** 2, both by GuideAxon, both on 2026-10-20.
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

## Sync checklist

1. `git fetch upstream`, then compare from the fork base:
   `git log b5677e89..upstream/master --oneline`.
2. Merge (or rebase) on a branch, not `master`.
3. Resolve the hotspots above, then verify with `pnpm build`,
   `pnpm exec biome check ./src/`, and
   `cargo test --manifest-path src-tauri/Cargo.toml`.
4. In the app, confirm both local providers still appear and resolve a model, and
   the auto-switch checkbox is still in Settings → General.
5. Update the fork base in this file to the new upstream commit.

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
