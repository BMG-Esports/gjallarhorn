import { OutputService } from "../../services/output";
import { Backend } from "../../support/backend";
import {
  TOutputService,
  TTickerBackend,
} from "@bmg-esports/gjallarhorn-tokens";
import { inject } from "inversify";
import { DirtyState, PushButtonState } from "../../@types/types";
import { wrapPushButton } from "../../support/ui";

export type TickerEntry = {
  id?: string;
  subject?: string;
  ticker?: string;
};

type State = {
  entries: TickerEntry[];
  i: number;
  autoShuffle: boolean;

  dirtyState?: DirtyState;

  pushState?: PushButtonState;
};

export class TickerBackend extends Backend<State> {
  @inject(TOutputService) private output: OutputService;

  identifier = TTickerBackend;
  state: State = {
    entries: [],
    i: 0,
    autoShuffle: false,
  };

  private shuffleTimeout: NodeJS.Timeout;

  protected _onRestore(): void {
    this.state.autoShuffle && this.shuffle();
  }

  protected listeners(): void {
    this.on(
      () =>
        this.state.autoShuffle
          ? this.shuffle()
          : clearTimeout(this.shuffleTimeout),
      [this.state.autoShuffle]
    );
  }

  async push() {
    try {
      await wrapPushButton(
        async () => {
          await this.output.writeJSON(
            "ticker.json",
            this.state.entries.map((e) => ({
              subject: e.subject || "",
              ticker: e.ticker || "",
            }))
          );
        },
        (pushState) => this.setState({ pushState })
      );
    } catch (e) {
      throw e;
    }
  }

  async addEntry() {
    const { i, entries } = this.state;
    this.setState({
      entries: [...entries, { id: String(i) }],
      i: i + 1,
    });
  }

  async shuffle() {
    clearTimeout(this.shuffleTimeout);
    try {
      this.setState({
        entries: this.state.entries
          .map((v) => ({ v, sort: Math.random() }))
          .sort((a, b) => a.sort - b.sort)
          .map(({ v }) => v),
      });
      await this.push();

      if (this.state.autoShuffle) {
        this.shuffleTimeout = setTimeout(() => this.shuffle(), 5 * 60 * 1000);
      }
    } catch (e) {
      this.setState({ autoShuffle: false });
      throw e;
    }
  }
}
