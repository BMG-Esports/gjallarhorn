import { Entrant } from "../../@types/types";
import {
  DependencyList,
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
  useRef,
  useMemo,
} from "react";

/**
 * A variation of use-async-memo from NPM that actually handles undefined and
 * null predictably.
 */
export function useAsyncMemo<T>(
  factory: () => Promise<T | undefined | null>,
  deps: DependencyList,
  initial?: T
): T {
  const [val, setVal] = useState<T>(initial);
  useEffect(() => {
    let cancel = false;
    setVal(undefined);
    factory().then((newVal) => {
      if (!cancel) {
        setVal(newVal);
      }
    });
    return () => {
      cancel = true;
    };
  }, deps);
  return val;
}

/**
 * Store a copy of the state in local storage and restore it on page load.
 */
export function useLocalStorageState<T>(
  name: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, _setValue] = useState<T>(
    localStorage[name] ? JSON.parse(localStorage[name]) : initialValue
  );
  const setValue = (v: T) => {
    _setValue(v);
    localStorage[name] = JSON.stringify(v);
  };
  return [value, setValue];
}

/**
 * Call a callback synchronously only once.
 */
export function useBeforeMount(cb: () => void) {
  const didMount = useRef(false);
  if (didMount.current) return;
  cb();
  didMount.current = true;
}

/**
 * Bind a keyboard shortcut across the application. Setting global to true
 * triggers the callback even if a field is active. False means there should be
 * no active field.
 */
export function useKeybind(
  cb: () => void,
  key: string,
  global: boolean,
  modifiers: {
    alt?: boolean;
    ctrl?: boolean;
    shift?: boolean;
  } = {}
) {
  const alt = !!modifiers.alt,
    ctrl = !!modifiers.ctrl,
    shift = !!modifiers.shift;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!global && document.activeElement) return; // Another element has focus.
      if (e.code !== key) return; // incorrect key
      if (alt !== e.altKey || ctrl !== e.ctrlKey || shift !== e.shiftKey)
        return; // missing modifiers
      e.preventDefault();
      cb();
    }

    document.body.addEventListener("keydown", onKeyDown);
    return () => document.body.removeEventListener("keydown", onKeyDown);
  }, [cb, key, global, modifiers]);
}

export function useTitle(title: string) {
  useEffect(() => {
    const oldTitle = document.title;
    document.title = `${title} · Stream Toolkit`;
    return () => void (document.title = oldTitle);
  }, [title]);
}

export function debounce(ms: number) {
  let interval: number;
  let onCancel = () => {
    /**/
  };
  return (cb: () => void, cancel?: () => void) => {
    onCancel();
    window.clearTimeout(interval);
    onCancel =
      cancel ||
      (() => {
        /**/
      });
    interval = window.setTimeout(cb, ms);
  };
}

export function useDebounce(ms: number) {
  return useMemo(() => debounce(ms), [ms]);
}

/**
 * A wrapper around useEffect that only runs when the dependencies update.
 */
export function useUpdate(effect: () => void, dependencies: any[] = []) {
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      effect();
    }
  }, dependencies);
}

export const entrantName = (e: Entrant) =>
  [e?.player1?.name, e?.player2?.name].filter((a) => a).join("/");
