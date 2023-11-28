import { inject, injectable } from "inversify";
import { ServerService } from "./server";
import express from "express";
import serveIndex from "serve-index";
import path from "path";
import fs from "fs/promises";
import cfg from "../config";
import { SocketService } from "./socket";
import { logger } from "../support/logging";
import {
  TServerService,
  TSocketService,
} from "@bmg-esports/gjallarhorn-tokens";
import { EventEmitter } from "stream";

const log = logger("OutputService");
@injectable()
export class OutputService {
  private OUTPUT_FOLDER = path.resolve(cfg.OUTPUT_PATH);
  public evt = new EventEmitter();

  @inject(TSocketService) private _socket: SocketService;

  constructor(@inject(TServerService) srv: ServerService) {
    fs.mkdir(this.OUTPUT_FOLDER, { recursive: true });

    // Serve the output folder
    srv.api.use("/json", express.static(this.OUTPUT_FOLDER));
    srv.api.use("/json", serveIndex(this.OUTPUT_FOLDER));

    log.info("Output will be written to " + this.OUTPUT_FOLDER);
  }

  public async resolveOutputPath(parts: string | string[]) {
    if (typeof parts === "string") {
      parts = [parts];
    }

    const fp = path.join(this.OUTPUT_FOLDER, ...parts);
    await fs.mkdir(path.dirname(fp), { recursive: true });
    return fp;
  }

  public async writeFile(file: string | string[], data: any) {
    const dst = await this.resolveOutputPath(file);
    await fs.writeFile(dst, data);
    this._socket.external.emit("writeFile", file, data);
    this.evt.emit("writeFile", file, data);
  }

  /**
   * @param file File path to write
   * @param data Data to put in file
   * @param arrayify Whether to wrap the data in an array if isn't already.
   *    This is needed for vMix since it can't handle objects that aren't in
   *    arrays.
   */
  public async writeJSON(file: string | string[], data: any, arrayify = true) {
    if (arrayify && !Array.isArray(data)) data = [data];
    if (!Array.isArray(file)) file = [file];

    await this.writeFile(file, JSON.stringify(data, null, 2));
  }
}
