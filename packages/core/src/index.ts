import "reflect-metadata";

import { Config } from "./@types/types";
import { bind, container } from "./support/di-container";
import { update } from "./config";
import { loadPersistent } from "./support/persistent";
import bindings from "./bindings";

import { System } from "./system";
import { TSystem } from "@bmg-esports/gjallarhorn-tokens";

let started = false;

/**
 * Bootstrap the server with the given config.
 */
export async function start(cfg: Partial<Config>) {
  if (started) throw new Error("Server has already been started!");
  // Update the config.
  update(cfg);

  await loadPersistent();
  bind(bindings);

  // Bootstrap the application!
  started = true;
  return container.get<System>(TSystem);
}

export * from "./support/di-container";
export * from "./@types/types";
export { default as config } from "./config";
