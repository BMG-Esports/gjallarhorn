import { Backend } from "./support/backend";
import { container } from "./support/di-container";
import { inject } from "inversify";
import { ErrorService } from "./services/error";
import { BackendError } from "./support/errors";
import _ from "lodash";
import * as tokens from "@bmg-esports/gjallarhorn-tokens";
const { TErrorService } = tokens;
export type Level = "error" | "info";

export type Message = {
  message: string;
  level: string;
};

export type State = {
  status: {
    fatal: boolean;
  };
};

export class System extends Backend<State> {
  identifier = tokens.TSystem;

  backends = _.keyBy(
    Object.values(tokens)
      .map((token) => {
        if (token === tokens.TSystem) return;
        // this.logger.info(`Initializing ${backend.name}...`);
        return container.get(token);
      })
      .filter((inst) => inst instanceof Backend),
    "identifier"
  ) as { [token: symbol]: Backend };

  state: State = {
    status: {
      fatal: false,
    },
  };

  constructor(@inject(TErrorService) errors: ErrorService) {
    super();

    process.on("unhandledRejection", (e) => {
      // Convert unhandled promise errors into uncaught exceptions.
      throw e;
    });
    process.on("uncaughtException", this._handle.bind(this));
    errors.errors$.subscribe(this._handle.bind(this));
  }

  private _handle(e: any) {
    this.logger.error(e);

    if (e instanceof BackendError) {
      // The message has some additional info we can use to print a nicer
      // user-facing error message.
      this._reportError(e.message, e.source, e.fatal);
      if (e.suberror) this.logger.error(e.suberror);
    } else if (typeof e === "string") {
      // A string error
      this._reportError(e, "System", true);
    } else {
      // A completely unknown error.
      this._reportError(e.message, "System", true);
    }
  }

  private _reportError(
    message?: string,
    source?: string,
    fatal = false,
    discord = false
  ) {
    this.socket.emit("/shell/error", message || null, source || null, fatal);
    if (fatal) {
      this.setState({ status: { ...this.state.status, fatal: true } });
      const path = new Date().toISOString().replace(/[^a-z0-9]/gi, "_");
      this._dumpState(path).then(() => {
        this.logger.error("Dumped system state to " + path);
      });
    }
  }

  public async markNonFatal() {
    this.setState({ status: { ...this.state.status, fatal: false } });
  }

  /**
   * Cold restart the app.
   * (Loses all state and just reboots.)
   */
  public async coldRestart() {
    this.logger.warn("Got request to cold restart.");
    process.exit(1);
  }

  public async _dumpState(path?: string) {
    await Promise.all([
      ...Object.getOwnPropertySymbols(this.backends).map((token) =>
        this.backends[token]._dumpState(path)
      ),
      super._dumpState(path),
    ]);
    await new Promise((r) => setTimeout(r, 1000));
  }
}
