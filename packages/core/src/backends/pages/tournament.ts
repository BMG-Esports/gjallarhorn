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
  TErrorService,
  TOutputService,
  TStartGGService,
  TTournamentBackend,
} from "@bmg-esports/gjallarhorn-tokens";
import { inject } from "inversify";
import { PhaseGroupType, PushButtonState } from "../../@types/types";
import { wrapPushButton } from "../../support/ui";
import { BRACKET_ROUND_MAP } from "../../constants";

export type State = {
  tournamentMeta?: Tournament | null;
  tournament: {
    tournamentSlug: string;
    eventId?: number;
    phaseId?: number;
    phaseGroupId?: number;
    entrantSize?: number;
  };
  autoBrackets: boolean;
  pushBracketState?: PushButtonState;
};

export class TournamentBackend extends Backend<State> {
  @inject(TStartGGService) private sgg: StartGGService;
  @inject(TOutputService) private output: OutputService;
  @inject(TErrorService) private errors: ErrorService;

  identifier = TTournamentBackend;
  scopes = ["pages:tournament"];

  state: State = {
    tournament: {
      tournamentSlug:
        process.env.NODE_ENV === "production"
          ? ""
          : "north-america-winter-championship-2023",
    },
    autoBrackets: false,
  };

  phaseGroupTypeMap: { [id: number]: PhaseGroupType } = {};

  private bracketsTimeout: NodeJS.Timeout;

  protected _onRestore(): void {
    const { tournamentMeta: meta, tournament } = this.state;
    const { eventId } = tournament;
    this.state.autoBrackets && this.pushBrackets();

    const e = eventId ? meta.events.find((e) => e.id === eventId) : undefined;
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
    const { tournamentMeta: meta, tournament } = this.state;
    const { tournamentSlug, phaseId, eventId } = tournament;

    this.on(() => {
      // Clear existing info.
      this.setState({
        tournamentMeta: undefined,
        tournament: {
          tournamentSlug: tournamentSlug,
        },
      });
      // Fetch new tournament meta info.
      this.sgg
        .getTournamentMeta(tournamentSlug)
        .then((tournamentMeta) => {
          this.setState({
            tournamentMeta,
          });
          if (tournamentMeta === null)
            throw new BackendError("Invalid slug entered!", "Tournament");
        })
        .catch((e) => {
          if (e instanceof BackendError) {
            this.setState({
              tournamentMeta: null,
            });
            throw e.nonFatal();
          }
          throw e;
        });
    }, [tournamentSlug]);

    this.on(() => {
      this.setState({
        tournament: {
          ...tournament,
          eventId: meta ? meta.events[0]?.id ?? null : undefined,
        },
      });
    }, [meta?.id]);

    this.on(() => {
      const e = eventId ? meta.events.find((e) => e.id === eventId) : undefined;
      this.setState({
        tournament: {
          ...tournament,
          phaseId: eventId ? e.phases?.[0]?.id ?? null : undefined,
          entrantSize: eventId ? e.entrantSizeMax ?? null : undefined,
        },
      });

      this.prepBracketRound(e);
    }, [eventId]);

    this.on(() => {
      this.setState({
        tournament: {
          ...tournament,
          phaseGroupId: phaseId
            ? meta.events
                .find((e) => e.id === eventId)
                .phases.find((p) => p.id === phaseId).phaseGroups.nodes[0].id
            : undefined,
        },
      });
    }, [phaseId]);
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

  async getEntrantsByName(name: string): Promise<Entrant[]> {
    if (!name || !this.state.tournament.eventId) return [];
    try {
      return this.sgg.getEntrantsByName(name, this.state.tournament.eventId);
    } catch (e) {
      if (e instanceof BackendError) {
        this.errors.report(e.nonFatal());
        return [];
      }
      throw e;
    }
  }

  async getEntrantById(id: number): Promise<Entrant> {
    try {
      return this.sgg.getEntrantById(id);
    } catch (e) {
      if (e instanceof BackendError) throw e.nonFatal();
      throw e;
    }
  }

  async getStreamQueues() {
    return this.sgg.getStreamQueues(this.state.tournament.tournamentSlug);
  }

  getBracketRound(set: Set) {
    const pgId = set.phaseGroup.id;
    const { round } = set;
    const pgType = this.phaseGroupTypeMap[pgId];
    if (pgType === undefined) return set.fullRoundText || ""; // Can't help :(

    return BRACKET_ROUND_MAP[pgType][round] || set.fullRoundText || "";
  }

  async pushBrackets() {
    clearTimeout(this.bracketsTimeout);
    try {
      const { eventId } = this.state.tournament;
      const targetSizes = [32, 16, 8, 4];

      await wrapPushButton(
        async () => {
          if (!eventId)
            throw new BackendError("No active event!", "Tournament");
          const phaseGroupIds = this.state.tournamentMeta?.events
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
                  await this.output.writeJSON(
                    `remaining-${name}.json`,
                    remaining
                  );
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
            const recents = await this.sgg.getRecentCompletedSetsInEvent(
              eventId
            );
            await this.output.writeJSON(
              `recent-sets.json`,
              recents
                .filter((set) =>
                  // Remove DQs
                  set.slots.every(
                    (slot) => slot.standing.stats.score.value !== -1
                  )
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
                      set.round > -1
                        ? "Winners Bracket"
                        : "Elimination Bracket",
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
        },
        (pushBracketState) => this.setState({ pushBracketState })
      );

      if (this.state.autoBrackets)
        this.bracketsTimeout = setTimeout(
          () => this.pushBrackets(),
          2 * 60 * 1000
        );
    } catch (e) {
      this.setState({ autoBrackets: false });
      throw e;
    }
  }
}
