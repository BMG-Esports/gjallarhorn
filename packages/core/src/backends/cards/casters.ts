import { DirtyState, PushButtonState } from "../../@types/types";
import { OutputService } from "../../services/output";
import { Backend } from "../../support/backend";
import {
  TCastersBackend,
  TOutputService,
} from "@bmg-esports/gjallarhorn-tokens";
import { inject } from "inversify";
import { wrapPushButton } from "../../support/ui";

export type Caster = {
  caster?: string;
  twitter?: string;
  pronouns?: string;
};

type State = {
  casters: Caster[];
  dirtyState?: DirtyState;
  pushState?: PushButtonState;
};

export class CastersBackend extends Backend<State> {
  @inject(TOutputService) private output: OutputService;

  identifier = TCastersBackend;
  scopes = ["pages:tournament"];

  state: State = {
    casters: [{}, {}, {}, {}],
  };

  public async write() {
    await wrapPushButton(
      async () => {
        await this.output.writeJSON(
          "casters.json",
          this.state.casters.map((c) => ({
            caster: c.caster ?? "",
            twitter: c.twitter ?? "",
            pronouns: c.pronouns ?? "",
          }))
        );
      },
      (pushState) => this.setState({ pushState })
    );
  }
}
