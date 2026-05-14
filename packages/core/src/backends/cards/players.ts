import { DirtyState, Entrant, PushButtonState } from "../../@types/types";
import { Entrant as SEntrant } from "../../@types/startgg";
import {
  getCountryFlag,
  getLegendFull,
  getLegendHead,
  getLegendName,
  getLegendOffset,
  getLegendSplash,
  IMAGES,
} from "../../constants";
import { OutputService } from "../../services/output";
import { PlayerService } from "../../services/player";
import { StartGGService } from "../../services/startgg";
import { Backend } from "../../support/backend";
import { BackendError } from "../../support/errors";
import { inject } from "inversify";
import { TournamentBackend } from "../pages/tournament";
import {
  TChallengerModeService,
  TOutputService,
  TPlayersBackend,
  TPlayerService,
  TStartGGService,
  TTournamentBackend,
} from "@bmg-esports/gjallarhorn-tokens";
import { wrapPushButton } from "../../support/ui";
import { ChallengerModeService } from "../../services/challenger-mode";
import {
  GQLTournamentLineup,
  GQLUserProfile,
} from "../../@types/challengermode";

type State = {
  leftScore: number;
  rightScore: number;

  left: Entrant;
  right: Entrant;

  dirtyState?: DirtyState;
  pushPlayersState?: PushButtonState;
  entrantSize: number;
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export class PlayersBackend extends Backend<State> {
  @inject(TStartGGService) private sgg: StartGGService;
  @inject(TPlayerService) private pService: PlayerService;
  @inject(TOutputService) private output: OutputService;
  @inject(TChallengerModeService) private cm: ChallengerModeService;

  identifier = TPlayersBackend;
  scopes = ["pages:tournament"];

  state: State = {
    leftScore: 0,
    rightScore: 0,
    left: {
      isLive: true,
      player1: {},
      player2: {},
    },
    right: {
      isLive: true,
      player1: {},
      player2: {},
    },
    entrantSize: 1,
  };

  constructor(
    @inject(TTournamentBackend) private _tournament: TournamentBackend
  ) {
    super();
    _tournament.bindDependent(this);
  }

  protected listeners(): void {
    this.on(() => {
      this.loadEntrant("left");
    }, [this.state.left?.id]);

    this.on(() => {
      this.loadEntrant("right");
    }, [this.state.right?.id]);

    this.on(
      () => this.loadMatchup(),
      [this.state.right.player1?.id, this.state.left.player2?.id]
    );

    this.on(() => {
      this.setState({
        left: { isLive: true, player1: {}, player2: {} },
        right: { isLive: true, player1: {}, player2: {} },
        entrantSize: this._tournament.state.sggTournament.entrantSize,
      });
    }, [this._tournament.state.sggTournament.eventId]);

    this.on(() => {
      this.setState({
        left: { isLive: true, player1: {}, player2: {} },
        right: { isLive: true, player1: {}, player2: {} },
        entrantSize: this._tournament.state.cmTournament.entrantSize,
      });
    }, [
      this._tournament.state.cmTournament.tournamentId,
      this._tournament.state.cmTournament.entrantSize,
    ]);
  }

  private async loadEntrant(side: "left" | "right") {
    const e = this.state[side];
    if (!e.isLive) {
      return;
    }

    if (!e.id) {
      return this.setState({
        [side]: { isLive: true, player1: {}, player2: {} },
        [side + "Score"]: 0,
      });
    }

    if (e.player1?.id) {
      return; // Already populated.
    }

    let entrant: Entrant;
    if (this._tournament.state.isChallengerMode) {
      let cmUser: GQLTournamentLineup;
      try {
        cmUser = await this.cm.getEntrantById(
          e.id as string,
          this._tournament.state.cmTournament.tournamentId
        );
      } catch (e) {
        if (e instanceof BackendError) throw e.nonFatal();
        throw e;
      }
      entrant = await this.pService.parseLineup(cmUser);
    } else {
      let sEntrant: SEntrant;
      try {
        sEntrant = await this.sgg.getEntrantById(e.id as number);
      } catch (e) {
        if (e instanceof BackendError) throw e.nonFatal();
        throw e;
      }
      entrant = await this.pService.parseEntrant(sEntrant);
    }

    this.setState({
      [side]: { id: e.id, isLive: true, ...entrant },
    });
  }

  private async loadMatchup() {
    const { left, right } = this.state;
    const [leftScore, rightScore] = await this.pService.getMatchup(left, right);
    this.setState({
      leftScore,
      rightScore,
    });
  }

  public async pushPlayers() {
    const { left, right, leftScore, rightScore } = this.state;
    await wrapPushButton(
      async () => {
        const scores = [leftScore, rightScore];
        const players = [
          left.player1,
          right.player1,
          left.player2,
          right.player2,
        ];

        const prs = await Promise.all(
          players.map((p) => this.pService.getPR(p?.id))
        );

        const winrate = await Promise.all(
          players.map((p) => this.pService.getPlayerWinrate(p?.id))
        );

        await this.output.writeJSON(
          "players.json",
          players.map((player, i) => {
            return {
              name: player?.name || "",
              sponsor: player?.sponsor || "",
              sponsorPath: player?.sponsor ? IMAGES.sponsor : IMAGES.blank,
              country: getCountryFlag(player?.country),
              twitter: player?.twitter || "",
              twitch: player?.twitch || "",
              face: getLegendHead(player?.legend),
              legend: getLegendFull(player?.legend),
              ...getLegendOffset(player?.legend),
              splash: getLegendSplash(player?.legend),
              legendName: getLegendName(player?.legend),
              pr: String(prs[i]?.pr || "-"),
              region: String(prs[i]?.region || ""),
              earnings: moneyFormatter.format(prs[i]?.earnings || 0),
              top8: String(prs[i]?.top8 || 0),
              top32: String(prs[i]?.top32 || 0),
              gold: String(prs[i]?.gold || 0),
              silver: String(prs[i]?.silver || 0),
              bronze: String(prs[i]?.bronze || 0),
              lifetimeScore: String(scores[i % 2] || 0),
              winrate: String(winrate[i] || "-"),
            };
          })
        );
      },
      (pushState) => this.setState({ pushPlayersState: pushState })
    );
  }
}
