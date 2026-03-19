import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useSignalR } from "@/hooks/useSignalR";

interface ForceStreamStateContextValue {
  isForceStreamActive: boolean
}

const ForceStreamStateContext = createContext<ForceStreamStateContextValue | null>(null);

export function ForceStreamStateProvider({ children }: { children: ReactNode }) {
  const { connection } = useSignalR();
  const [isForceStreamActive, setIsForceStreamActive] = useState(false);

  useEffect(() => {
    const onForceStreamStateChanged = (isActive: boolean) => {
      setIsForceStreamActive(Boolean(isActive));
    };

    connection.on("ForceStreamStateChanged", onForceStreamStateChanged);

    return () => {
      connection.off("ForceStreamStateChanged", onForceStreamStateChanged);
    };
  }, [connection]);

  const value = useMemo(
    () => ({
      isForceStreamActive,
    }),
    [isForceStreamActive],
  );

  return createElement(ForceStreamStateContext.Provider, { value }, children);
}

export function useForceStreamState(): ForceStreamStateContextValue {
  const context = useContext(ForceStreamStateContext);

  if (!context) {
    throw new Error("useForceStreamState must be used within a ForceStreamStateProvider.");
  }

  return context;
}
