import classNames from "classnames";
import { useInjection } from "inversify-react";
import React from "react";
import { useEffect, useState } from "react";
import { ShellService } from "../services/shell";
import { Notification } from "../services/shell";
import { SocketService } from "../services/socket";
import { useUpdate } from "../support/hooks";
import styles from "./shell.scss";
import { Info, Skull, XOctagon } from "lucide-react";
import { Button } from "../ui/fields/button";

export const NotificationContainer = () => {
  // Notification rendering logic
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const shell = useInjection(ShellService);
  const socket = useInjection(SocketService);

  useEffect(() => {
    const sub = shell.notifications$.subscribe((notif) =>
      setNotifications((n) => [notif, ...n])
    );
    return () => sub.unsubscribe();
  }, [shell]);

  const [connected, setConnected] = useState(socket.socket?.connected || false);
  useEffect(() => {
    const sub = socket.connected$.subscribe((c) => setConnected(c));
    return () => sub.unsubscribe();
  }, [socket, setConnected]);

  useUpdate(() => {
    if (!connected) shell.notify("Reconnecting...", "System", "critical");
  }, [connected]);

  const counts = {
    info: 0,
    error: 0,
    critical: 0,
  };
  notifications.map((n) => counts[n.level]++);

  return (
    <div
      className={classNames(styles.notifications, {
        [styles.visible]: notifications.length,
      })}
    >
      <div className={styles.notificationsContainer}>
        {notifications.map((n) => (
          <div
            onClick={() =>
              setNotifications(notifications.filter((not) => not.id !== n.id))
            }
            key={n.id}
            className={classNames(styles.notification, {
              [styles.error]: n.level === "error",
              [styles.critical]: n.level === "critical",
              [styles.info]: n.level === "info",
            })}
          >
            <div className={styles.body}>
              {n.source && <div className={styles.source}>{n.source}</div>}
              <div>{n.message}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.notificationHeader}>
        <ul className={styles.counts}>
          <li>
            <Info />
            <span>{counts.info}</span>
          </li>
          <li>
            <XOctagon />
            <span>{counts.error}</span>
          </li>
          <li>
            <Skull />
            <span>{counts.critical}</span>
          </li>
        </ul>
        <Button onClick={() => setNotifications([])}>Clear</Button>
      </div>
    </div>
  );
};
