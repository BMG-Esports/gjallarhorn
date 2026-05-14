import { inject, injectable } from "inversify";
import axios, { AxiosResponse } from "axios";

import cfg from "../config";
import {
  GQLQuery,
  GQLTournament,
  GQLTournamentEliminationStage,
  GQLTournamentLineup,
} from "../@types/challengermode";
import { CacheService } from "./cache";
import { logger } from "../support/logging";
import { BackendError } from "../support/errors";
import { StatusBackend } from "../backends/pages/status";
import { TCacheService, TStatusBackend } from "@bmg-esports/gjallarhorn-tokens";

const API_URL = "https://publicapi.challengermode.com/graphql";
const AUTH_URL = "https://publicapi.challengermode.com/mk1/v1/auth/access_keys";

const log = logger("ChallengerModeService");

@injectable()
export class ChallengerModeService {
  @inject(TCacheService)
  private cache: CacheService;
  @inject(TStatusBackend)
  private status: StatusBackend;

  private expirationTime = new Date();
  private refreshInterval: NodeJS.Timeout;
  private apiToken: string | undefined = undefined;

  private tournamentBracket: GQLTournament = null;
  private tournamentEntrants: [string, GQLTournamentLineup[]] = [null, []];

  async refreshApiToken(): Promise<void> {
    try {
      let res: AxiosResponse<any, any>, lastError: any;
      for (let i = 0; i < 5; i++) {
        try {
          this.status.recordStartGG();
          res = await axios.post(
            AUTH_URL,
            { refreshKey: cfg.CM_REFRESH_KEY },
            { timeout: 5000 }
          );
          break;
        } catch (e) {
          if (axios.isAxiosError(e) && e.code === "ECONNABORTED") {
            log.error("Timeout exceeded, retrying");
            await new Promise((res) => setTimeout(res, 150));
            lastError = e;
            continue;
          }
          if (e.response?.status !== 503) throw e;
          log.error("Got 503 from Challengermode");
          lastError = e;
          await new Promise((res) => setTimeout(res, 150));
        }
      }
      if (!res) throw lastError;
      this.apiToken = res.data.value;
      this.expirationTime = new Date(res.data.expiresAt);
      this.scheduleRefresh();
    } catch (e) {
      log.error("Error fetching CM token.");
      log.error(e);
      throw "Challengermode query error!";
    }
  }

  private scheduleRefresh(): void {
    if (!this.expirationTime) return;

    const timeUntilExpiration = this.expirationTime.getTime() - Date.now();
    const bufferTime = 5000; // Refresh 5 seconds before expiration

    if (this.refreshInterval) {
      clearTimeout(this.refreshInterval);
    }

    const refreshTime = Math.max(timeUntilExpiration - bufferTime, 0);

    this.refreshInterval = setTimeout(() => {
      this.refreshApiToken();
    }, refreshTime);
  }

  /**
   * Run a rate-limited query against challengermode using the given parameters.
   */
  async runQuery(
    query: string,
    variables: Record<string, string | number>,
    cacheDuration?: number
  ): Promise<{
    data: GQLQuery;
  }> {
    const doRequest = async () => {
      return (
        await (async () => {
          try {
            if (!this.apiToken) await this.refreshApiToken();
            let res: AxiosResponse<any, any>, lastError: any;
            for (let i = 0; i < 5; i++) {
              try {
                // if (Math.random() < 0.7) throw { response: { status: 503 } };
                this.status.recordStartGG();
                res = await axios.post(
                  API_URL,
                  { query, variables },
                  {
                    headers: { Authorization: `Bearer ${this.apiToken}` },
                    timeout: 5000,
                  }
                );
                break;
              } catch (e) {
                if (e.response?.status !== 503) throw e;
                log.error("Got 503 from Challengermode");
                lastError = e;
                await new Promise((res) => setTimeout(res, 150));
              }
            }
            if (!res) throw lastError;
            return res;
          } catch (e) {
            log.error("Error during query.");
            log.error(e);
            log.error(query);
            log.error(JSON.stringify(variables));

            if (e.response) {
              log.error("Server responded with:", e.response.status);
              log.error(JSON.stringify(e.response.data));
            }

            throw "Challengermode query error!";
          }
        })()
      ).data;
    };

    if (cacheDuration === 0) {
      return doRequest();
    }

    // Not the best key, but should be unique for any given combination of query and var.
    const key = query + JSON.stringify(variables);
    return this.cache.get(key, doRequest, cacheDuration);
  }

  /**
   * Get meta information about a tournament (stages, brackets, rounds)
   */
  async getTournamentMeta(slug: string) {
    try {
      const {
        data: { tournament },
      } = await this.runQuery(
        `query($id: UUID!) {
          tournament(tournamentId: $id) {
            id
            name
            state
            settings {
              gameSessionSettings
              tournamentSettings {
                maxLineupSize
              }
            }
            stages {
              index
              format
              ... on TournamentEliminationStage {
                brackets {
                  title
                  roundCount
                  rounds {
                    roundNumber
                    title
                  }
                }
              }
            }
          }
        }`,
        { id: slug }
      );
      return tournament;
    } catch (e) {
      throw new BackendError(
        "Error when fetching tournament information.",
        "challengermode",
        true,
        e
      );
    }
  }

  async getAllEntrants(tournamentId: string) {
    try {
      const {
        data: {
          tournament: {
            attendance: {
              signups: { lineups: entrants },
            },
          },
        },
      } = await this.runQuery(
        `query($id: UUID!) {
          tournament(tournamentId: $id) {
            id
            name
            attendance {
              signups {
                lineups {
                  seed
                  name
                  placement {
                    bestPlacement
                  }
                  members {
                    user {
                      userId
                      username
                    }
                  }
                }
              }
            }
          }
        }`,
        { id: tournamentId },
        600
      );
      const sortedEntrants = entrants
        .sort((a, b) => {
          const x = a?.seed || Infinity,
            y = b?.seed || Infinity;
          const order = x - y;
          if (isNaN(order)) return 0;
          return order;
        })
        .map((e) => ({
          ...e,
          name: e.name.endsWith("'s party")
            ? e.name.slice(0, -8)
            : e.name.endsWith("s' party")
            ? e.name.slice(0, -7)
            : e.name,
        }));
      this.tournamentEntrants = [tournamentId, sortedEntrants];
      return sortedEntrants;
    } catch (e) {
      throw new BackendError(
        "Error when fetching entrants.",
        "challengermode",
        true,
        e
      );
    }
  }

  async getEntrantsByName(name: string, tournamentId: string) {
    if (this.tournamentEntrants[0] !== tournamentId) {
      await this.getAllEntrants(tournamentId);
    }
    return this.tournamentEntrants[1].filter((e) =>
      e.name.toLowerCase().includes(name.toLocaleLowerCase())
    );
  }

  async getEntrantById(id: string, tournamentId: string) {
    if (this.tournamentEntrants[0] !== tournamentId) {
      await this.getAllEntrants(tournamentId);
    }
    return this.tournamentEntrants[1].find(
      (e) => e.members.map((member) => member.user.userId).join("_") === id
    );
  }

  async getAllMatchSeries(tournamentId: string) {
    try {
      const {
        data: { tournament },
      } = await this.runQuery(
        `query($id: UUID!) {
          tournament(tournamentId: $id) {
            stages {
              format
              index
              lineupCount
              ... on TournamentEliminationStage {
                brackets {
                  title
                  rounds {
                    roundNumber
                    matchCount
                    lineupCount
                    matchSeries {
                      id
                      ordinal
                      lineups {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
        { id: tournamentId },
        0
      );
      this.tournamentBracket = tournament;
    } catch (e) {
      throw new BackendError(
        "Error when fetching stages.",
        "challengermode",
        true,
        e
      );
    }
  }

  async getMatchSeriesesInRound(
    tournamentId: string,
    stageNum: number,
    bracketType: string,
    roundNum: number
  ) {
    if (this.tournamentBracket.id !== tournamentId) {
      await this.getAllMatchSeries(tournamentId);
    }
    return (
      this.tournamentBracket.stages[stageNum] as GQLTournamentEliminationStage
    ).brackets.find((b) => b.title === bracketType).rounds[roundNum]
      .matchSeries;
  }

  async getMatchSeriesesInBracket(
    tournamentId: string,
    stageNum: number,
    bracketType: string
  ) {
    if (this.tournamentBracket?.id !== tournamentId) {
      await this.getAllMatchSeries(tournamentId);
    }
    return (
      this.tournamentBracket.stages[stageNum] as GQLTournamentEliminationStage
    ).brackets
      .find((b) => b.title === bracketType)
      .rounds.flatMap((round) => round.matchSeries)
      .map((ms) => ({
        ...ms,
        lineups: ms.lineups.map((l) => ({
          ...l,
          name: l.name.endsWith("'s party")
            ? l.name.slice(0, -8)
            : l.name.endsWith("s' party")
            ? l.name.slice(0, -7)
            : l.name,
        })),
      }));
  }

  /**
   * Retrieve information about the set using its ID.
   */
  async getMatchSeriesById(matchSeriesId: string) {
    try {
      const {
        data: { matchSeries: matchSeries },
      } = await this.runQuery(
        `query($id: UUID!) {
          matchSeries(matchSeriesId: $id) {
            id
            ordinal
            startedAt
            results {
              final
              lineupResults {
                score
                lineupNumber
              }
            }
            labels
            state
            lineups {
              members {
                user {
                  userId
                  username
                }
              }
            }
          }
        }`,
        { id: matchSeriesId }
      );
      return matchSeries;
    } catch (e) {
      throw new BackendError(
        "Error when fetching set information.",
        "challengermode",
        true,
        e
      );
    }
  }

  /**
   * Load a player's information based off their ID.
   */
  async getPlayerById(playerId: string) {
    try {
      const {
        data: { user },
      } = await this.runQuery(
        `query($id: UUID!) {
          user(userId: $id) {
            userId
            username
            connectedAccounts {
              provider
              id
            }
          }
        }`,
        {
          id: playerId,
        },
        600
      );
      return user;
    } catch (e) {
      throw new BackendError(
        "Error when fetching player information.",
        "challengermode",
        true,
        e
      );
    }
  }

  /**
   * Fetch all the sets in the stream queues for a given tournament.
   */
  async getStreamQueues(tournamentId: string) {
    try {
      const {
        data: {
          tournament: {
            hosts: {
              spaces: [{ broadcasts: streams }],
            },
          },
        },
      } = await this.runQuery(
        `query($id: UUID!) {
     tournament(tournamentId: $id) {
            hosts {
              spaces {
                broadcasts {
                  name
                  streams {
                    ... on MatchSeriesStream {
                      matchSeries {
                        matches {
                          results {
                            lineupResults {
                              score
                              lineupNumber
                            }
                          }
                        }
                        id
                        startedAt
                        ordinal
                        title
                        state
                        results {
                          lineupResults {
                            score
                            lineupNumber
                          }
                        }
                        lineups {
                          members {
                            user {
                              userId
                              username
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
        { id: tournamentId },
        0
      );
      return streams;
    } catch (e) {
      throw new BackendError(
        "Error when fetching stream queues.",
        "challengermode",
        true,
        e
      );
    }
  }

  async getAllStagesMatchSeries(tournamentId: string) {
    try {
      const {
        data: { tournament },
      } = await this.runQuery(
        `query($id: UUID!) {
          tournament(tournamentId: $id) {
            stages {
              format
              lineupCount
              ... on TournamentEliminationStage {
                brackets {
                  labels  
                  rounds {
                    roundNumber
                    matchCount
                    matchSeries {
                      ordinal
                      matches(includeFailed: true) {
                        results {
                          final
                          lineupResults {
                            score
                            lineupNumber
                          }
                        }
                      }
                      lineups {
                        members {
                          user { 
                            username  
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
        { id: tournamentId },
        0
      );
      return tournament;
    } catch (e) {
      throw new BackendError(
        "Error when fetching stages.",
        "challengermode",
        true,
        e
      );
    }
  }
}
