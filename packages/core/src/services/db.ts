import { PRInformation } from "../@types/types";
import { inject, injectable } from "inversify";
import { CacheService } from "./cache";
import { BackendError } from "../support/errors";
import { StatusBackend } from "../backends/pages/status";
import { TCacheService, TStatusBackend } from "@bmg-esports/gjallarhorn-tokens";
import {
  getMatchup,
  getPlayer,
  getPlayerMatches,
  getPlayerPR,
  getPlayerPlacements,
  getPlayerRecentLegend,
} from "@bmg-esports/sdk";

@injectable()
export class DBService {
  @inject(TCacheService) private cache: CacheService;
  @inject(TStatusBackend) private status: StatusBackend;

  /**
   * Fetch a player's most recent legend.
   */
  async getPlayerLegend(id: number): Promise<string> {
    try {
      const res = await getPlayerRecentLegend({ playerId: id });
      this.status.recordDB();
      return res.legend.name;
    } catch (e) {
      throw new BackendError(
        "Error when fetchng player legend information.",
        "DB",
        true,
        e
      );
    }
  }

  /**
   * Fetch a player's PR information.
   */
  async getPlayerPR(id: number, gameMode: number): Promise<PRInformation> {
    try {
      const res = await getPlayerPR({
        entrantSmashId: id,
        gameMode,
      });
      this.status.recordDB();
      const { pr, earnings } = res;
      return {
        pr: pr?.powerRanking || 0,
        earnings: earnings || 0,
        top8: pr?.top8 || 0,
        top32: pr?.top32 || 0,
        gold: pr?.gold || 0,
        silver: pr?.silver || 0,
        bronze: pr?.bronze || 0,
        region: pr?.region || "",
      };
    } catch (e) {
      throw new BackendError("Error when fetching player PR.", "DB", true, e);
    }
  }

  // TODO: Migrate getMatchup to the new API.
  async getMatchup(
    entrant1SmashIds: number[],
    entrant2SmashIds: number[],
    gameMode: number
  ): Promise<[number, number]> {
    try {
      const matchup = await getMatchup({
        entrant1SmashIds,
        entrant2SmashIds,
        gameMode,
      });
      this.status.recordDB();
      return matchup.matchups?.[0]?.matches ?? [0, 0];
    } catch (e) {
      if (e.response?.status === 400) {
        return [0, 0];
      }
      throw new BackendError(
        `Error fetching player matchup ${entrant1SmashIds
          .concat(entrant2SmashIds)
          .join(", ")}`,
        "DB",
        true,
        e
      );
    }
  }

  async getPlayer(id: number) {
    try {
      const player = await getPlayer({ smashId: id });
      this.status.recordDB();
      return player;
    } catch (e) {
      throw new BackendError(
        "Error when fetching player information.",
        "DB",
        true,
        e
      );
    }
  }

  async getPlayerEvents(id: number, gameMode: number) {
    try {
      const placements = await getPlayerPlacements({
        entrantSmashIds: [id],
        gameMode,
        isOfficial: true,
      });
      this.status.recordDB();
      return placements.playerPlacements;
    } catch (e) {
      throw new BackendError(
        "Error when fetching player tournament history",
        "DB",
        true,
        e
      );
    }
  }

  async getPlayerEventMatches(id: number, slug: string) {
    try {
      const matches = await getPlayerMatches({ entrantSmashIds: [id], slug });
      this.status.recordDB();
      return matches.playerMatches;
    } catch (e) {
      throw new BackendError(
        "Error when fetching player tournament matches",
        "DB",
        true,
        e
      );
    }
  }
}
