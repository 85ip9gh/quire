import { useCallback, useState } from "react";
import { messageOf } from "../lib/files";

interface TaskState {
  busy: boolean;
  scope: string;
  error?: string;
  done?: string;
}

export function useTask(scope = "") {
  const [state, setState] = useState<TaskState>({ busy: false, scope });

  const run = useCallback(
    async (work: () => Promise<string | void>) => {
      setState({ busy: true, scope });
      await new Promise((resolve) => setTimeout(resolve, 0));
      try {
        const done = await work();
        setState({ busy: false, scope, done: done || undefined });
      } catch (error) {
        setState({ busy: false, scope, error: messageOf(error) });
      }
    },
    [scope],
  );

  const current = state.scope === scope;
  return {
    busy: state.busy,
    error: current ? state.error : undefined,
    done: current ? state.done : undefined,
    run,
  };
}
