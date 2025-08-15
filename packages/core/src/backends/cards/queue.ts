import { DirtyState, Entrant, PushButtonState } from "../../@types/types";
import { Backend } from "../../support/backend";
import { inject } from "inversify";
import _ from "lodash";
import { Set, StreamQueue } from "../../@types/startgg";
import { StartGGService } from "../../services/startgg";
import { PlayerService } from "../../services/player";
import { OutputService } from "../../services/output";
import {
  getCountryFlag,
  getLegendFull,
  getLegendHead,
  getLegendOffset,
  IMAGES,
} from "../../constants";
import { BackendError } from "../../support/errors";
import {
  TChallengerModeService,
  TOutputService,
  TPlayerService,
  TQueueBackend,
  TStartGGService,
  TTournamentBackend,
} from "@bmg-esports/gjallarhorn-tokens";
import { TournamentBackend } from "../pages/tournament";
import { wrapPushButton } from "../../support/ui";
import { ChallengerModeService } from "../../services/challenger-mode";
import {
  GQLBroadcast,
  GQLMatchSeries,
  GQLMatchSeriesState,
  GQLMatchSeriesStream,
} from "../../@types/challengermode";

const entrantName = (e: Entrant) =>
  [e?.player1?.name, e?.player2?.name].filter((a) => a).join("/");

export type QueueSet = {
  id?: number | string;
  identifier?: string;
  state?: number;
  customRound?: boolean;
  customScore?: boolean;
  customStartTime?: boolean;
  score?: string;
  round?: string;
  left?: Entrant;
  right?: Entrant;
  leftScore?: number;
  rightScore?: number;
  winnerIdx?: number; // 0 = left, 1 = right
  startTime?: string;
};

type State = {
  queue: QueueSet[];
  queues: string[];
  activeQueue?: string;
  startIndex: number;

  autoFetch: boolean;

  dirtyState?: DirtyState;

  pushLoadState?: PushButtonState;
  pushFetchState?: PushButtonState;
  pushQueueState?: PushButtonState;
  entrantSize?: number;
};

export class QueueBackend extends Backend<State> {
  @inject(TStartGGService) private sgg: StartGGService;
  @inject(TPlayerService) private pService: PlayerService;
  @inject(TOutputService) private output: OutputService;
  @inject(TChallengerModeService) private cm: ChallengerModeService;

  identifier = TQueueBackend;
  state: State = {
    queue: [],
    queues: [],
    startIndex: 0,
    autoFetch: false,
    entrantSize: 1,
  };

  private fetchTimeout: NodeJS.Timeout;

  constructor(@inject(TTournamentBackend) private t: TournamentBackend) {
    super();

    t.bindDependent(this);
  }

  protected _onRestore(): void {
    this.state.autoFetch && this.fetch();
  }

  protected listeners(): void {
    this.on(() => {
      if (this.state.autoFetch) {
        this.fetch();
      } else {
        clearTimeout(this.fetchTimeout);
      }
    }, [this.state.autoFetch]);

    this.on(
      () => this.loadQueues(),
      [this.t.state.sggTournament.tournamentSlug]
    );
  }

  async loadQueues() {
    await wrapPushButton(
      async () => {
        let queues: (StreamQueue | GQLBroadcast)[];
        try {
          queues = await this.t.getStreamQueues();
        } catch (e) {
          if (e instanceof BackendError) throw e.nonFatal();
          throw e;
        }
        this.setState({
          queues: this.t.state.isChallengerMode
            ? queues
                .filter((q: GQLBroadcast) => q.streams.length > 0)
                .map((q: GQLBroadcast) => q?.name)
            : queues
                .map((q: StreamQueue) =>
                  (q?.stream?.streamName || "").toLowerCase()
                )
                .filter((n) => n),
          entrantSize: this.t.state.isChallengerMode
            ? this.t.state.cmTournament.entrantSize
            : this.t.state.sggTournament.entrantSize,
        });
      },
      (pushLoadState) => this.setState({ pushLoadState })
    );
  }

  async fetch() {
    clearTimeout(this.fetchTimeout);
    try {
      await wrapPushButton(
        async () => {
          let queues: (StreamQueue | GQLBroadcast)[];
          try {
            queues = await this.t.getStreamQueues();
          } catch (e) {
            if (e instanceof BackendError) throw e.nonFatal();
            throw e;
          }
          const queue = this.t.state.isChallengerMode
            ? queues.find(
                (q: GQLBroadcast) =>
                  (q?.name || "").toLowerCase() ===
                  this.state.activeQueue?.toLowerCase()
              )
            : queues.find(
                (q: StreamQueue) =>
                  (q?.stream?.streamName || "").toLowerCase() ===
                  this.state.activeQueue?.toLowerCase()
              );
          if (!queue)
            throw new BackendError("Couldn't find stream queue!", "Queue");

          await this.populateQueue(
            this.t.state.isChallengerMode
              ? ((queue as GQLBroadcast).streams as GQLMatchSeriesStream[]).map(
                  (s) => s.matchSeries
                )
              : (queue as StreamQueue).sets
          );
        },
        (pushFetchState) => this.setState({ pushFetchState })
      );

      if (this.state.autoFetch) {
        this.fetchTimeout = setTimeout(() => this.fetch(), 60 * 1000);
      }
    } catch (e) {
      this.setState({ autoFetch: false });
      throw e;
    }
  }

  async clear() {
    this.setState({
      queue: [],
      startIndex: 0,
    });
  }

  /**
   * Given the sets from the stream queue, update the local array of queue sets.
   */
  private async populateQueue(sets: (Set | GQLMatchSeries)[]) {
    const { queue } = this.state;
    let { startIndex } = this.state;
    const setLookup = _.keyBy(sets, "id");
    const qsLookup = _.keyBy(queue, "id");
    const localOnly = queue.filter((qs) => !setLookup[qs.id]);

    // Fetch incomplete and local sets information
    let localSetInfo: { [id: string]: Set | GQLMatchSeries };
    try {
      localSetInfo = _.keyBy(
        await Promise.all(
          localOnly
            .filter((qs) => qs.state !== 3)
            .map((qs) =>
              this.t.state.isChallengerMode
                ? this.cm.getMatchSeriesById(qs.id! as string)
                : this.sgg.getSetById(qs.id! as number)
            )
        ),
        "id"
      );
    } catch (e) {
      if (e instanceof BackendError) throw e.nonFatal();
      throw e;
    }

    const newQueue = await Promise.all([
      ...localOnly
        .filter((qs) => qs.state === 3 || localSetInfo[qs.id]?.state === 3)
        .map((qs) =>
          this.t.state.isChallengerMode
            ? this.updateQueueSetFromCm(
                qs,
                localSetInfo[qs.id] as GQLMatchSeries
              )
            : this.updateQueueSetFromSgg(qs, localSetInfo[qs.id] as Set)
        ), // Only keep complete.
      ...sets.map((set) =>
        this.t.state.isChallengerMode
          ? this.updateQueueSetFromCm(qsLookup[set.id], set as GQLMatchSeries)
          : this.updateQueueSetFromSgg(qsLookup[set.id], set as Set)
      ),
    ]);

    if (startIndex > newQueue.length - 1) startIndex = newQueue.length - 1;

    this.setState({ queue: newQueue, startIndex });
  }

  /**
   * Update a given queue set using the information from start.gg, careful to
   * not overwrite any operator-modified fields.
   */
  private async updateQueueSetFromSgg(qs: QueueSet, set?: Set) {
    const entrantIds = set?.slots?.map((s) => s?.entrant?.id) || [];
    const newQS: QueueSet = {
      ...qs,
      id: set?.id || qs?.id,
      identifier: set?.identifier || qs?.identifier,
      state: set?.state || qs?.state,
      winnerIdx: set?.winnerId
        ? entrantIds.indexOf(set.winnerId)
        : qs?.winnerIdx,
    };

    if (set) {
      newQS.leftScore = set.slots?.[0]?.standing?.stats?.score?.value || 0;
      newQS.rightScore = set.slots?.[1]?.standing?.stats?.score?.value || 0;
    }

    if (!qs?.customRound) {
      newQS.round = qs?.round;

      if (set) {
        let r = this.t.getBracketRound(set);
        if (r !== "Grand Final")
          r = [set.round > -1 ? "Winners" : "Elimination", r].join(" ");
        newQS.round = r;
      }
    }
    if (!qs?.customScore) {
      let score = qs?.score;
      if (set) {
        score =
          set.slots?.[0]?.standing?.stats?.score?.value ||
          set.slots?.[1]?.standing?.stats?.score?.value
            ? `${set.slots?.[0]?.standing?.stats?.score?.value || 0} - ${
                set.slots?.[1]?.standing?.stats?.score?.value || 0
              }`
            : undefined;
      }
      newQS.score = score;
    }
    if (!qs?.customStartTime) {
      newQS.startTime = qs?.startTime;
      if (set?.startAt) {
        newQS.startTime = new Date(set.startAt * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    if (set) {
      if (!set?.slots?.[0]?.entrant && qs?.left?.id) newQS.left = undefined;
      if (
        set?.slots?.[0]?.entrant &&
        set.slots[0].entrant.id !== qs?.left?.id
      ) {
        newQS.left = {
          id: set.slots[0].entrant.id,
          ...(await this.pService.parseEntrant(set.slots[0].entrant)),
        };
      }
      if (!set?.slots?.[1]?.entrant && qs?.right?.id) newQS.right = undefined;
      if (
        set?.slots?.[1]?.entrant &&
        set.slots[1].entrant.id !== qs?.right?.id
      ) {
        newQS.right = {
          id: set.slots[1].entrant.id,
          ...(await this.pService.parseEntrant(set.slots[1].entrant)),
        };
      }
    }

    return newQS;
  }

  private async updateQueueSetFromCm(qs: QueueSet, ms?: GQLMatchSeries) {
    const newQS: QueueSet = {
      ...qs,
      id: ms?.id || qs?.id,
      identifier: String(ms?.ordinal) || qs?.identifier,
      state: ms?.state === GQLMatchSeriesState.COMPLETED ? 3 : 0 || qs?.state,
      winnerIdx: ms?.results.final
        ? ms?.results.lineupResults.reduce(
            (maxIdx, curr, i, arr) =>
              curr.score > arr[maxIdx].score ? i : maxIdx,
            0
          )
        : qs?.winnerIdx,
    };

    if (ms) {
      const aggregateScores: [number, number] = [0, 0];

      ms.matches.forEach((match) =>
        match.results.lineupResults.forEach(
          (result) =>
            (aggregateScores[result.lineupNumber] += result.score ?? 0)
        )
      );
      newQS.leftScore = aggregateScores[0] || 0;
      newQS.rightScore = aggregateScores[1] || 0;
    }

    if (!qs?.customRound) {
      newQS.round = qs?.round;

      // if (ms) {
      //   let r = this.t.getActuallyGoodRound(ms);
      //   if (r !== "Grand Final") {
      //     r = [ms.round > -1 ? "Winners" : "Elimination", r].join(" ");
      //   }
      //   newQS.round = r;
      // }
    }
    if (!qs?.customScore) {
      let score = qs?.score;
      if (ms) {
        const aggregateScores: [number, number] = [0, 0];

        ms.matches.forEach((match) =>
          match.results.lineupResults.forEach(
            (result) =>
              (aggregateScores[result.lineupNumber] += result.score ?? 0)
          )
        );
        score =
          aggregateScores[0] || aggregateScores[1]
            ? `${aggregateScores[0] || 0} - ${aggregateScores[1] || 0}`
            : undefined;
      }
      newQS.score = score;
    }
    if (!qs?.customStartTime) {
      newQS.startTime = qs?.startTime;
      if (ms?.startedAt) {
        newQS.startTime = new Date(ms.startedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    if (ms) {
      if (!ms?.lineups[0]?.members && qs?.left?.id) newQS.left = undefined;
      if (
        ms?.lineups[0]?.members &&
        ms?.lineups[0]?.members
          .map((member) => member.user.userId)
          .join("_") !== qs?.left?.id
      ) {
        const id = ms?.lineups[0]?.members
          .map((member) => member.user.userId)
          .join("_");
        newQS.left = {
          id,
          ...(await this.pService.parseLineup(ms.lineups[0])),
        };
      }
      if (!ms?.lineups[1]?.members && qs?.left?.id) newQS.right = undefined;
      if (
        ms?.lineups[1]?.members &&
        ms?.lineups[1]?.members
          .map((member) => member.user.userId)
          .join("_") !== qs?.right?.id
      ) {
        const id = ms?.lineups[1]?.members
          .map((member) => member.user.userId)
          .join("_");
        newQS.right = {
          id,
          ...(await this.pService.parseLineup(ms.lineups[1])),
        };
      }
    }

    return newQS;
  }

  async push() {
    const { queue, startIndex } = this.state;
    await wrapPushButton(
      async () => {
        const queueSets = queue.slice(startIndex, startIndex + 8);
        const render = await Promise.all(
          queueSets
            .concat(
              Array(8 - queueSets.length)
                .fill(null)
                .map(() => ({}))
            )
            .map(async (qs) => {
              const prs = await Promise.all(
                [
                  qs.left?.player1?.id,
                  qs.left?.player2?.id,
                  qs.right?.player1?.id,
                  qs.right?.player2?.id,
                ].map((id) => this.pService.getPR(id))
              );
              return {
                score: qs.score || "vs",
                round: qs.round || "",
                startTime: qs.startTime || "",
                "entrant1.name": entrantName(qs.left) || "TBD",
                "entrant1.score": qs.leftScore || 0,
                "entrant1.1.name": qs.left?.player1?.name || "TBD",
                "entrant1.1.sponsor": qs.left?.player1?.sponsor || "",
                "entrant1.1.sponsorPath": qs.left?.player1?.sponsor
                  ? IMAGES.sponsor
                  : IMAGES.blank,
                "entrant1.1.country": getCountryFlag(qs.left?.player1?.country),
                "entrant1.1.face": getLegendHead(qs.left?.player1?.legend),
                "entrant1.1.legend": getLegendFull(qs.left?.player1?.legend),
                ...getLegendOffset(qs.left?.player1?.legend, "entrant1.1"),
                "entrant1.1.pr": String(prs[0]?.pr || "-"),
                "entrant1.1.region": String(prs[0]?.region || ""),
                "entrant1.1.winner":
                  qs.winnerIdx === 0 ? IMAGES.winner : IMAGES.default,

                "entrant1.2.name": qs.left?.player2?.name || "TBD",
                "entrant1.2.sponsor": qs.left?.player2?.sponsor || "",
                "entrant1.2.sponsorPath": qs.left?.player2?.sponsor
                  ? IMAGES.sponsor
                  : IMAGES.blank,
                "entrant1.2.country": getCountryFlag(qs.left?.player2?.country),
                "entrant1.2.face": getLegendHead(qs.left?.player2?.legend),
                "entrant1.2.legend": getLegendFull(qs.left?.player2?.legend),
                ...getLegendOffset(qs.left?.player2?.legend, "entrant1.2"),
                "entrant1.2.pr": String(prs[1]?.pr || "-"),
                "entrant1.2.region": String(prs[1]?.region || ""),
                "entrant1.2.winner":
                  qs.winnerIdx === 0 ? IMAGES.winner : IMAGES.default,
                "entrant2.name": entrantName(qs.right) || "TBD",
                "entrant2.score": qs.rightScore || 0,
                "entrant2.1.name": qs.right?.player1?.name || "TBD",
                "entrant2.1.sponsor": qs.right?.player1?.sponsor || "",
                "entrant2.1.sponsorPath": qs.right?.player1?.sponsor
                  ? IMAGES.sponsor
                  : IMAGES.blank,
                "entrant2.1.country": getCountryFlag(
                  qs.right?.player1?.country
                ),
                "entrant2.1.face": getLegendHead(qs.right?.player1?.legend),
                "entrant2.1.legend": getLegendFull(qs.right?.player1?.legend),
                ...getLegendOffset(qs.right?.player1?.legend, "entrant2.1"),
                "entrant2.1.pr": String(prs[2]?.pr || "-"),
                "entrant2.1.region": String(prs[2]?.region || ""),
                "entrant2.1.winner":
                  qs.winnerIdx === 1 ? IMAGES.winner : IMAGES.default,

                "entrant2.2.name": qs.right?.player2?.name || "TBD",
                "entrant2.2.sponsor": qs.right?.player2?.sponsor || "",
                "entrant2.2.sponsorPath": qs.right?.player2?.sponsor
                  ? IMAGES.sponsor
                  : IMAGES.blank,
                "entrant2.2.country": getCountryFlag(
                  qs.right?.player2?.country
                ),
                "entrant2.2.face": getLegendHead(qs.right?.player2?.legend),
                "entrant2.2.legend": getLegendFull(qs.right?.player2?.legend),
                ...getLegendOffset(qs.right?.player2?.legend, "entrant2.2"),
                "entrant2.2.pr": String(prs[3]?.pr || "-"),
                "entrant2.2.region": String(prs[3]?.region || ""),
                "entrant2.2.winner":
                  qs.winnerIdx === 1 ? IMAGES.winner : IMAGES.default,
              };
            })
        );
        await this.output.writeJSON("queue.json", render);
      },
      (pushQueueState) => this.setState({ pushQueueState })
    );
  }
}
