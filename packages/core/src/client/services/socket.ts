import { injectable } from "inversify";
import ioreq from "socket.io-request";
import { io, Socket } from "socket.io-client";
import { BehaviorSubject } from "rxjs";

@injectable()
export class SocketService {
  socket: Socket;
  private ioreq: any;
  private _ready: Promise<void>;
  private _readyRes: () => void;
  public connected$ = new BehaviorSubject(false);
  public latency$ = new BehaviorSubject(0);
  public initialized = false;

  constructor() {
    this._ready = new Promise((res) => (this._readyRes = res));
  }

  initialize() {
    this.socket = io({
      reconnectionDelay: 300,
      reconnectionDelayMax: 300,
      path: `/api/backend`,
      transports: ["websocket"],
      upgrade: false,
    });

    this.socket.on("connect", () => {
      if (this.initialized) {
        // Reconnection, we need to refresh to ensure we have the latest
        // things from the backend.
        window.location.reload();
      }

      console.log("Connected to server!");
      this.ioreq = ioreq(this.socket);
      this.socket.once("ready", () => {
        console.log("Ready!");
        this.initialized = true;
        this._readyRes();
        this.connected$.next(true);

        this._latencyTest();
      });
    });

    this.socket.on("disconnect", () => {
      console.error("Disconnected from backend!");
      this.connected$.next(false);
    });
  }

  private async _latencyTest() {
    const t = performance.now();
    await this.request("/ping");
    this.latency$.next((performance.now() - t) / 2);
    setTimeout(() => this._latencyTest(), 2000);
  }

  public async request(endpoint: string, ...args: any[]) {
    await this._ready;
    return await this.ioreq.request(endpoint, args);
  }

  public async once(ev: string, listener: any) {
    await this._ready;
    this.socket.once(ev, listener);
  }

  public async on(ev: string, listener: any) {
    await this._ready;
    this.socket.on(ev, listener);
  }

  public async off(ev: string, listener: any) {
    await this._ready;
    this.socket.off(ev, listener);
  }

  public async emit(ev: string, ...args: any[]) {
    await this._ready;
    this.socket.emit(ev, ...args);
  }
}
