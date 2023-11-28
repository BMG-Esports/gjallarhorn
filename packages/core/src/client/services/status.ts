import { inject, injectable } from "inversify";
import { SocketService } from "./socket";

@injectable()
export class StatusService {
  constructor(@inject(SocketService) private socket: SocketService) {
    socket.on("/status/fatal", (...args: any[]) => {
      console.log("Fatal Backend Error", ...args);
    });
  }
}
