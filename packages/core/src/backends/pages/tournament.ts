import { Tournament, Entrant, Set, Event } from "../../@types/startgg";
import { ErrorService } from "../../services/error";
import { OutputService } from "../../services/output";
import { StartGGService } from "../../services/startgg";
import { Backend } from "../../support/backend";
import { BackendError } from "../../support/errors";
import {
  getBracketExport,
  getRoundRobinBracketExport,
} from "../../support/brackets";
import {
  TChallengerModeService,
  TErrorService,
  TOutputService,
  TStartGGService,
  TTournamentBackend,
} from "@bmg-esports/gjallarhorn-tokens";
import { inject } from "inversify";
import { PhaseGroupType, PushButtonState } from "../../@types/types";
import { wrapPushButton } from "../../support/ui";
import { BRACKET_ROUND_MAP, IMAGES } from "../../constants";
import { ChallengerModeService } from "../../services/challenger-mode";
import {
  GQLMatchSeries,
  GQLTournament,
  GQLTournamentEliminationStage,
  GQLTournamentLineup,
  GQLTournamentNodeLabel,
} from "../../@types/challengermode";

export type State = {
  sggTournamentMeta?: Tournament | null;
  sggTournament: {
    tournamentSlug: string;
    eventId?: number;
    phaseId?: number;
    phaseGroupId?: number;
    entrantSize?: number;
  };
  cmTournamentMeta?: GQLTournament | null;
  cmTournament: {
    tournamentId: string;
    stageNum?: number;
    bracketType?: string;
    roundNum?: number;
    entrantSize?: number;
  };

  isChallengerMode: boolean;
  autoBrackets: boolean;
  pushBracketState?: PushButtonState;
};

export class TournamentBackend extends Backend<State> {
  @inject(TStartGGService) private sgg: StartGGService;
  @inject(TChallengerModeService) private cm: ChallengerModeService;
  @inject(TOutputService) private output: OutputService;
  @inject(TErrorService) private errors: ErrorService;

  identifier = TTournamentBackend;
  scopes = ["pages:tournament"];

  state: State = {
    sggTournament: {
      tournamentSlug: "",
    },
    cmTournament: {
      tournamentId:
        process.env.NODE_ENV === "production"
          ? ""
          : "eb84e618-2941-42b7-09c7-08dd66f60e0c",
    },
    isChallengerMode: true,
    autoBrackets: false,
  };

  phaseGroupTypeMap: { [id: number]: PhaseGroupType } = {};

  private bracketsTimeout: NodeJS.Timeout;

  protected _onRestore(): void {
    const { sggTournamentMeta: sggMeta, sggTournament } = this.state;
    const { eventId } = sggTournament;
    this.state.autoBrackets && this.pushBrackets();

    const e = eventId
      ? sggMeta.events.find((e) => e.id === eventId)
      : undefined;
    this.prepBracketRound(e);
  }

  listeners() {
    this._tournamentListeners();

    this.on(() => {
      if (this.state.autoBrackets) this.pushBrackets();
      else clearTimeout(this.bracketsTimeout);
    }, [this.state.autoBrackets]);
  }

  /**
   * Listeners for active tournament stuff. Automatically selects the first
   * sub-type whenever its parent changes. i.e. first event when tourney
   * changes, etc.
   */
  private _tournamentListeners() {
    const {
      sggTournament,
      cmTournament,
      sggTournamentMeta: sggMeta,
      cmTournamentMeta: cmMeta,
      isChallengerMode,
    } = this.state;
    const { tournamentSlug, phaseId, eventId } = sggTournament;
    const { tournamentId, stageNum, bracketType } = cmTournament;
    this.on(() => {
      // Clear existing info.
      this.setState({
        sggTournamentMeta: undefined,
        sggTournament: {
          tournamentSlug: tournamentSlug,
        },
        cmTournamentMeta: undefined,
        cmTournament: {
          tournamentId: tournamentId,
        },
      });
      // Fetch new tournament sggMeta info.
      // Fetch new tournament sggMeta info.
      if (isChallengerMode) {
        this.cm
          .getTournamentMeta(tournamentId)
          .then((tournamentMeta) => {
            this.setState({
              cmTournamentMeta: tournamentMeta,
            });
            if (tournamentMeta === null) {
              throw new BackendError(
                "Invalid tournament ID entered!",
                "Tournament"
              );
            }
          })
          .catch((e) => {
            if (e instanceof BackendError) {
              this.setState({
                cmTournamentMeta: null,
              });
              throw e.nonFatal();
            }
            throw e;
          });
      } else {
        this.sgg
          .getTournamentMeta(tournamentSlug)
          .then((tournamentMeta) => {
            this.setState({
              sggTournamentMeta: tournamentMeta,
            });

            if (tournamentMeta === null) {
              throw new BackendError("Invalid slug entered!", "Tournament");
            }
          })
          .catch((e) => {
            if (e instanceof BackendError) {
              this.setState({
                sggTournamentMeta: null,
              });
              throw e.nonFatal();
            }
            throw e;
          });
      }
    }, [tournamentSlug, tournamentId, isChallengerMode]);

    this.on(() => {
      this.setState({
        sggTournament: {
          ...sggTournament,
          eventId: sggMeta ? sggMeta.events[0]?.id ?? null : undefined,
        },
      });
    }, [sggMeta?.id]);

    this.on(() => {
      this.setState({
        cmTournament: {
          ...cmTournament,
          stageNum: cmMeta ? cmMeta.stages?.[0]?.index ?? null : undefined,
        },
      });
    }, [cmMeta?.id]);

    this.on(() => {
      const e = eventId
        ? sggMeta.events.find((e) => e.id === eventId)
        : undefined;
      this.setState({
        sggTournament: {
          ...sggTournament,
          phaseId: eventId ? e.phases?.[0]?.id ?? null : undefined,
          entrantSize: eventId ? e.entrantSizeMax ?? null : undefined,
        },
      });

      this.prepBracketRound(e);
    }, [eventId]);

    this.on(() => {
      const stage = stageNum != null ? cmMeta.stages[stageNum] : undefined;
      this.setState({
        cmTournament: {
          ...cmTournament,
          bracketType:
            stageNum != null
              ? (stage as GQLTournamentEliminationStage).brackets?.[0]?.title ??
                null
              : undefined,
          entrantSize:
            cmMeta?.settings?.tournamentSettings?.maxLineupSize ?? null,
        },
      });
    }, [stageNum]);

    this.on(() => {
      this.setState({
        sggTournament: {
          ...sggTournament,
          phaseGroupId: phaseId
            ? sggMeta.events
                .find((e) => e.id === eventId)
                .phases.find((p) => p.id === phaseId).phaseGroups.nodes[0].id
            : undefined,
        },
      });
    }, [phaseId]);

    this.on(() => {
      this.setState({
        cmTournament: {
          ...cmTournament,
          roundNum: bracketType ? 0 : undefined,
        },
      });
    }, [bracketType]);
  }

  private prepBracketRound(e: Event | undefined) {
    this.phaseGroupTypeMap = {};
    if (!e) return;
    if (e.phases?.length === 1) {
      // Probably invitational.
      const p = e.phases[0];
      if (p.phaseGroups?.nodes?.length === 1) {
        // Almost certainly invitational.
        const id = p.phaseGroups.nodes[0].id!;
        const nseeds = (
          Object.values(p.phaseGroups.nodes[0].seedMap)[0] as number[]
        ).length;
        if (nseeds === 32) this.phaseGroupTypeMap[id] = PhaseGroupType.T32_INV;
        else if (nseeds === 16)
          this.phaseGroupTypeMap[id] = PhaseGroupType.T16_INV;
      }
    } else {
      // Probably progression.
      const t32idx = e.phases.findIndex(
        (p) =>
          p.phaseGroups?.nodes?.length === 1 &&
          (Object.values(p.phaseGroups.nodes[0].seedMap)[0] as number[])
            .length === 32
      );

      if (t32idx !== -1) {
        const t8idx = t32idx + 1;
        const p = e.phases[t8idx];
        if (
          (Object.values(p.phaseGroups.nodes[0].seedMap)[0] as number[])
            .length === 8
        ) {
          this.phaseGroupTypeMap[e.phases[t32idx].phaseGroups.nodes[0].id] =
            PhaseGroupType.T32_PROG;
          this.phaseGroupTypeMap[e.phases[t8idx].phaseGroups.nodes[0].id] =
            PhaseGroupType.T8_PROG;
        }
      } else {
        const t4idx = e.phases.findIndex(
          (p) =>
            p.phaseGroups?.nodes?.length === 1 &&
            (Object.values(p.phaseGroups.nodes[0].seedMap)[0] as number[])
              .length === 4
        );
        if (t4idx !== -1) {
          this.phaseGroupTypeMap[e.phases[t4idx].phaseGroups.nodes[0].id] =
            PhaseGroupType.T4_PROG;
        }
      }
    }
  }

  async getEntrantsByName(
    name: string
  ): Promise<(GQLTournamentLineup | Entrant)[]> {
    if (
      !name ||
      (!this.state.sggTournament.eventId &&
        !this.state.cmTournament.tournamentId)
    )
      return [];
    if (this.state.isChallengerMode) {
      try {
        return this.cm.getEntrantsByName(
          name,
          this.state.cmTournament.tournamentId
        );
      } catch (e) {
        if (e instanceof BackendError) {
          this.errors.report(e.nonFatal());
          return [];
        }
        throw e;
      }
    } else {
      try {
        return this.sgg.getEntrantsByName(
          name,
          this.state.sggTournament.eventId
        );
      } catch (e) {
        if (e instanceof BackendError) {
          this.errors.report(e.nonFatal());
          return [];
        }
        throw e;
      }
    }
  }

  async getSggEntrantById(id: number): Promise<Entrant> {
    try {
      return this.sgg.getEntrantById(id);
    } catch (e) {
      if (e instanceof BackendError) throw e.nonFatal();
      throw e;
    }
  }

  async getCmEntrantById(id: string): Promise<GQLTournamentLineup> {
    try {
      return this.cm.getEntrantById(id, this.state.cmTournament.tournamentId);
    } catch (e) {
      if (e instanceof BackendError) throw e.nonFatal();
      throw e;
    }
  }

  async getStreamQueues() {
    return this.state.isChallengerMode
      ? this.cm.getStreamQueues(this.state.cmTournament.tournamentId)
      : this.sgg.getStreamQueues(this.state.sggTournament.tournamentSlug);
  }

  getRoundName() {
    const { stageNum, bracketType, roundNum } = this.state.cmTournament;
    const { stages } = this.state.cmTournamentMeta;
    const stage = stages?.[stageNum] as GQLTournamentEliminationStage;
    const bracket = stage?.brackets?.find(
      (bracket) => bracket.title === bracketType
    );
    const round = bracket?.rounds?.[roundNum];

    return round.title || "";
  }

  getBracketName() {
    return this.state.cmTournament.bracketType || "";
  }

  getBracketRound(set: Set) {
    const pgId = set.phaseGroup.id;
    const { round } = set;
    const pgType = this.phaseGroupTypeMap[pgId];
    if (pgType === undefined) return set.fullRoundText || ""; // Can't help :(

    return BRACKET_ROUND_MAP[pgType][round] || set.fullRoundText || "";
  }

  async pushSggBrackets() {
    const { eventId } = this.state.sggTournament;
    const targetSizes = [32, 16, 8, 4];

    if (!eventId) {
      throw new BackendError("No active event!", "Tournament");
    }
    const phaseGroupIds = this.state.sggTournamentMeta?.events
      ?.find((e) => e.id === eventId)
      // Only select phases with a single group.
      ?.phases?.filter((p) => p?.phaseGroups?.nodes?.length === 1)
      .map((p) => ({ name: p.name, pG: p.phaseGroups?.nodes?.[0] }))
      .filter(
        // Only select phase groups with the desired seed count.
        ({ pG }) =>
          pG &&
          (pG.bracketType === "ROUND_ROBIN" ||
            (pG.bracketType === "DOUBLE_ELIMINATION" &&
              targetSizes.includes(
                (Object.values(pG.seedMap)[0] as number[]).length
              )))
      )
      .map(({ name, pG }) => ({ name, id: pG.id, type: pG.bracketType }));

    await Promise.all(
      phaseGroupIds.map(async ({ name, id, type }) => {
        try {
          if (type === "DOUBLE_ELIMINATION") {
            const { sets, remaining } = await getBracketExport(id);
            await this.output.writeJSON(`bracket-${name}.json`, sets);
            await this.output.writeJSON(`remaining-${name}.json`, remaining);
          } else if (type === "ROUND_ROBIN") {
            await this.output.writeJSON(
              `bracket-${name}.json`,
              await getRoundRobinBracketExport(id)
            );
          }
        } catch (e) {
          if (e instanceof BackendError) throw e.nonFatal();
          throw e;
        }
      })
    );

    // Push recently completed sets json
    try {
      const recents = await this.sgg.getRecentCompletedSetsInEvent(eventId);
      await this.output.writeJSON(
        `recent-sets.json`,
        recents
          .filter((set) =>
            // Remove DQs
            set.slots.every((slot) => slot.standing.stats.score.value !== -1)
          )
          .map((set) => {
            const left = set.slots[0];
            const leftScore = left.standing?.stats?.score?.value;
            const right = set.slots[1];
            const rightScore = right.standing?.stats?.score?.value;

            let [winner, loser] = [left, right];
            if (rightScore > leftScore) [loser, winner] = [winner, loser];

            return {
              id: set.id,
              identifier: set.identifier,
              phase: set.phaseGroup?.phase?.name || "",
              phaseGroup: set.phaseGroup?.displayIdentifier,
              round: this.getBracketRound(set),
              bracket:
                set.round > -1 ? "Winners Bracket" : "Elimination Bracket",
              elimination: set.round < 0, // true if match is elimination
              "entrant1.name": left.entrant?.name || "",
              "entrant1.score": leftScore === -1 ? "DQ" : leftScore,
              "entrant1.seed": left.seed.seedNum,
              "entrant2.name": right.entrant?.name || "",
              "entrant2.score": rightScore === -1 ? "DQ" : rightScore,
              "entrant2.seed": right.seed.seedNum,
            };
          })
      );
    } catch (e) {
      if (e instanceof BackendError) throw e.nonFatal();
      throw e;
    }
  }

  async pushCmBrackets() {
    // For now, only push Top 32 DE brackets.
    // TODO: support other braket types (round robin, multi-stage)

    const MAX_MATCHES_UPPER = 8;
    const MAX_MATCHES_LOWER = 8;

    const { tournamentId } = this.state.cmTournament;
    // TODO: would be great if there was a round-wise set query
    // instead of getting all tourney sets.
    if (!tournamentId) {
      throw new BackendError("No active tournament!", "Tournament");
    }

    const { stages: allStages } = await this.cm.getAllStagesMatchSeries(
      tournamentId
    );

    // Identify bracket with grand final set.
    // TODO: how does this work with pools?
    const targetStage = allStages.find(
      (stage: GQLTournamentEliminationStage) =>
        stage.format === "DOUBLE_ELIMINATION" &&
        stage.brackets.some((bracket) =>
          bracket.labels.includes(
            GQLTournamentNodeLabel.DOUBLE_ELIMINATION_FINALS_BRACKET
          )
        )
    ) as GQLTournamentEliminationStage;

    if (!targetStage) {
      throw new BackendError("No grand finals stage found!", "Tournament");
    }

    const upperBracket = targetStage.brackets.find((bracket) =>
      bracket.labels.includes(
        GQLTournamentNodeLabel.DOUBLE_ELIMINATION_UPPER_BRACKET
      )
    );
    const upperBracketRounds =
      upperBracket?.rounds.filter(
        (round) => round.matchCount <= MAX_MATCHES_UPPER
      ) ?? [];
    const lowerBracket = targetStage.brackets.find((bracket) =>
      bracket.labels.includes(
        GQLTournamentNodeLabel.DOUBLE_ELIMINATION_LOWER_BRACKET
      )
    );
    const lowerBracketRounds =
      lowerBracket?.rounds.filter(
        (round) => round.matchCount <= MAX_MATCHES_LOWER
      ) ?? [];
    const grandFinalRounds =
      targetStage.brackets.find((bracket) =>
        bracket.labels.includes(
          GQLTournamentNodeLabel.DOUBLE_ELIMINATION_FINALS_BRACKET
        )
      )?.rounds ?? [];

    type OutputSet = {
      identifier: string;
      round: string;
      bracket: "upper" | "lower" | "finals";
      "entrant1.name": string;
      "entrant1.winner": string;
      "entrant1.opacity": string;
      "entrant1.score": string;
      "entrant2.name": string;
      "entrant2.winner": string;
      "entrant2.opacity": string;
      "entrant2.score": string;
    };

    const defaultSet: OutputSet = {
      identifier: "0",
      round: "0",
      bracket: "upper",
      "entrant1.name": "",
      "entrant1.winner": IMAGES.default,
      "entrant1.opacity": IMAGES.winnerOpacity,
      "entrant1.score": "",
      "entrant2.name": "",
      "entrant2.winner": IMAGES.default,
      "entrant2.opacity": IMAGES.winnerOpacity,
      "entrant2.score": "",
    };

    const matchSeries: OutputSet[] = [];

    const serializeLineup = (
      ms: GQLMatchSeries,
      aggregateScores: [number, number],
      isDetermined: boolean,
      index: number
    ) => {
      const isWinner =
        isDetermined && aggregateScores[index] > aggregateScores[1 - index];
      return {
        name:
          ms.lineups[index]?.members
            .map((member) => member.user.username)
            .join(" / ") ?? "",
        winner: isWinner ? IMAGES.winner : IMAGES.default,
        opacity:
          !isDetermined || isWinner
            ? IMAGES.winnerOpacity
            : IMAGES.loserOpacity,
        score: aggregateScores[index]?.toString() ?? "",
      };
    };

    const formatMatchSeries = (
      ms: GQLMatchSeries,
      round: number,
      bracket: "upper" | "lower" | "finals"
    ) => {
      const aggregateScores: [number, number] = [0, 0];

      ms.matches.forEach((match) =>
        match.results.lineupResults.forEach(
          (result) =>
            (aggregateScores[result.lineupNumber] += result.score ?? 0)
        )
      );

      const isDetermined = ms.matches.every((match) => match.results.final);

      const entrant1 = serializeLineup(ms, aggregateScores, isDetermined, 0);
      const entrant2 = serializeLineup(ms, aggregateScores, isDetermined, 1);
      return {
        ...defaultSet,
        identifier: ms.ordinal.toString(),
        round: round.toString(),
        bracket: bracket,
        "entrant1.name": entrant1.name,
        "entrant1.winner": entrant1.winner,
        "entrant1.opacity": entrant1.opacity,
        "entrant1.score": entrant1.score,
        "entrant2.name": entrant2.name,
        "entrant2.winner": entrant2.winner,
        "entrant2.opacity": entrant2.opacity,
        "entrant2.score": entrant2.score,
      };
    };

    // Grand finals
    grandFinalRounds.forEach((round) =>
      round.matchSeries
        .sort((a, b) => a.ordinal - b.ordinal)
        .forEach((ms) =>
          matchSeries.push(formatMatchSeries(ms, round.roundNumber, "finals"))
        )
    );
    if (grandFinalRounds.length === 1) {
      // We haven't played a reset yet, so let's make a dummy set so indexing
      // doesn't explode.
      matchSeries.push({
        ...defaultSet,
        identifier: "0",
        round: "1",
        bracket: "finals",
      });
    }

    // Upper bracket
    upperBracketRounds.forEach((round) =>
      round.matchSeries
        .sort((a, b) => a.ordinal - b.ordinal)
        .forEach((ms) =>
          matchSeries.push(formatMatchSeries(ms, round.roundNumber, "upper"))
        )
    );

    // Lower bracket
    lowerBracketRounds.forEach((round) =>
      round.matchSeries
        .sort((a, b) => a.ordinal - b.ordinal)
        .forEach((ms) =>
          matchSeries.push(formatMatchSeries(ms, round.roundNumber, "lower"))
        )
    );

    await this.output.writeJSON(`bracket-Top32.json`, matchSeries);
  }

  async pushBrackets() {
    clearTimeout(this.bracketsTimeout);
    try {
      await wrapPushButton(
        async () => {
          if (this.state.isChallengerMode) {
            await this.pushCmBrackets();
          } else {
            await this.pushSggBrackets();
          }
        },
        (pushBracketState) => this.setState({ pushBracketState })
      );

      if (this.state.autoBrackets)
        this.bracketsTimeout = setTimeout(
          () => this.pushBrackets(),
          2 * 60 * 1000
        );
    } catch (e) {
      if (e instanceof BackendError) {
        e.nonFatal();
      }
      this.setState({ autoBrackets: false });
      throw e;
    }
  }
}
