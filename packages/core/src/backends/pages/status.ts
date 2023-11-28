import { Backend } from "../../support/backend";
import { TStatusBackend } from "@bmg-esports/gjallarhorn-tokens";

export type State = {
  startGGRate: number;
  dbRate: number;
};

export class StatusBackend extends Backend<State> {
  identifier = TStatusBackend;

  state: State = {
    startGGRate: 0,
    dbRate: 0,
  };

  protected _onRestore(): void {
    this.setState({
      startGGRate: 0,
      dbRate: 0,
    });
  }

  private _recordRate(key: "startGGRate" | "dbRate") {
    this.setState({ [key]: this.state[key] + 1 });
    setTimeout(() => this.setState({ [key]: this.state[key] - 1 }), 60 * 1000);
  }

  recordDB() {
    this._recordRate("dbRate");
  }
  recordStartGG() {
    this._recordRate("startGGRate");
  }
}
