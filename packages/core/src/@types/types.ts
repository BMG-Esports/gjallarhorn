export type Player = {
  /**
   * Player ID. Set in both cases (i.e. whether or not ad-hoc)
   */
  id?: number;
  sponsor?: string;
  name?: string;
  country?: string;
  legend?: string;
  twitter?: string;
  twitch?: string;
};

export type Entrant = {
  /**
   * Whether the given entrant is a start.gg entrant or a custom entrant (i.e.
   * from the player database)
   */
  isStartGG?: boolean;
  score?: number;

  /**
   * Entrant ID. Only set if isStartGG is true.
   */
  id?: number;

  player1?: Player;
  player2?: Player;
};

export type PRInformation = {
  // zero = not PR'd
  pr: number;
  earnings: number;
  top8: number;
  top32: number;
  gold: number;
  silver: number;
  bronze: number;
  region: string;
};

export const Tuple = <T extends any[]>(...args: T): T => args;
export type Newable = { new (...args: any[]): any };

export type PushButtonState = {
  status?: -1 | 0 | 1;
  lastPush?: number;
};

export type DirtyState = boolean;

export type Config = {
  /**
   * Friendly name.
   */
  NAME: string;

  /**
   * Host path.
   */
  HOST: string;

  /**
   * Server port number
   */
  PORT: number;

  /**
   * Folder where output is written.
   */
  OUTPUT_PATH: string;

  /**
   * Folder where temp files are written.
   */
  TEMP_PATH: string;

  /**
   * start.gg API key.
   */
  STARTGG_API_KEY: string;

  PLAYER_OVERRIDES: { [id: number]: Player };
};

export enum PhaseGroupType {
  T4_PROG,
  T8_PROG,
  T16_INV,
  T32_PROG,
  T32_INV,
}
