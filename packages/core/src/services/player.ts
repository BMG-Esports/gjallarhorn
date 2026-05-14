import {
  Entrant as SEntrant,
  Participant as SParticipant,
  Player as SPlayer,
} from "../@types/startgg";
import { Player, Entrant } from "../@types/types";
import { inject, injectable } from "inversify";
import { StartGGService } from "./startgg";
import cfg from "../config";
import { DBService } from "./db";
import { ErrorService } from "./error";
import { BackendError } from "../support/errors";
import _ from "lodash";
import {
  TDBService,
  TErrorService,
  TStartGGService,
  TTournamentBackend,
} from "@bmg-esports/gjallarhorn-tokens";
import { TournamentBackend } from "../backends/pages/tournament";
import {
  GQLTournamentLineup,
  GQLUserProfile,
} from "../@types/challengermode";

@injectable()
export class PlayerService {
  @inject(TErrorService) private errors: ErrorService;
  @inject(TStartGGService) private sgg: StartGGService;
  @inject(TDBService) private db: DBService;
  @inject(TTournamentBackend) private t: TournamentBackend;

  /**
   * Convert a start.gg entrant to a Gjallarhorn entrant.
   */
  async parseEntrant(
    sEntrant: SEntrant,
    fetchLegends = true
  ): Promise<Entrant> {
    if (!sEntrant) return {};
    const e: Entrant = {};
    const players = await Promise.all(
      sEntrant.participants.map((p) => this.parseParticipant(p, fetchLegends))
    );

    e.player1 = players[0];
    e.player2 = {};

    if (sEntrant.team) {
      // Is twos
      e.player2 = players[1];
      if (sEntrant.team.members?.[0]?.player?.id !== e.player1.id) {
        // Need to swap to match team order.
        [e.player1, e.player2] = [e.player2, e.player1];
      }
    }

    return e;
  }

  /**
   * Convert a challengermode lineup to a Gjallarhorn entrant.
   */
  async parseLineup(
    lineup: GQLTournamentLineup,
    fetchLegends = true
  ): Promise<Entrant> {
    if (!lineup) return {};
    const e: Entrant = {};
    const users = await Promise.all(
      lineup.members.map((m) => this.parseUser(m.user, fetchLegends))
    );

    e.player1 = users[0];
    e.player2 = {};

    if (users.length === 2) {
      e.player2 = users[1];
    }

    return e;
  }

  /**
   * Convert a start.gg participant to a Gjallarhorn player.
   */
  async parseParticipant(
    participant: SParticipant,
    fetchLegend = true
  ): Promise<Player> {
    const playerId = (await this.db.getPlayerBySggId(participant?.player?.id))
      .player.playerId;
    const p: Player = {
      id: playerId,
      name: participant?.gamerTag || "",
      sponsor: participant?.prefix || "",
      country:
        participant?.contactInfo?.country ||
        participant?.user?.location?.country ||
        "Unknown",
      legend: "UNKNOWN",
      twitch:
        participant?.user?.authorizations?.find((a) => a.type === "TWITCH")
          ?.externalUsername || "",
      twitter:
        participant?.user?.authorizations?.find((a) => a.type === "TWITTER")
          ?.externalUsername || "",
    };
    if (fetchLegend && p.id) {
      p.legend = (await this.getRecentLegend(p.id)) || "UNKNOWN";
    }
    if (cfg.PLAYER_OVERRIDES[p.id]) {
      Object.assign(p, cfg.PLAYER_OVERRIDES[p.id]);
    }
    return p;
  }

  /**
   * Convert a challengermode user to a Gjallarhorn player.
   */
  async parseUser(user: GQLUserProfile, fetchLegend = true): Promise<Player> {
    const playerId = (await this.db.getPlayerByCmId(user.userId))?.player
      ?.playerId;
    const p: Player = {
      id: playerId || 0,
      name: user.username,
      sponsor: "",
      country: "Unknown",
      legend: "UNKNOWN",
      twitch:
        user.connectedAccounts?.find((ca) => ca.provider === "TWITCH")?.id ||
        "",
      twitter: "",
    };
    if (cfg.PLAYER_OVERRIDES[p.id]) {
      Object.assign(p, cfg.PLAYER_OVERRIDES[p.id]);
    }
    return p;
  }

  async parsePlayer(player: SPlayer, fetchLegend = true): Promise<Player> {
    const playerId = (await this.db.getPlayerBySggId(player?.id)).player
      .playerId;
    const p: Player = {
      id: playerId,
      name: player?.gamerTag || "",
      sponsor: player?.prefix || "",
      country: player?.user?.location?.country || "Unknown",
      legend: "UNKNOWN",
      twitch:
        player?.user?.authorizations?.find((a) => a.type === "TWITCH")
          ?.externalUsername || "",
      twitter:
        player?.user?.authorizations?.find((a) => a.type === "TWITTER")
          ?.externalUsername || "",
    };
    if (fetchLegend && p.id) {
      try {
        p.legend = (await this.db.getPlayerLegend(p.id)) || "UNKNOWN";
      } catch (e) {
        if (e instanceof BackendError) {
          this.errors.report(e.nonFatal());
          p.legend = "UNKNOWN";
        }
      }
    }
    if (cfg.PLAYER_OVERRIDES[p.id]) {
      Object.assign(p, cfg.PLAYER_OVERRIDES[p.id]);
    }
    return p;
  }

  /**
   * Get the most recently-played legend for a given player, or null if none.
   */
  async getRecentLegend(playerId: number) {
    const reqs = [this.db.getPlayerLegend(playerId)];
    if (this.t.state.sggTournament.entrantSize === 1) {
      // If singles, query the active event for the legend first, if available.
      reqs.unshift(
        this.sgg.getRecentLegendByPlayer(
          playerId,
          this.t.state.sggTournament.eventId
        )
      );
    }

    try {
      return (await Promise.all(reqs)).find((l) => l) || null;
    } catch (e) {
      if (e instanceof BackendError) {
        this.errors.report(e.nonFatal());
        return null;
      }

      throw e;
    }
  }

  async getPR(playerId: number) {
    if (!playerId) return null;
    try {
      return await this.db.getPlayerPR(
        playerId,
        this.t.state.isChallengerMode
          ? this.t.state.cmTournament.entrantSize
          : this.t.state.sggTournament.entrantSize
      );
    } catch (e) {
      if (e instanceof BackendError) {
        this.errors.report(e.nonFatal());
        return null;
      }

      throw e;
    }
  }

  async getPlayerWinrate(playerId: number) {
    if (!playerId) return null;
    try {
      const gameMode = this.t.state.isChallengerMode
        ? this.t.state.cmTournament.entrantSize
        : this.t.state.sggTournament.entrantSize;
      const events = await this.db.getPlayerEvents(playerId, gameMode);
      const allMatches = events.map(async (event) =>
        this.db.getPlayerEventMatches(playerId, event.tournament.id)
      );
      const matchWins = (await Promise.all(allMatches))
        .flat()
        .map((match) => [match.scores[0] > match.scores[1] ? 1 : 0, 1])
        .reduce((prev, curr) => [prev[0] + curr[0], prev[1] + curr[1]], [0, 0]);
      if (matchWins[1] === 0) return null;
      const wr = matchWins[0] / matchWins[1];
      return `${Math.round(wr * 100)}%`;
    } catch (e) {
      if (e instanceof BackendError) {
        this.errors.report(e.nonFatal());
        return null;
      }

      throw e;
    }
  }

  async getMatchup(left: Entrant, right: Entrant): Promise<[number, number]> {
    const gameMode = this.t.state.isChallengerMode
      ? this.t.state.cmTournament.entrantSize
      : this.t.state.sggTournament.entrantSize;
    const entrant1PlayerIds = [left?.player1?.id],
      entrant2PlayerIds = [right?.player1?.id];
    if (gameMode === 2) {
      entrant1PlayerIds.push(left?.player2?.id);
      entrant2PlayerIds.push(right?.player2?.id);
    }

    if (entrant1PlayerIds.concat(entrant2PlayerIds).some((id) => !id))
      return [0, 0];

    try {
      return await this.db.getMatchup(
        entrant1PlayerIds,
        entrant2PlayerIds,
        gameMode
      );
    } catch (e) {
      if (e instanceof BackendError) {
        this.errors.report(e.nonFatal());
        return [0, 0];
      }

      throw e;
    }
  }

  async getPlayer(id: number) {
    if (!id) return null;
    try {
      return (await this.db.getPlayer(id))?.player || null;
    } catch (e) {
      if (e instanceof BackendError) {
        this.errors.report(e.nonFatal());
        return null;
      }

      throw e;
    }
  }
}
