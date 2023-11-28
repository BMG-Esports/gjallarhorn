import SocketIORequest from "socket.io-request";
import { Server, Socket } from "socket.io";
import { inject, injectable } from "inversify";

import { ServerService } from "./server";
import { logger } from "../support/logging";
import { TServerService } from "@bmg-esports/gjallarhorn-tokens";

const log = logger("SocketService");

type Handler = (...args: any[]) => any;

@injectable()
export class SocketService {
  emit: Server["emit"];
  private io: Server;
  public external: Server;

  private _responseHandlers: {
    [endpoint: string]: { handler: Handler; scopes: string[] };
  } = {
    "/ping": {
      handler: () => void null,
      scopes: [],
    },
  };
  private _eventHandlers: {
    [evt: string]: { handler: Handler; scopes: string[] }[];
  } = {};

  constructor(@inject(TServerService) private _server: ServerService) {
    this.io = new Server(_server.server, {
      path: `/api/backend`,
    });

    this.external = new Server(_server.server, {
      path: `/api/external`,
      cors: {
        origin: "*",
      },
    });

    this.io.on("connection", (socket) => {
      log.info("Acquired new client.");
      this._setupHandlers(socket);
      socket.on("disconnect", () => {
        log.info("Lost client.");
      });
    });

    this.emit = this.io.emit.bind(this.io);
  }

  private _setupHandlers(socket: Socket) {
    socket.setMaxListeners(0); // We go way over lol

    const ioreq = SocketIORequest(socket);
    Object.entries(this._responseHandlers).map(
      ([endpoint, { handler, scopes }]) => {
        // Register to all known endpoints in scope.
        ioreq.response(endpoint, async (req: any[], res: any) => {
          try {
            res(await handler(...req));
          } catch (e) {
            res.error(e);
            throw e;
          }
        });
      }
    );

    Object.entries(this._eventHandlers).map(([evt, handlers]) => {
      // Register all event handlers in scope
      handlers.map(({ handler, scopes }) => {
        socket.on(evt, handler);
      });
    });

    socket.emit("ready");
  }

  respond(endpoint: string, handler: Handler, scopes: string[] = []) {
    if (this._responseHandlers[endpoint]) {
      throw `Found duplicate handler for "${endpoint}"!`;
    }
    this._responseHandlers[endpoint] = { handler, scopes };
  }

  on(evt: string, handler: Handler, scopes: string[] = []) {
    if (!this._eventHandlers[evt]) {
      this._eventHandlers[evt] = [];
    }
    this._eventHandlers[evt].push({ handler, scopes });
  }
}
