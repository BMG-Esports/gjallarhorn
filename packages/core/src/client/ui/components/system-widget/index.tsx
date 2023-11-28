import { StatusBackend } from "../../../../backends/pages/status";
import { System } from "../../../../system";
import { TStatusBackend, TSystem } from "@bmg-esports/gjallarhorn-tokens";
import classNames from "classnames";
import { useInjection } from "inversify-react";
import { CheckCircle, Server, ServerCrash, Skull } from "lucide-react";
import React, { useEffect, useState } from "react";
import Popup from "reactjs-popup";
import { SocketService } from "../../../services/socket";
import { useBackend } from "../../../support/backend";
import { Button } from "../../fields/button";
import styles from "./style.scss";
import { InputRow } from "../../fields/input-row";

const colors = {
  red: styles.red,
  green: styles.green,
  yellow: styles.yellow,
  gray: styles.gray,
};

const Progress = ({
  label,
  value,
  max,
  warning = 0.5,
}: {
  label: string;
  value: number;
  max: number;
  warning?: number;
}) => {
  const ratio = value / max;
  return (
    <div className={styles.progressContainer}>
      <header>
        <span>{label}</span>
        <span>{value}/m</span>
      </header>
      <div
        className={classNames(styles.progress, {
          [styles.warning]: ratio > warning,
        })}
      >
        <div style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
};

/**
 * Status component with everything (connection, fatal).
 */
export const SystemWidget = () => {
  const socket = useInjection(SocketService);
  const [connected, setConnected] = useState(socket.socket?.connected || false);
  useEffect(() => {
    const sub = socket.connected$.subscribe((c) => setConnected(c));
    return () => sub.unsubscribe();
  }, [socket, setConnected]);

  const [latency, setLatency] = useState(0);
  useEffect(() => {
    const sub = socket.latency$.subscribe((l) => setLatency(l));
    return () => sub.unsubscribe();
  }, [socket, setLatency]);

  const b = useBackend<System>(TSystem);
  const status = b.useState("status", {
    fatal: false,
  })[0];

  const { fatal } = status;

  const statusB = useBackend<StatusBackend>(TStatusBackend);
  const [startGGRate, dbRate] = [
    statusB.useState("startGGRate", 0)[0],
    statusB.useState("dbRate", 0)[0],
  ];

  let Icon = !connected ? ServerCrash : fatal ? Skull : CheckCircle;
  let iconColor = !connected
    ? colors.yellow
    : !fatal
    ? colors.green
    : colors.red;

  return (
    <Popup
      on="hover"
      position="bottom right"
      arrow={false}
      trigger={
        <div className={classNames(styles.system)}>
          <Icon className={iconColor} />
        </div>
      }
    >
      <div className={styles.systemPopup}>
        {fatal && (
          <div>
            <h3 className={colors.red}>Fatal Error</h3>
            <p>Gjallarhorn experienced a fatal error and must be inspected.</p>
            <InputRow>
              <Button
                onClick={() =>
                  confirm("Are you sure you want to mark this as non-fatal?") &&
                  b.markNonFatal()
                }
              >
                Mark Non-Fatal
              </Button>
              <Button
                onClick={() =>
                  confirm(
                    "WARNING: This action will clear all fields. Are you sure you want to proceed?"
                  ) && b.coldRestart()
                }
              >
                Restart
              </Button>
            </InputRow>
          </div>
        )}
        <div className={styles.latency}>Latency: {Math.round(latency)}ms</div>
        <div className={styles.indicators}>
          <div
            className={
              fatal ? colors.red : connected ? colors.green : colors.yellow
            }
          >
            <Server />
            <span>Gjallarhorn</span>
          </div>
        </div>
        <div className={styles.rates}>
          <Progress
            value={startGGRate}
            max={80}
            warning={0.8}
            label="start.gg"
          />
          <Progress value={dbRate} max={80} warning={0.8} label="DB" />
        </div>
      </div>
    </Popup>
  );
};
