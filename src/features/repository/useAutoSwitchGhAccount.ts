import { useEffect } from "react";
import { toast } from "sonner";
import { ghAccounts, ghRepoCredentialUsername } from "@/lib/git/api";
import { useSwitchAccount } from "@/lib/git/queries";
import { useSettings } from "@/lib/settings/queries";
import { toastError } from "@/lib/toast";

/** Points the active `gh` account at the one the repo's Git config names
 *  (`credential.https://<host>.username`) when the repo opens. `gh` has one active
 *  account per host, so this is a global switch: it only targets an account `gh`
 *  already holds and does nothing when the repo pins none, the account is already
 *  active, or the setting is off. */
export function useAutoSwitchGhAccount(repoPath: string | null) {
  const enabled = useSettings().data?.autoSwitchGhAccount === true;
  const { mutateAsync: switchAccount } = useSwitchAccount();

  // biome-ignore lint/correctness/useExhaustiveDependencies: switchAccount is identity-pinned per mutation; the effect keys on the repo.
  useEffect(() => {
    if (!repoPath || !enabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const pinned = await ghRepoCredentialUsername(repoPath);
        if (!pinned || cancelled) return;
        const { accounts } = await ghAccounts();
        if (cancelled) return;
        const onHost = accounts.filter((a) => a.host === pinned.host);
        if (onHost.some((a) => a.active && matches(a.login, pinned.username)))
          return;
        const target = onHost.find((a) => matches(a.login, pinned.username));
        if (!target) return;
        await switchAccount({ host: target.host, login: target.login });
        toast.info(`GitHub account switched to ${target.login}`);
      } catch (e) {
        if (!cancelled) toastError(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repoPath, enabled]);
}

const matches = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
