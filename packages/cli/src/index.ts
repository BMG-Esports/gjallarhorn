#!/usr/bin/env node

import { Command, Option } from "commander";
import { config, container, start } from "@bmg-esports/gjallarhorn-core";
import * as tokens from "@bmg-esports/gjallarhorn-tokens";
import open from "open";
import fs = require("fs");
import path = require("path");

const { version } = require("../package.json");

interface UserConfig {
  name?: string;
  port?: number;
  output?: string;
  startgg?: string;
  challengermode?: string;
}

const CONFIG_TEMPLATE: UserConfig = {
  name: config.NAME,
  port: config.PORT,
  output: "output",
  startgg: "",
  challengermode: "",
};

function loadUserConfig(): UserConfig {
  const isPkg = !!(process as any).pkg;
  const configDir = isPkg ? path.dirname(process.execPath) : process.cwd();
  const configPath = path.join(configDir, "gjallarhorn.config.json");

  if (isPkg && !fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(CONFIG_TEMPLATE, null, 2));
  }

  if (!fs.existsSync(configPath)) return {};

  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return {};
  }
}

const userConfig = loadUserConfig();

const program = new Command();

program
  .name("gjallarhorn")
  .description(
    "A collection of tools to run a tournament livestream using data from start.gg."
  )
  .version(version)
  .addOption(
    new Option("-n, --name <string>", "friendly name")
      .default(userConfig.name ?? config.NAME)
      .env("GJALLARHORN_NAME")
  )
  .addOption(
    new Option("-H, --host <string>", "hostname")
      .default(config.HOST)
      .env("GJALLARHORN_HOST")
  )
  .addOption(
    new Option("-p, --port <number>", "port number")
      .default(userConfig.port ?? config.PORT)
      .env("GJALLARHORN_PORT")
      .argParser((v) => parseInt(v, 10))
  )
  .addOption(
    new Option("-o, --output <path>", "output path")
      .default(path.resolve(userConfig.output ?? "output"))
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
      .default(userConfig.startgg || undefined)
      .env("GJALLARHORN_STARTGG")
  )
  .addOption(
    new Option("-cm, --challengermode <key>", "challengermode API refresh key")
      .default(userConfig.challengermode || undefined)
      .env("GJALLARHORN_CM_REFRESH_KEY")
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
      CM_REFRESH_KEY: args.challengermode,
    });
    glob.container = container;
    if ((process as any).pkg) open(args.host);
    glob.tokens = tokens;
    Object.entries(tokens).map(
      ([name, token]) => (glob[name] = container.get(token))
    );
  });

program.parse();
