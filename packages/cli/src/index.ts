#!/usr/bin/env node

import { Command, Option } from "commander";
import { config, container, start } from "@bmg-esports/gjallarhorn-core";
import * as tokens from "@bmg-esports/gjallarhorn-tokens";
import path = require("path");

const { version } = require("../package.json");

const program = new Command();

program
  .name("gjallarhorn")
  .description(
    "A collection of tools to run a tournament livestream using data from start.gg."
  )
  .version(version)
  .addOption(
    new Option("-n, --name <string>", "friendly name")
      .default(config.NAME)
      .env("GJALLARHORN_NAME")
  )
  .addOption(
    new Option("-H, --host <string>", "hostname")
      .default(config.HOST)
      .env("GJALLARHORN_HOST")
  )
  .addOption(
    new Option("-p, --port <number>", "port number")
      .default(config.PORT)
      .env("GJALLARHORN_PORT")
      .argParser((v) => parseInt(v, 10))
  )
  .addOption(
    new Option("-o, --output <path>", "output path")
      .default(path.resolve("output"))
      .env("GJALLARHORN_OUTPUT")
      .argParser((v) => path.resolve(v))
  )
  .addOption(
    new Option("-t, --temp <path>", "temp path")
      .default(path.resolve("temp"))
      .env("GJALLARHORN_TEMP")
      .argParser((v) => path.resolve(v))
  )
  .addOption(
    new Option("-s, --startgg <key>", "start.gg API key")
      .env("GJALLARHORN_STARTGG")
      .makeOptionMandatory()
  )
  .action(async (args) => {
    const glob: any = global;
    glob.system = await start({
      NAME: args.name,
      HOST: args.host,
      PORT: args.port,
      OUTPUT_PATH: args.output,
      TEMP_PATH: args.temp,
      STARTGG_API_KEY: args.startgg,
    });
    glob.container = container;
    glob.tokens = tokens;
    Object.entries(tokens).map(
      ([name, token]) => (glob[name] = container.get(token))
    );
  });

program.parse();
