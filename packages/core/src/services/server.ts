import express from "express";
import http from "http";
import { injectable } from "inversify";
import path from "path";
import cfg from "../config";
import { logger } from "../support/logging";
import fsExtra from "fs-extra";
import cors from "cors";
import { resolveTemp } from "../support/temp";

const log = logger("ServerService");

const CLIENT_PATH = path.resolve(__dirname, "..", "client");
@injectable()
export class ServerService {
  app = express();
  api = express.Router();
  server = http.createServer(this.app);

  constructor() {
    const { app, api, server } = this;

    app.use(cors());

    server.listen(cfg.PORT, () =>
      log.info(`Backend listening on port ${cfg.PORT}`)
    );
    resolveTemp("client").then((p) => {
      try {
        fsExtra.copySync(CLIENT_PATH, p);
        log.info(`Serving from ${p}`);
      } catch (e) {
        log.error(`Client bundle not found.`);
      }
      app.use("/api", api);
      app.use(express.static(p));
      app.use((req, res, next) => {
        if (req.url.startsWith("/api")) return next();
        return res.sendFile(path.resolve(p, "index.html"));
      });
    });

    api.use("/config", (_, res) => res.send(cfg));
  }
}
