export type Player = {
  player: {
    smashId: number;
    brawlhallaId: number;
    name: string;
  };
};

export type PRInformation = {
  top8: number;
  top32: number;
  gold: number;
  silver: number;
  bronze: number;
  powerRanking: number;
  region: string;
};

export type PlayerPR = {
  earnings: number;
  pr: PRInformation;
};

export type PlayerLegend = {
  legend: {
    name: string;
    count: number;
  };
};

export type Matchup = {
  matchups: {
    matches: [number, number];
    games: [number, number];
  }[];
};

export type PlayerPlacements = {
  playerPlacements: {
    placement: number;
    tournament: {
      slug: string;
    };
  }[];
};

export type PlayerMatches = {
  playerMatches: {
    matchId: number;
    scores: [number, number];
  }[];
};
