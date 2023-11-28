import { OutputService } from "../../services/output";
import { Backend } from "../../support/backend";
import {
  TLowerThirdsBackend,
  TOutputService,
} from "@bmg-esports/gjallarhorn-tokens";
import { inject } from "inversify";
import { DirtyState, PushButtonState } from "../../@types/types";
import { wrapPushButton } from "../../support/ui";

export type LowerThirdsData = {
  id?: string;
  title?: string;
  body?: string;
};

type State = {
  type: string;
  twitter: LowerThirdsData;
  twitch: LowerThirdsData;
  message: LowerThirdsData;
  champion: LowerThirdsData;
  preshow: LowerThirdsData;

  twitterPresets: LowerThirdsData[];
  twitchPresets: LowerThirdsData[];
  messagePresets: LowerThirdsData[];
  championPresets: LowerThirdsData[];
  preshowPresets: LowerThirdsData[];

  twitterDirtyState?: DirtyState;
  twitchDirtyState?: DirtyState;
  messageDirtyState?: DirtyState;
  championDirtyState?: DirtyState;
  preshowDirtyState?: DirtyState;

  twitterPushState?: PushButtonState;
  twitchPushState?: PushButtonState;
  messagePushState?: PushButtonState;
  championPushState?: PushButtonState;
  preshowPushState?: PushButtonState;
};

export class LowerThirdsBackend extends Backend<State> {
  @inject(TOutputService) private output: OutputService;

  identifier = TLowerThirdsBackend;
  scopes = ["pages:tournament"];

  state: State = {
    type: "twitter",

    twitter: {},
    twitch: {},
    message: {},
    champion: {},
    preshow: {},

    twitterPresets: [],
    twitchPresets: [],
    messagePresets: [],
    championPresets: [],
    preshowPresets: [],
  };

  async push() {
    wrapPushButton(
      async () => {
        const fp = ["lower-thirds", `${this.state.type}.json`];
        const data = this.state[this.state.type as "twitter"];

        await this.output.writeJSON(fp, {
          title: data.title || "",
          body: data.body || "",
        });
      },
      (state) => {
        const k = `${this.state.type}PushState`;
        this.setState({ [k]: state });
      }
    );
  }
}
