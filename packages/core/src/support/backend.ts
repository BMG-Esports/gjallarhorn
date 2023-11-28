import { TSocketService } from "@bmg-esports/gjallarhorn-tokens";
import { inject, injectable } from "inversify";
import { SocketService } from "../services/socket";
import { logger } from "./logging";
import { getPersistent, writePersistent } from "./persistent";

@injectable()
export abstract class Backend<
  T extends Record<string, unknown> = Record<string, unknown>
> {
  public abstract identifier: symbol;

  @inject(TSocketService) protected socket: SocketService;

  protected logger = logger(this.constructor.name);

  public scopes: string[] = [];
  public state: T;

  private stateListeners: {
    i: number;
    initialized: boolean;
    lastValues: any[][];
    boundBackends: Set<Backend>;
  } = {
    i: 0,
    initialized: false,
    lastValues: [],
    boundBackends: new Set(),
  };

  constructor() {
    process.nextTick(() => {
      const { state, lastValues } = getPersistent(this.identifier.description);
      if (state) {
        this.state = state;
        this.stateListeners.lastValues = lastValues;
      } else {
        // Populate the initial lastValues.
        this._triggerStateListeners();
      }
      this.stateListeners.initialized = true;
      this._registerHandlers();
      if (state) this._onRestore();
    });
  }

  private _registerHandlers() {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
    methods.map((name) => {
      const prop = <unknown>this[<keyof this>name];
      if (typeof prop !== "function") return; // Skip non-methods.
      const path = `/backends/${this.identifier.description}/${name}`;
      this.socket.respond(
        path,
        async (...args) => {
          try {
            return await prop.bind(this)(...args);
          } catch (e) {
            this.logger.error(`${path} (${args.join(", ")})`);
            throw e;
          }
        },
        this.scopes
      );
    });
    this.socket.respond(
      `/backends/${this.identifier.description}/state`,
      (key: keyof T) => this.state[key],
      this.scopes
    ),
      this.socket.on(
        `/backends/${this.identifier.description}/state`,
        (key: keyof T, value: T[keyof T]) => {
          // Bug with TS. For some reason, this doesn't work, but
          // `const x: Partial<T> = {}; x[key] = value; this.setState(x);`
          // works fine.
          this.setState(<Partial<T>>{ [key]: value });
        },
        this.scopes
      );
  }

  /**
   * This method will be called when the backend has been restored after the
   * state values have been set. The objective is to enable things like
   * intervals and timeouts to be restored.
   */
  protected _onRestore() {
    /* */
  }

  /**
   * Update the state of this backend and broadcast it to all frontends.
   */
  protected setState(delta: Partial<T> | ((state: T) => Partial<T>)) {
    // We use nextTick to handle all synchronous state changes together.
    // As in, all the state changes made synchronously within a single
    // this.on handler will be treated together.
    if (typeof delta == "function") {
      delta = delta(this.state);
    }

    for (const key of Object.keys(delta) as (keyof T)[]) {
      if (delta[key] === undefined) {
        // Fun fact, undefined is not serializable >:(
        // So we just emit the event without args and the client interprets
        // that as undefined.
        this.socket.emit(
          `/backends/${this.identifier.description}/state/${String(key)}`
        );
      } else {
        this.socket.emit(
          `/backends/${this.identifier.description}/state/${String(key)}`,
          delta[key]
        );
      }
      this.state[key] = delta[key];
    }
    process.nextTick(() => this._triggerStateListeners());
  }

  /**
   * A simplified version of React hooks.
   */
  protected listeners() {
    // To be overridden by subclasses.
  }

  protected on(cb: () => void, deps: any[]) {
    const { lastValues, i, initialized } = this.stateListeners;
    if (initialized) {
      if (deps.some((newValue, j) => newValue !== (lastValues[i] ?? [])[j])) {
        // A value changed, call the callback.
        lastValues[i] = deps;
        cb();
      }
    } else {
      // It's the initialization run, we just store whatever dep values we have
      // TODO: This might have some weird bugs when it comes to multiple hooks.
      // Definitely revisit this and make sure it actually works.
      lastValues[i] = deps;
      process.nextTick(cb);
    }
    this.stateListeners.i++;
  }

  /**
   * Bind another backend to this backend's state. In other words, whenever this
   * backend's state changes, we also trigger the state listeners on the other
   * backend.
   */
  public bindDependent(other: Backend) {
    this.stateListeners.boundBackends.add(other);
  }

  private _triggerStateListeners() {
    this.stateListeners.i = 0;
    try {
      this.listeners();
    } catch (e) {
      this.logger.error("Synchronous error during state update.");
      throw e;
    }

    this.stateListeners.boundBackends.forEach((backend) =>
      backend._triggerStateListeners()
    );
  }

  public async _dumpState(path?: string) {
    await writePersistent(
      this.identifier.description,
      this.state,
      this.stateListeners.lastValues,
      path
    );
  }
}
