import { Set, SetSlot } from "../../@types/startgg";
import {
  DirtyState,
  Entrant,
  Player,
  PushButtonState,
} from "../../@types/types";
import {
  getCountryFlag,
  getLegendFull,
  getLegendHead,
  getLegendName,
  getLegendOffset,
  getLegendSplash,
  IMAGES,
  REGION_ID_TO_REGION,
  SLUG_TO_REGION,
} from "../../constants";
import { OutputService } from "../../services/output";
import { PlayerService } from "../../services/player";
import { StartGGService } from "../../services/startgg";
import { Backend } from "../../support/backend";
import { BackendError } from "../../support/errors";
import {
  TChallengerModeService,
  TGameBackend,
  TOutputService,
  TPlayerService,
  TStartGGService,
  TTournamentBackend,
} from "@bmg-esports/gjallarhorn-tokens";
import { inject } from "inversify";

import { TournamentBackend } from "../pages/tournament";
import { wrapPushButton } from "../../support/ui";
import { ChallengerModeService } from "../../services/challenger-mode";
import { GQLMatchSeries } from "../../@types/challengermode";

const emptyPlayer = (): Player => ({});
const emptyEntrant = (): Entrant => ({
  isLive: true,
  player1: emptyPlayer(),
  player2: emptyPlayer(),
});
export const emptyPostGame = () => ({
  deaths: 0,
  damageDealt: 0,
  damageTaken: 0,
  damageTeam: 0,
  playerName: "",
  playerSponsor: "",
  legend: "C:/data/legends/UNKNOWN.png",
  legendHead: "C:/data/heads/UNKNOWN.png",
  timeSpentInAirPercentage: 0,
  timeSpentOnGroundPercentage: 0,
  damagePerEngagement: 0,
  damageTakenPerStock: 0,
  moveAccuracyName: "",
  moveAccuracyPercentage: 0,
  moveAccuracyCount: 0,
  signatureAccuracy: "0",
  signatureCount: 0,
  lightAttackAccuracy: "0",
  lightAttackCount: 0,
  weapon1Damage: 0,
  weapon1Name: "",
  weapon2Damage: 0,
  weapon2Name: "",
  unarmedDamage: 0,
  weaponThrows: 0,
  dashesCount: 0,
  dodgesCount: 0,
  weapon1DamageTaken: 0,
  weapon2DamageTaken: 0,
  weapon1PercentageHeld: 0,
  weapon2PercentageHeld: 0,
  teamLightAttackCount: 0,
  teamLightAttackAccuracy: 0,
  teamSignatureCount: 0,
  teamSignatureAccuracy: 0,
  teamDamageDealt: 0,
  teamDamageTaken: 0,
  teamDamageTeam: 0,
  teamDeaths: 0,
  winner: false,
});

type State = {
  sets: (Set | GQLMatchSeries)[];
  setId?: number;
  matchSeriesId?: string;
  round: string;
  region: string;
  bracket: string;
  left: Entrant;
  right: Entrant;

  dirtyRoundState?: DirtyState;
  dirtyGameState?: DirtyState;

  pushFetchState?: PushButtonState;
  pushRoundState?: PushButtonState;
  pushGameState?: PushButtonState;
  isCm: boolean;
  entrantSize: number;
};

export class GameBackend extends Backend<State> {
  @inject(TStartGGService) private sgg: StartGGService;
  @inject(TChallengerModeService) private cm: ChallengerModeService;
  @inject(TPlayerService) private pService: PlayerService;
  @inject(TOutputService) private output: OutputService;

  identifier = TGameBackend;
  scopes = ["pages:tournament"];

  state: State = {
    sets: [],
    round: "",
    region: "",
    bracket: "Winners Bracket",
    isCm: false,
    left: emptyEntrant(),
    right: emptyEntrant(),
    entrantSize: 1,
  };

  constructor(@inject(TTournamentBackend) private t: TournamentBackend) {
    super();

    t.bindDependent(this);
  }

  protected listeners(): void {
    const { setId, matchSeriesId } = this.state;
    const { phaseGroupId, tournamentSlug } = this.t.state.sggTournament;
    const { roundNum, tournamentId } = this.t.state.cmTournament;
    const regionId =
      this.t.state.cmTournamentMeta?.settings.gameSessionSettings.Region;
    this.on(() => {
      if (!tournamentSlug) return;
      this.setState({ isCm: false });
      SLUG_TO_REGION.forEach((region, slugPart) => {
        if (tournamentSlug.includes(slugPart)) {
          this.setState({ region });
        }
      });
    }, [tournamentSlug]);

    this.on(() => {
      if (!tournamentId) return;
      this.setState({ isCm: true });
      REGION_ID_TO_REGION.forEach((region, id) => {
        if (regionId === id) {
          this.setState({ region });
          return;
        }
      });
    }, [tournamentId]);

    this.on(() => {
      if (phaseGroupId) this.loadSets();
    }, [phaseGroupId]);

    this.on(() => {
      if (roundNum) this.loadMatchSerieses();
    }, [roundNum]);

    this.on(() => {
      if (!setId) return this.setState({ round: "" });
      this.sgg
        .getSetById(setId)
        .then((set) => this.loadSet(set))
        .catch((e) => {
          if (e instanceof BackendError) throw e.nonFatal();
          throw e;
        });
    }, [setId]);

    this.on(() => {
      if (!matchSeriesId) return this.setState({ round: "" });
      this.cm
        .getMatchSeriesById(matchSeriesId)
        .then((matchSeries) => this.loadMatchSeries(matchSeries))
        .catch((e) => {
          if (e instanceof BackendError) throw e.nonFatal();
          throw e;
        });
    }, [matchSeriesId]);
  }

  async loadSets() {
    await wrapPushButton(
      async () => {
        const { phaseGroupId } = this.t.state.sggTournament;
        if (!phaseGroupId) {
          this.setState({ sets: [], setId: undefined });
          throw new BackendError("No active phase group!", "Game");
        }
        try {
          await this.sgg.getSetsInPhaseGroup(phaseGroupId).then((sets) =>
            this.setState({
              sets,
              entrantSize: this.t.state.sggTournament.entrantSize,
            })
          );
        } catch (e) {
          if (e instanceof BackendError) throw e.nonFatal();
          throw e;
        }
      },
      (pushFetchState) => this.setState({ pushFetchState })
    );
  }

  async loadMatchSerieses() {
    await wrapPushButton(
      async () => {
        const { tournamentId, stageNum, bracketType } =
          this.t.state.cmTournament;
        if (!bracketType) {
          this.setState({ sets: [], matchSeriesId: undefined });
          throw new BackendError("No active round!", "Game");
        }
        try {
          await this.cm
            .getMatchSeriesesInBracket(tournamentId, stageNum, bracketType)
            .then((matchSerieses: GQLMatchSeries[]) => {
              this.setState({
                sets: matchSerieses,
                entrantSize: this.t.state.cmTournament.entrantSize,
              });
            });
        } catch (e) {
          if (e instanceof BackendError) throw e.nonFatal();
          throw e;
        }
      },
      (pushFetchState) => this.setState({ pushFetchState })
    );
  }

  private async loadSet(set: Set) {
    if (!set) throw new BackendError("Could not find set information.", "Game");

    this.setState({
      round: this.t.getBracketRound(set),
      bracket: set.round > -1 ? "Winners Bracket" : "Elimination Bracket",
    });
    await Promise.all([
      this.loadSlot("left", set.slots[0]),
      this.loadSlot("right", set.slots[1]),
    ]);
  }

  private async loadMatchSeries(matchSeries: GQLMatchSeries) {
    if (!matchSeries) {
      throw new BackendError("Could not find set information.", "Game");
    }

    this.setState({
      round: this.t.getRoundName(),
      bracket: this.t.getBracketName(),
    });
    await Promise.all([
      this.loadMatch("left", 0, matchSeries),
      this.loadMatch("right", 1, matchSeries),
    ]);
  }

  private async loadSlot(side: "left" | "right", slot: SetSlot) {
    const { entrant, standing } = slot;
    if (!entrant) {
      return this.setState({
        [side]: emptyEntrant(),
      });
    }

    const players = await this.pService.parseEntrant(entrant, false);
    const score = standing?.stats?.score?.value || 0;

    this.setState({
      [side]: {
        isLive: true,
        id: entrant.id,
        score,
        ...players,
      },
    });
  }

  private async loadMatch(
    side: "left" | "right",
    i: number,
    matchSeries: GQLMatchSeries
  ) {
    const lineup = matchSeries.lineups[i];
    const standing = matchSeries.results.lineupResults[i];

    if (!lineup) {
      return this.setState({
        [side]: emptyEntrant(),
      });
    }

    const players = await this.pService.parseLineup(lineup);
    const score = standing?.score || 0;

    this.setState({
      [side]: {
        isLive: true,
        id: lineup.members.map((member) => member.user.userId).join("_"),
        score,
        ...players,
      },
    });
  }

  public async pushRound() {
    await wrapPushButton(
      async () => {
        await this.output.writeJSON(
          "round.json",
          [this.state.round, this.state.bracket, this.state.region].map(
            (text) => ({
              text: text || "",
            })
          )
        );
      },
      (pushRoundState) => this.setState({ pushRoundState })
    );
  }

  public async pushGame() {
    await wrapPushButton(
      async () => {
        const { left, right } = this.state;
        const scores = [left.score, right.score].map((s) =>
          s === -1 ? "DQ" : String(s || 0)
        );

        const getLegendFields = (player: Player) => {
          let fields = {
            face: getLegendHead(player?.legend),
            legend: getLegendFull(player?.legend),
            ...getLegendOffset(player?.legend),
            splash: getLegendSplash(player?.legend),
            legendName: getLegendName(player?.legend),
          };
          return fields;
        };

        const output = [
          left.player1,
          right.player1,
          left.player2,
          right.player2,
        ]
          .map(async (player, i) => {
            const pr = await this.pService.getPR(player?.id);

            return {
              score: scores[i % 2],
              name: player?.name || "",
              country: getCountryFlag(player?.country),
              ...getLegendFields(player),
              sponsor: player?.sponsor || "",
              sponsorPath: player?.sponsor ? IMAGES.sponsor : IMAGES.blank,
              twitter: player?.twitter || "",
              twitch: player?.twitch || "",
              pr: pr?.pr || "-",
            };
          })
          .concat(
            [left, right].map(async (entrant, i) => ({
              score: scores[i % 2],
              name: [entrant.player1?.name, entrant.player2?.name]
                .filter((a) => a)
                .join("/"),
              country: "",
              face: "",
              legend: "",
              splash: "",
              legendName: "",
              sponsor: "",
              sponsorPath: "",
              twitter: "",
              twitch: "",
              pr: "",
            }))
          );
        await this.output.writeJSON("game.json", await Promise.all(output));

        const live = [left.player1, right.player1];

        if (left.player2?.id || right.player2?.id) {
          live.push(left.player2, right.player2);
        }
        await this.output.writeJSON(
          "live/game.json",
          live.map((player, i) => ({
            score: scores[i % 2],
            id: player?.id || null,
            name: player?.name || "",
            ...getLegendFields(player),
          }))
        );
      },
      (pushGameState) => this.setState({ pushGameState })
    );
  }
}
