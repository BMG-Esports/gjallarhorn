import path from "path";
import fs from "fs/promises";

import config from "../config";

export async function resolveTemp(...parts: string[]) {
  const fp = path.resolve(config.TEMP_PATH, ...parts);
  await fs.mkdir(path.dirname(fp), { recursive: true });
  return fp;
}
