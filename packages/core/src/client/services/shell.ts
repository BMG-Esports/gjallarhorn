import { inject, injectable } from "inversify";
import { Subject } from "rxjs";
import { SocketService } from "./socket";

export type NotificationLevel = "info" | "error" | "critical";
export type Notification = {
  message?: string;
  level: NotificationLevel;
  source?: string;
  id: number;
};

@injectable()
export class ShellService {
  public notifications$ = new Subject<Notification>();
  id = 0;

  constructor(@inject(SocketService) socket: SocketService) {
    // Display backend errors as notifications.
    socket.on(
      "/shell/error",
      (message: string, source: string, fatal: boolean) => {
        console.error(
          `${fatal ? "Fatal " : ""}Backend Error${
            source ? " [" + source + "]" : ""
          }:`,
          message
        );
        this.notify(message, source, fatal ? "critical" : "error");
        if (fatal)
          this.notify(
            "A fatal error occured, some things may not work. Please check the logs for more info.",
            "System",
            "critical"
          );
      }
    );
  }

  notify(message: string, source?: string, level: NotificationLevel = "info") {
    this.notifications$.next({ message, source, level, id: this.id++ });
  }
}
