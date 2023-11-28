import { Config } from "./@types/types";

const config: Config = {
  NAME: "Local",
  HOST: "http://localhost:3000",
  PORT: 3000,
  OUTPUT_PATH: "",
  TEMP_PATH: "",
  PLAYER_OVERRIDES: {
    // Boomie
    153043: {
      country: "United States",
    },
    1050211: {
      country: "United States",
    },
  },
  STARTGG_API_KEY: "",
};

export const update = (cfg: Partial<Config>) => Object.assign(config, cfg);

export default config;
