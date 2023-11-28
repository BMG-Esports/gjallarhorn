import { inject, injectable } from "inversify";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

import cfg from "../config";
import { Query } from "../@types/startgg";
import { CacheService } from "./cache";
import { logger } from "../support/logging";
import { SGG_SELECTION_TO_LEGEND } from "../constants";
import { BackendError } from "../support/errors";
import { StatusBackend } from "../backends/pages/status";
import { TCacheService, TStatusBackend } from "@bmg-esports/gjallarhorn-tokens";

const API_URL = "https://api.start.gg/gql/alpha";

const log = logger("StartGGService");

@injectable()
export class StartGGService {
  @inject(TCacheService) private cache: CacheService;
  @inject(TStatusBackend) private status: StatusBackend;

  private _config: AxiosRequestConfig = {
    headers: { Authorization: `Bearer ${cfg.STARTGG_API_KEY}` },
    timeout: 5000,
  };
  /**
   * Run a rate-limited query against start.gg using the given parameters.
   */
  async runQuery(
    query: string,
    variables: Record<string, any>,
    cacheDuration?: number
  ): Promise<{
    data: Query;
  }> {
    const doRequest = async () => {
      return (
        await (async () => {
          try {
            let res: AxiosResponse<any, any>, lastError: any;
            for (let i = 0; i < 5; i++) {
              try {
                this.status.recordStartGG();
                res = await axios.post(
                  API_URL,
                  { query, variables },
                  this._config
                );
                break;
              } catch (e) {
                if (e.response?.status !== 503) throw e;
                log.error("Got 503 from start.gg");
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
              log.error(e.response.data);
            }

            throw "start.gg query error!";
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
   * Get meta information about a tournament (events, phases, phaseGroups)
   */
  async getTournamentMeta(slug: string) {
    try {
      const {
        data: { tournament },
      } = await this.runQuery(
        `query($slug: String) {
          tournament(slug: $slug) {
            id
            name
            events {
              id
              name
              entrantSizeMax
              phases {
                id
                name
                numSeeds
                phaseGroups(query: {perPage: -1}) {
                  nodes {
                    id
                    bracketType
                    displayIdentifier
                    seedMap
                  }
                }
              }
            }
          }
        }`,
        { slug }
      );
      return tournament;
    } catch (e) {
      throw new BackendError(
        "Error when fetching tournament information.",
        "start.gg",
        true,
        e
      );
    }
  }

  async getPhaseGroupStandings(phaseGroupId: number) {
    try {
      const query = `query ($phaseGroupId: ID!) {
        phaseGroup(id: $phaseGroupId){
          standings(query: {perPage: -1}) {
            nodes {
              isFinal
              placement
              entrant {
                name
                id
                paginatedSets(filters: { phaseGroupIds: [$phaseGroupId] }) {
                  nodes {
                    state
                    winnerId
                    slots {
                      entrant { id }
                      standing {
                        stats {
                          score {
                            value
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
      }`;
      const {
        data: {
          phaseGroup: {
            standings: { nodes: standings },
          },
        },
      } = await this.runQuery(query, { phaseGroupId });
      return standings;
    } catch (e) {
      throw new BackendError(
        "Error when fetching standings.",
        "start.gg",
        true,
        e
      );
    }
  }

  /**
   * Get entrants for an event, filtered by entrant name.
   */
  async getEntrantsByName(name: string, eventId: number) {
    try {
      const {
        data: {
          event: {
            entrants: { nodes: entrants },
          },
        },
      } = await this.runQuery(
        `query ($eventId: ID, $name: String) {
          event(id: $eventId) {
            entrants(query: {
              perPage: 5,
              filter: {
                name: $name
              }
            }){
              nodes {
                id
                name
                initialSeedNum
              }
            }
          }
        }`,
        { name, eventId },
        600 // 10 minutes
      );
      return entrants.sort((a, b) => {
        const x = a?.initialSeedNum || Infinity,
          y = b?.initialSeedNum || Infinity;
        const order = x - y;
        if (isNaN(order)) return 0;
        return order;
      });
    } catch (e) {
      throw new BackendError(
        "Error when fetching entrants.",
        "start.gg",
        true,
        e
      );
    }
  }

  /**
   * Fetch an entrant using its ID
   */
  async getEntrantById(entrantId: number) {
    try {
      const {
        data: { entrant },
      } = await this.runQuery(
        `query ($entrantId: ID!) {
          entrant(id: $entrantId) {
            id
            initialSeedNum
            name
            team {
              members {
                player {
                  id
                }
              }
            }
            participants {
              gamerTag
              prefix
              player {
                id
              }
              contactInfo {
                country
              }
              user {
                location {
                  country
                }
                authorizations(types: [TWITCH, TWITTER]) {
                  type
                  externalUsername
                }
              }
            }
          }
        }`,
        { entrantId },
        600 // 10 minutes
      );
      return entrant;
    } catch (e) {
      throw new BackendError(
        "Error when fetching entrant information.",
        "start.gg",
        true,
        e
      );
    }
  }

  /**
   * Get all the sets in a given phase group.
   */
  async getSetsInPhaseGroup(phaseGroupId: number) {
    try {
      const query = `query ($phaseGroupId: ID!, $page: Int) {
        phaseGroup(id:$phaseGroupId) {
          id
          displayIdentifier
          sets(
            page: $page
            perPage: 150
            sortType: CALL_ORDER
          ) {
            pageInfo {
              totalPages
            }
            nodes {
              id
              winnerId
              fullRoundText
              identifier
              slots {
                entrant {
                  id
                  name
                }
              }
            }
          }
        }
      }`;
      const {
        data: { phaseGroup },
      } = await this.runQuery(
        query,
        {
          phaseGroupId,
          page: 1,
        },
        0
      );
      const { pageInfo, nodes: sets } = phaseGroup.sets;

      if (pageInfo.totalPages > 1) {
        // Don't do anything for 0 and 1 pages.
        const pages = Array(pageInfo.totalPages - 1)
          .fill(undefined)
          .map((_, i) => this.runQuery(query, { phaseGroupId, page: i + 2 }));

        return sets.concat(
          ...(await Promise.all(pages)).map((v) => v.data.phaseGroup.sets.nodes)
        );
      }

      return sets;
    } catch (e) {
      throw new BackendError("Error when fetching sets.", "start.gg", true, e);
    }
  }

  /**
   * Get recent COMPLETE sets in a phase.
   */
  async getRecentSetsInPhase(phaseId: number, count = 50) {
    try {
      const {
        data: {
          phase: {
            sets: { nodes: sets },
          },
        },
      } = await this.runQuery(
        `query ($phaseId: ID, $perPage: Int) {
          phase(id: $phaseId) {
            sets(filters: {state: [3]}, sortType: RECENT, perPage: $perPage) {
              nodes {
                id
                identifier
                phaseGroup {
                  displayIdentifier
                }
                slots {
                  entrant {
                    name
                  }
                  seed {
                    seedNum
                  }
                  standing {
                    stats {
                      score {
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
        { phaseId, perPage: count },
        0
      );
      return sets;
    } catch (e) {
      throw new BackendError(
        "Error when fetching recently completed sets.",
        "start.gg",
        true,
        e
      );
    }
  }

  /**
   * Retrieve information about the set using its ID.
   */
  async getSetById(setId: number) {
    try {
      const {
        data: { set },
      } = await this.runQuery(
        `query ($setId: ID!) {
          set(
            id: $setId
          ) {
            id
            winnerId
            state
            fullRoundText
            round
            phaseGroup { id }
            identifier
            slots {
              standing {
                stats {
                  score {
                    value
                  }
                }
              }
              entrant {
                id
                team {
                  members {
                    player {
                      id
                    }
                  }
                }
                participants {
                  gamerTag
                  prefix
                  player {
                    id
                  }
                  contactInfo {
                    country
                  }
                  user {
                    location {
                      country
                    }
                    authorizations(types: [TWITCH, TWITTER]) {
                      type
                      externalUsername
                    }
                  }
                }
              }
            }
          }
        }`,
        {
          setId,
        }
      );
      return set;
    } catch (e) {
      throw new BackendError(
        "Error when fetching set information.",
        "start.gg",
        true,
        e
      );
    }
  }

  /**
   * Get the recent-most legend selection for a player.
   * Returns null if no recent legend is found.
   */
  async getRecentLegendByPlayer(playerId: number, eventId: number) {
    try {
      const {
        data: {
          event: {
            sets: { nodes: sets },
          },
        },
      } = await this.runQuery(
        `query ($eventId: ID!, $playerId:ID!) {
          event(id: $eventId) {
            sets(
              page: 1, 
              perPage: 20, 
              sortType: RECENT, 
              filters: {state: 3, playerIds: [$playerId] }) {
              nodes {
                games {
                  selections {
                    selectionType
                    selectionValue
                    entrant {
                      participants {
                        player {
                          id
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
        { playerId, eventId }
      );

      for (const set of sets) {
        const selections = (set.games?.map((g) => g.selections) || []).flat();
        const selection = selections.reverse().find(
          (s) =>
            s && // Filter out null selections
            s.selectionType === "CHARACTER" &&
            s.entrant?.participants?.[0]?.player?.id === playerId
        );
        if (!selection) continue;
        const legend = SGG_SELECTION_TO_LEGEND.get(
          selection.selectionValue.toString()
        );
        if (legend) return legend;
      }

      return null;
    } catch (e) {
      throw new BackendError(
        "Error when fetching player's recent legend.",
        "start.gg",
        true,
        e
      );
    }
  }

  /**
   * Load a player's information based off their ID.
   */
  async getPlayerById(playerId: number) {
    try {
      const {
        data: { player },
      } = await this.runQuery(
        `query ($playerId: ID!) {
          player(id: $playerId) {
            id
            gamerTag
            prefix
            user {
              location {
                country
               }
              authorizations(types: [TWITCH, TWITTER]) {
                type
                externalUsername
              }
            }
          }
        }`,
        {
          playerId,
        },
        600
      );
      return player;
    } catch (e) {
      throw new BackendError(
        "Error when fetching player information.",
        "start.gg",
        true,
        e
      );
    }
  }

  /**
   * Fetch all the sets in the stream queues for a given tournament.
   */
  async getStreamQueues(tournamentSlug: string) {
    try {
      const {
        data: {
          tournament: { streamQueue },
        },
      } = await this.runQuery(
        `query ($tournamentSlug: String!) {
            tournament(slug: $tournamentSlug) {
              streamQueue {
                stream {
                  streamName
                }
                sets {
                  state
                  id
                  fullRoundText
                  round
                  phaseGroup { id }
                  identifier
                  displayScore
                  winnerId
                  startAt
                  slots {
                    id
                    standing {
                      stats {
                        score {
                          value
                        }
                      }
                    }
                    entrant {
                      id 
                      team {
                        members {
                          player {
                            id
                          }
                        }
                      }
                      participants {
                        gamerTag
                        prefix
                        player {
                          id
                        }
                        contactInfo {
                          country
                        }
                        user {
                          location {
                            country
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }`,
        { tournamentSlug },
        0
      );
      return streamQueue || [];
    } catch (e) {
      throw new BackendError(
        "Error when fetching stream queues.",
        "start.gg",
        true,
        e
      );
    }
  }

  async getRecentCompletedSetsInEvent(eventId: number, setCount: number = 12) {
    try {
      const {
        data: { event },
      } = await this.runQuery(
        `query ($eventId: ID!, $perPage: Int!) {
          event(id: $eventId) {
            sets(filters: {state: [3]}, sortType: RECENT, perPage: $perPage) {
              nodes {
                id
                identifier
                round
                fullRoundText
                phaseGroup {
                  phase {
                    name
                  }
                  id
                  displayIdentifier
                }
                slots {
                  entrant {
                    name
                  }
                  seed {
                    seedNum
                  }
                  standing {
                    stats {
                      score {
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
        {
          eventId,
          perPage: setCount,
        },
        0
      );
      return event.sets.nodes!;
    } catch (e) {
      throw new BackendError(
        "Error when fetching recently completed sets.",
        "start.gg",
        true,
        e
      );
    }
  }

  async getRoundRobinPhaseGroups(eventId: number) {}
}
