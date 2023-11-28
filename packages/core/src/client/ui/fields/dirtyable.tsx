import React, { useContext } from "react";
import { DirtyState } from "../../../@types/types";
import { useUpdate } from "../../support/hooks";
const DirtyContext = React.createContext<{
  reset?: boolean;
  onDirty?: () => void;
}>({});

export const useDirty = () => useContext(DirtyContext);

export function useDirtyInput<T>(v: T): boolean {
  const { onDirty } = useDirty();
  useUpdate(() => onDirty?.(), [v]);
  return false;
}

export function useDirtyContainer([dirty, setDirty]: [
  DirtyState,
  (s: DirtyState) => void
]) {
  return {
    dirty: Boolean(dirty),
    markReset: () => setDirty(false),
    markDirty: () => setDirty(true),
    wrapDirty: (children: React.ReactNode) => (
      <DirtyContext.Provider
        value={{
          onDirty: () => setDirty(true),
        }}
      >
        {children}
      </DirtyContext.Provider>
    ),
  };
}

export const DirtyTrigger = ({ v }: { v: any }): null => {
  useDirtyInput(v);
  return null;
};
