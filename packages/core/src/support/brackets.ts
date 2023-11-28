/**
 * TODO:
 * This code is adapted from NewOverlayTool and will probably need to be
 * rewritten sometime soon, since I barely understand it :(
 */

import {
  getCountryFlag,
  getLegendFull,
  getLegendOffset,
  IMAGES,
} from "../constants";
import {
  TPlayerService,
  TStartGGService,
} from "@bmg-esports/gjallarhorn-tokens";
import { StartGGService } from "../services/startgg";
import { container } from "./di-container";
import { BackendError } from "./errors";
import { Entrant, Set } from "../@types/startgg";
import { PlayerService } from "../services/player";
export interface GameEntrant {
  name?: string;
  winner: string;
  opacity: string;
  score: string;
}

export interface GameExport {
  id: number;
  round: string;
  identifier: string;
  entrant1?: GameEntrant;
  entrant2?: GameEntrant;
}

export interface RemainingPlayer {
  entrant: Entrant;
  eliminations: number;
  seed: number;
}

export const defaultGameEntrant: GameEntrant = {
  name: "",
  winner: IMAGES.default,
  opacity: IMAGES.winnerOpacity,
  score: "",
};

async function queryPhaseGroupSets(
  sgg: StartGGService,
  groupId: number,
  useEntrantName = false,
  isDoubleElimination = false,
  page = 1,
  sets: Set[] = []
): Promise<{ games: GameExport[]; remaining: RemainingPlayer[] }> {
  const phaseGroupQuery = `
  query SetsInPhaseGroup($groupId:ID!, $page:Int) {
    phaseGroup(id:$groupId) {
      id
      displayIdentifier
      sets(
        page: $page
        perPage: 20
        sortType: CALL_ORDER
      ) {
        pageInfo {
          page
          totalPages
        }
        nodes {
          id
          winnerId
          fullRoundText
          round
          identifier
          slots {
            seed {
              seedNum
            }
            standing {
              stats {
                score {
                  value
                }
              }
              entrant {
                id
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
                  player {
                    id
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
    }
  }
  `;
  const { data } = await sgg.runQuery(
    phaseGroupQuery,
    { groupId: groupId, page: page },
    0
  );

  const phaseGroup = data.phaseGroup;
  const pageInfo = phaseGroup.sets!.pageInfo;
  if (!pageInfo) {
    const message = `Cannot find group's pageInfo for phaseGroup [${groupId}], page [${page}]`;
    throw message;
  }

  const iteratingPages = pageInfo.page < pageInfo.totalPages;
  phaseGroup.sets?.nodes.forEach((set) => sets.push(set));
  if (iteratingPages)
    return queryPhaseGroupSets(
      sgg,
      groupId,
      useEntrantName,
      isDoubleElimination,
      pageInfo.page + 1,
      sets
    );

  // Identify the remaining players in this phase group
  const remainingEntrants: { [id: string]: RemainingPlayer } = {};
  if (isDoubleElimination) {
    // Remaining players doesn't make any sense for round robin brackets
    const upperBracketStarters = sets
      .filter((set) => set.round === 1)
      .flatMap((set) => set.slots)
      .map((slot) => slot?.standing?.entrant)
      .filter(Boolean)
      .map((entrant) => entrant.id);
    sets.map((set) => {
      set.slots.map((slot) => {
        const entrant = slot?.standing?.entrant;
        if (!entrant) return;
        if (!remainingEntrants[entrant.id])
          remainingEntrants[entrant.id] = {
            entrant,
            // If we're not a part of the upper bracket starters, we have a free elimination :_)
            eliminations: upperBracketStarters.includes(entrant.id) ? 0 : 1,
            seed: slot.seed?.seedNum,
          };

        if (set.winnerId && set.winnerId !== entrant.id) {
          remainingEntrants[entrant.id].eliminations++;
        }
      });
    });
  }

  return {
    games: sets.map((set) => {
      const game: GameExport = {
        id: set.id,
        identifier: set.identifier!,
        round: set.fullRoundText!,
        entrant1: defaultGameEntrant,
        entrant2: defaultGameEntrant,
      };
      for (let i = 0; i < set.slots!.length; i++) {
        const standing = set.slots?.[i]?.standing;
        if (standing) {
          let score: number | string = standing.stats?.score?.value;
          if (score && score === -1) {
            score = "DQ";
          }
          const participants = standing?.entrant?.participants;
          const entrant: GameEntrant = {
            name: useEntrantName
              ? standing?.entrant?.name
              : `${participants?.[0]?.gamerTag}${
                  participants?.[1]?.gamerTag
                    ? `/${participants?.[1]?.gamerTag}`
                    : ""
                }`,
            winner:
              !!set.winnerId && set.winnerId === standing.entrant?.id
                ? IMAGES.winner
                : IMAGES.default,
            opacity:
              !set.winnerId || set.winnerId === standing.entrant?.id
                ? IMAGES.winnerOpacity
                : IMAGES.loserOpacity,
            score: score?.toString() ?? "",
          };
          if (i === 0) game.entrant1 = entrant;
          else game.entrant2 = entrant;
        }
      }
      return game;
    }),
    remaining: Object.values(remainingEntrants)
      .filter((record) => record.eliminations < 2)
      .sort((a, b) => a.seed - b.seed)
      .sort((a, b) => a.eliminations - b.eliminations),
  };
}

/**
 * Generate the bracket for a given phaseGroupId
 * @param phaseGroupId the target phase group
 * @param useEntrantName use entrant name instead of joining participant names together
 */
export async function getBracketExport(
  phaseGroupId: number,
  useEntrantName = false
) {
  const sgg = container.get<StartGGService>(TStartGGService);
  const pService = container.get<PlayerService>(TPlayerService);

  let sets: GameExport[], remaining: RemainingPlayer[];
  try {
    ({ games: sets, remaining } = await queryPhaseGroupSets(
      sgg,
      phaseGroupId,
      useEntrantName,
      true
    ));
  } catch (e) {
    throw new BackendError("Error when fetching sets.", "Start.GG", true, e);
  }
  // Format sets for output
  sets.sort((a, b) => a.identifier.localeCompare(b.identifier));
  const gameMap = new Map<string, GameExport>();
  sets.forEach((game) => gameMap.set(game.identifier, game));
  gameMap.forEach((game, identifier) => {
    let nextIdentifier = incrementIdentifier(identifier);
    if (!gameMap.has(nextIdentifier)) {
      let gamesInRound = 0;
      const roundName = game.round;
      let tempIdentifier = identifier;
      while (roundName === gameMap.get(tempIdentifier)?.round) {
        tempIdentifier = decrementIdentifier(tempIdentifier);
        gamesInRound++;
      }
      tempIdentifier = incrementIdentifier(tempIdentifier);
      for (let i = 0; i < gamesInRound; i++) {
        const oldGame = gameMap.get(tempIdentifier);
        if (oldGame === undefined) continue;
        let winnerEntrant = defaultGameEntrant;
        if (oldGame!.entrant1?.winner === IMAGES.winner)
          winnerEntrant = oldGame.entrant1;
        else if (oldGame.entrant2?.winner === IMAGES.winner)
          winnerEntrant = oldGame.entrant2;
        if (nextIdentifier === "Q" && oldGame.round === "Grand Final") {
          sets.splice(sets.indexOf(oldGame) + 1, 0, {
            id: oldGame.id,
            round: "Grand Final Reset",
            identifier: nextIdentifier,
            entrant1: { ...defaultGameEntrant, opacity: IMAGES.loserOpacity },
            entrant2: { ...defaultGameEntrant, opacity: IMAGES.loserOpacity },
          });
        } else {
          sets.push({
            id: oldGame.id,
            round: oldGame.round,
            identifier: nextIdentifier,
            entrant1: winnerEntrant,
            entrant2: defaultGameEntrant,
          });
        }
        tempIdentifier = incrementIdentifier(tempIdentifier);
        nextIdentifier = incrementIdentifier(nextIdentifier);
      }
    }
  });

  // Format remaining for output
  const remainingWinners = remaining.filter((r) => r.eliminations === 0).length,
    remainingElimination = remaining.filter((r) => r.eliminations === 1).length;

  return {
    sets: sets
      .map((set) => ({
        id: set.id,
        identifier: set.identifier,
        round: set.round,
        "entrant1.name": set.entrant1?.name || defaultGameEntrant.name,
        "entrant1.winner": set.entrant1?.winner || defaultGameEntrant.winner,
        "entrant1.opacity": set.entrant1?.opacity || defaultGameEntrant.opacity,
        "entrant1.score": set.entrant1?.score || defaultGameEntrant.score,

        "entrant2.name": set.entrant2?.name || defaultGameEntrant.name,
        "entrant2.winner": set.entrant2?.winner || defaultGameEntrant.winner,
        "entrant2.opacity": set.entrant2?.opacity || defaultGameEntrant.opacity,
        "entrant2.score": set.entrant2?.score || defaultGameEntrant.score,
      }))
      .sort((a, b) => {
        const aId = a.identifier,
          bId = b.identifier;
        return aId.length - bId.length || aId.localeCompare(bId);
      }),
    remaining: await Promise.all(
      remaining.map(async ({ eliminations, entrant: sEntrant }) => {
        const entrant = await pService.parseEntrant(sEntrant);
        return {
          remainingWinners,
          remainingElimination,
          bracket: eliminations === 0 ? "Winner" : "Elimination",
          "entrant.1.name": entrant.player1?.name || "",
          "entrant.1.sponsor": entrant.player1?.sponsor || "",
          "entrant.1.sponsorPath": entrant.player1?.sponsor
            ? IMAGES.sponsor
            : IMAGES.blank,
          "entrant.1.legend": getLegendFull(entrant.player1?.legend),
          ...getLegendOffset(entrant.player1?.legend, "entrant.1"),
          "entrant.1.country": getCountryFlag(entrant.player1?.country),
          "entrant.2.name": entrant.player2?.name || "",
          "entrant.2.sponsor": entrant.player2?.sponsor || "",
          "entrant.2.sponsorPath": entrant.player2?.sponsor
            ? IMAGES.sponsor
            : IMAGES.blank,
          "entrant.2.legend": getLegendFull(entrant.player2?.legend),
          ...getLegendOffset(entrant.player2?.legend, "entrant.2"),
          "entrant.2.country": getCountryFlag(entrant.player2?.country),
        };
      })
    ),
  };
}

const incrementIdentifier = (oldIdentifier: string): string => {
  let lastLetter = oldIdentifier.charCodeAt(oldIdentifier.length - 1);
  let nextIdentifier = oldIdentifier;
  if (lastLetter === 90) {
    lastLetter = 64;
    if (oldIdentifier.length === 2) {
      const firstLetter = oldIdentifier.charCodeAt(0);
      nextIdentifier = nextIdentifier.replace(
        /^[A-Z]/,
        String.fromCharCode(firstLetter + 1)
      );
    } else {
      nextIdentifier = "AA";
    }
  }
  nextIdentifier = nextIdentifier.replace(
    /.$/,
    String.fromCharCode(lastLetter + 1)
  );
  return nextIdentifier;
};

const decrementIdentifier = (oldIdentifier: string): string => {
  let lastLetter = oldIdentifier.charCodeAt(oldIdentifier.length - 1);
  let nextIdentifier = oldIdentifier;
  if (lastLetter === 65) {
    lastLetter = 91;
    const firstLetter = oldIdentifier.charCodeAt(0);
    if (firstLetter === 65) {
      nextIdentifier = "Z";
    } else {
      nextIdentifier = nextIdentifier.replace(
        /^[A-Z]/,
        String.fromCharCode(firstLetter - 1)
      );
    }
  }
  nextIdentifier = nextIdentifier.replace(
    /.$/,
    String.fromCharCode(lastLetter - 1)
  );
  return nextIdentifier;
};

export async function getRoundRobinBracketExport(phaseGroupId: number) {
  const sgg = container.get<StartGGService>(TStartGGService);

  let sets: GameExport[];
  try {
    ({ games: sets } = await queryPhaseGroupSets(sgg, phaseGroupId, false));
  } catch (e) {
    throw new BackendError("Error when fetching sets.", "Start.GG", true);
  }
  sets.sort((a, b) => a.identifier.localeCompare(b.identifier));
  return sets
    .map((set) => ({
      id: set.id,
      identifier: set.identifier,
      round: set.round,
      "entrant1.name": set.entrant1?.name || defaultGameEntrant.name,
      "entrant1.winner": set.entrant1?.winner || defaultGameEntrant.winner,
      "entrant1.opacity": set.entrant1?.opacity || defaultGameEntrant.opacity,
      "entrant1.score": set.entrant1?.score || defaultGameEntrant.score,

      "entrant2.name": set.entrant2?.name || defaultGameEntrant.name,
      "entrant2.winner": set.entrant2?.winner || defaultGameEntrant.winner,
      "entrant2.opacity": set.entrant2?.opacity || defaultGameEntrant.opacity,
      "entrant2.score": set.entrant2?.score || defaultGameEntrant.score,
    }))
    .sort((a, b) => {
      const aId = a.identifier,
        bId = b.identifier;
      return aId.length - bId.length || aId.localeCompare(bId);
    });
}
