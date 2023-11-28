import glob from "glob";
import fs from "fs";
import { resolveTemp } from "./temp";
import path from "path";
import sanitize from "sanitize-filename";
import { logger } from "./logging";

const log = logger("Persistent");

const loadedPersistent: {
  [name: string]: { state: any; lastValues: any };
} = {};

export async function loadPersistent(root = "persistent") {
  const foundBackends: string[] = [];
  // Load all the saved JSON state from the fs, if it exists.
  glob.sync(path.resolve(await resolveTemp(root), "*.json")).forEach((fp) => {
    const { name } = path.parse(fp);
    foundBackends.push(name);
    loadedPersistent[name] = JSON.parse(
      fs.readFileSync(fp).toString(),
      (_, v) =>
        typeof v === "object" && v?.$$STREAM_TOOL_UNDEFINED ? undefined : v
    );
    // Delete it once we've read it.
    fs.rmSync(fp);
  });
  if (foundBackends.length) log.info(`Found ${foundBackends.join(", ")}`);
  else log.info("No saved state found.");
  return loadedPersistent;
}

/**
 * Write a persistent file.
 */
export async function writePersistent(
  serviceName: string,
  state: any,
  lastValues: any,
  path?: string
) {
  await fs.promises.writeFile(
    await resolveTemp(path || "persistent", `${sanitize(serviceName)}.json`),
    JSON.stringify(
      {
        state,
        lastValues,
      },
      (_, v) => {
        if (v === undefined) return { $$STREAM_TOOL_UNDEFINED: true };
        return v;
      },
      2
    )
  );
}

export function getPersistent(serviceName: string) {
  return (
    loadedPersistent[sanitize(serviceName)] || {
      state: null,
      lastValues: null,
    }
  );
}
