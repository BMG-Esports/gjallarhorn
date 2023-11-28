import { Backend } from "../../support/backend";
import { useInjection } from "inversify-react";
import _ from "lodash";
import {
  Dispatch,
  SetStateAction,
  useDebugValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SocketService } from "../services/socket";

export function useBackend<T extends Backend>(token: T["identifier"]) {
  const socket = useInjection(SocketService);
  const identifier = token.description;

  /**
   * Synchronize a client-side state with the backend.
   *
   * Sync strategy: Every emitted state must be met with a state update from
   * the backend. By keeping track of how many state updates we sent minus how
   * many we've received, we'll know if we're waiting on an update and we can
   * defer syncing until after that happens.
   */
  function _useState<K extends keyof T["state"]>(
    key: K,
    initialValue?: T["state"][K]
  ): [T["state"][K] | undefined, Dispatch<SetStateAction<T["state"][K]>>] {
    useDebugValue(key);
    const [state, _setState] = useState<T["state"][K] | undefined>(
      initialValue
    );
    // Keep track of whether to overwrite with incoming.
    const waiting = useRef(0);
    const waitingState = useRef(null);
    const emitThrottle = useMemo(() => {
      let queuedEdits = 0;

      const throttle = _.throttle((key, newValue) => {
        // console.log("emit", newValue);
        socket.emit(`/backends/${identifier}/state`, key, newValue);
        waiting.current -= queuedEdits - 1;
        queuedEdits = 0;
      }, 150);

      return (key: any, newValue: any) => {
        queuedEdits++;
        waiting.current++;
        throttle(key, newValue);
      };
    }, []);

    const path = `/backends/${identifier}/state/${String(key)}`;

    useEffect(() => {
      let cancel = false;
      // Fetch the initial value from backend.
      socket.request(`/backends/${identifier}/state`, key).then((v) => {
        if (!cancel) {
          _setState(v);
        }
      });
      return () => void (cancel = true);
    }, [key]);

    useEffect(() => {
      const handler = (state: T["state"][K]) => {
        waiting.current--;
        waitingState.current = state;
        if (waiting.current <= 0) {
          _setState(state);
          waiting.current = 0;
        }
      };
      socket.on(path, handler);
      return () => void socket.off(path, handler);
    }, [path]);

    return [
      state,
      (newValue: SetStateAction<T["state"][K]>) => {
        if (typeof newValue == "function") {
          newValue = <T["state"][K]>(<any>newValue)(state);
        }
        _setState(newValue);
        emitThrottle(key, newValue);
      },
    ];
  }

  return new Proxy(
    <T & { useState: typeof _useState }>{
      useState: _useState,
    },
    {
      get: (target, prop) =>
        target[<keyof T>prop] ??
        ((...args: any[]) =>
          socket.request(`/backends/${identifier}/${String(prop)}`, ...args)),
    }
  );
}
