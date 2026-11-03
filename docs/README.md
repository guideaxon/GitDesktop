D:\GAXON\GitDesktop\src-tauri\target\release

gh auth refresh -h github.com -s workflow

---

--Merge with upstream branch
git switch -c sync/upstream-2026-11-02
 git merge upstream/master
 
git switch master
git merge --no-ff sync/upstream-2026-11-02
---


**How the auto-switch works**
- Opening a repo reads its `credential.username` for the GitHub host from Git config. It uses `git config --get-urlmatch`, so it sees the same value a push would, including `includeIf` files.
- If `gh` already holds an account with that username and it isn't the active one, the app runs the existing account switch and shows a toast.
- It does nothing when no username is pinned, the account is already active, `gh` doesn't know the account, or the setting is off.
- The switch applies to `gh` everywhere, not per repo.
- The setting is "Switch GitHub account to match the repository" in Settings → General, on by default. If a switch fails, you'll get an error toast on every repo open.

**Changes**
- Backend: new `gh_repo_credential_username` command in `src-tauri/src/github/pr.rs`, registered in `lib.rs`.
- Frontend: new `useAutoSwitchGhAccount` hook, called from `RepositoryView`, plus the settings field and checkbox.
- Docs: README, in-app guide, site capability line, and `changelog.d/added-auto-switch-gh-account.md`.

**Checks I ran**
- `tsc -b` passes.
- `cargo check` and `cargo clippy -D warnings` pass, with the VS environment loaded.
- `biome ci` on LF copies of my five files is clean. The copies are deleted.

---
LM Studio and Unsloth now appear in the Provider dropdown, for the generation, review and security-audit pickers. 

- **Default model:** switching to LM Studio pre-fills `qwen/qwen3.6-35b-a3b`. That is LM Studio's usual publisher/name format, so check it against the id your install lists. Unsloth has no default.
- **Auto-detect:** both read models from `<server>/v1/models`, skipping embedding models. If the model field is blank at run time, the first model the server lists is used. If the server is unreachable or lists nothing, LM Studio falls back to the Qwen id above.
- **Server URL:** each provider has a URL field in Settings → AI. LM Studio defaults to `http://localhost:1234` and Unsloth to `http://localhost:8888`. The Unsloth port is my guess, so confirm it. A trailing `/v1` in the URL is tolerated.
- **Keys and hosts:** neither provider needs an API key. A non-localhost URL goes through the Allowed hosts check, with the usual "Allow host" prompt.
- **Default provider unchanged:** I read "use LM Studio… as the default" as the default model when LM Studio is picked. The app's default provider is still Anthropic. Say if you want LM Studio to be the out-of-the-box provider.

I added a README bullet, an in-app guide entry and `changelog.d/added-lm-studio-unsloth-providers.md`. I did not add the marketing-site capabilities entry that CLAUDE.md also asks for. The new logic is in `src/lib/ai/local-server.ts`.
---
Updating the installed app:

It won't auto-update. The updater only offers newer versions from the release feed. This build is still 0.13.5 and isn't published there.
You shouldn't need to uninstall first. Running the new GitDesktop_0.13.5_x64-setup.exe over the installed app should upgrade it in place. I haven't tested that on your machine. Your settings and keychain keys are stored outside the install folder, so an uninstall wouldn't remove them either.
---
The build worked. The exit-1 error comes after it, at the updater-signing step, and doesn't affect the installers.

The new installers were written at 15:48. The size changed from 15,869,094 to 15,873,063 bytes, so this is a fresh build with the LM Studio and Unsloth changes.

- **Installer (use this):** `D:\Github\GitDesktop\src-tauri\target\release\bundle\nsis\GitDesktop_0.13.5_x64-setup.exe`
- **MSI alternative:** `D:\Github\GitDesktop\src-tauri\target\release\bundle\msi\GitDesktop_0.13.5_x64_en-US.msi`

**The error:** the config has an updater public key, but `TAURI_SIGNING_PRIVATE_KEY` isn't set here. Tauri therefore couldn't sign the update artifacts and exited non-zero. Those artifacts are only for publishing a release, so a local install doesn't need them.

Run the installer over your existing install. Then open Settings → AI and pick **LM Studio (local)** or **Unsloth (local)**.




---
How do you build and run this?

Is Github CLI installed?
    gh --version
To install it, run winget install --id GitHub.cli and then gh auth login. You'll need to restart the terminal afterward so the new PATH entry is picked up.

**Prerequisites** (from [CONTRIBUTING.md](CONTRIBUTING.md)):
- Rust stable toolchain (https://rustup.rs)
- Node 24+
- pnpm (`corepack enable` picks up the version pinned in package.json)
- The Tauri 2 system prerequisites for Windows (https://v2.tauri.app/start/prerequisites/): the WebView2 runtime and the MSVC build tools.

**Run it in development** (hot reload):
```sh
pnpm install
pnpm tauri dev
```

**Build a release installer:**
```sh
pnpm tauri build
```
This is the standard Tauri command. I didn't confirm it in the repo's scripts, only the `tauri` script entry in [package.json](package.json). The installer lands under `src-tauri/target/release/bundle/`.

**Other commands:**
```sh
pnpm build                                       # typecheck + bundle the frontend only
pnpm lint                                        # Biome, rewrites files in src/ and site/
cargo test --manifest-path src-tauri/Cargo.toml  # Rust tests
cd site && pnpm build                            # marketing site
```

**Using it:** once `pnpm tauri dev` opens the window, add or open a local repository. The app is keyboard-first, so the in-app user guide (Help) lists the shortcuts. AI features can be hidden under Settings → General → Hide AI features. [PRODUCT.md](PRODUCT.md) and [README.md](README.md) describe the features.

The first Rust build takes several minutes.