import {
  Card,
  CardDefinition,
  CardProps,
} from "../../../../client/ui/components/cards";
import { PushButton } from "../../../../client/ui/components/push-button";
import React, { forwardRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  RefreshCw,
  Trash,
} from "lucide-react";
import { useBackend } from "../../../../client/support/backend";
import { QueueBackend } from "../../../../backends/cards/queue";
import { Preloader } from "../../../../client/ui/components/loading";
import { InputRow } from "../../../../client/ui/fields/input-row";
import { Input } from "../../../../client/ui/fields/input";
import { QueueSet } from "../../../../backends/cards/queue";

import styles from "./style.scss";
import classNames from "classnames";
import { EntrantColumns } from "../../../../client/ui/components/entrants";
import {
  DirtyTrigger,
  useDirtyContainer,
} from "../../../../client/ui/fields/dirtyable";
import { AutoToggle } from "../../../../client/ui/fields/auto-toggle";
import { entrantName } from "../../../../client/support/hooks";
import { TQueueBackend } from "@bmg-esports/gjallarhorn-tokens";
import { Select } from "../../../ui/fields/dropdown";
import { Label } from "../../../ui/fields/label";
import { Button } from "../../../ui/fields/button";
import Popup from "reactjs-popup";

const QueuePreview = ({
  queue,
  active,
  setActive,
}: {
  queue: QueueSet[];
  active: number;
  setActive: (a: number) => void;
}) => {
  return (
    <div className={styles.preview}>
      {queue.map((q, i) => (
        <div
          key={i}
          className={classNames({
            [styles.active]: i === active,
            [styles.complete]: q.state === 3,
          })}
          onClick={() => setActive(i === active ? -1 : i)}
        >
          <div className={styles.round}>{q.round}</div>
          <div className={styles.set}>
            <div className={styles.entrant}>
              {entrantName(q.left) || <i>TBD</i>}
            </div>
            <div className={styles.score}>{q.score || "vs"}</div>
            <div className={styles.entrant}>
              {entrantName(q.right) || <i>TBD</i>}
            </div>
          </div>
          {q.state === 3 && <Check className={styles.complete} />}
        </div>
      ))}
      {Array(4 - queue.length)
        .fill(null)
        .map((_, i) => (
          <div key={i} className={styles.placeholder} />
        ))}
    </div>
  );
};

export const QueueControls = ({
  startIndex,
  setStartIndex,
  total,
}: {
  startIndex: number;
  setStartIndex: (idx: number) => void;
  total: number;
}) => {
  const visStart = Math.min(startIndex + 1, total);
  const visEnd = Math.min(visStart + 3, total);

  return (
    <div className={styles.controls}>
      <ChevronLeft
        className={classNames({ [styles.disabled]: startIndex <= 0 })}
        onClick={() => setStartIndex(startIndex - 1)}
      />
      <div>
        {visStart} – {visEnd} / {total}
      </div>
      <ChevronRight
        className={classNames({ [styles.disabled]: startIndex >= total - 1 })}
        onClick={() => setStartIndex(startIndex + 1)}
      />
    </div>
  );
};

export const Queue = forwardRef<HTMLDivElement, CardProps>((props, ref) => {
  const b = useBackend<QueueBackend>(TQueueBackend);
  const { dirty, markReset, wrapDirty } = useDirtyContainer(
    b.useState("dirtyState")
  );
  const [queue, setQueue] = b.useState("queue", []);
  const queues = b.useState("queues")[0];
  const [activeQueue, setActiveQueue] = b.useState("activeQueue");
  const [startIndex, setStartIndex] = b.useState("startIndex");
  const [autoFetch, setAutoFetch] = b.useState("autoFetch");
  const [active, setActive] = useState(-1);

  const pushLoadState = b.useState("pushLoadState")[0];
  const pushFetchState = b.useState("pushFetchState")[0];
  const pushQueueState = b.useState("pushQueueState")[0];

  const current = active > -1 && queue[startIndex + active];
  const setCurrent = (qs: QueueSet) => {
    queue[startIndex + active] = qs;
    setQueue([...queue]);
  };

  return (
    <Card
      ref={ref}
      {...props}
      title="Queue"
      dirty={dirty}
      icon={<Layers />}
      header={
        <PushButton
          dirty={dirty}
          flat
          state={pushQueueState}
          onClick={() => (b.push(), markReset())}
        >
          Push
        </PushButton>
      }
    >
      {wrapDirty(
        <Preloader fields={[queue, queues, startIndex, autoFetch]}>
          <DirtyTrigger v={JSON.stringify([queue, startIndex])} />
          <InputRow>
            <InputRow noGap>
              <Label label="Active Queue">
                <Select
                  dirtyable={false}
                  value={activeQueue || ""}
                  onChange={(e) => setActiveQueue(e.target.value)}
                >
                  <option value={""}>None</option>
                  {queues?.map((q) => (
                    <option value={q} key={q}>
                      {q}
                    </option>
                  ))}
                </Select>
              </Label>
              <PushButton
                icon
                state={pushLoadState}
                onClick={() => b.loadQueues()}
              >
                <RefreshCw />
              </PushButton>
            </InputRow>
            <AutoToggle
              enabled={autoFetch}
              disabled={!activeQueue}
              setEnabled={setAutoFetch}
              label="60s"
            >
              <PushButton
                disabled={!activeQueue}
                state={pushFetchState}
                onClick={() => b.fetch()}
              >
                Fetch Queue
              </PushButton>
            </AutoToggle>
            <Popup
              on="hover"
              trigger={
                <Button
                  icon
                  onClick={() =>
                    confirm("Are you sure you want to clear the queue?") &&
                    b.clear()
                  }
                >
                  <Trash />
                </Button>
              }
            >
              <div className="popup-tooltip">Clear Queue</div>
            </Popup>
          </InputRow>
          <QueueControls
            startIndex={startIndex}
            setStartIndex={setStartIndex}
            total={queue?.length}
          />
          <QueuePreview
            queue={queue?.slice(startIndex, startIndex + 4)}
            active={active}
            setActive={setActive}
          />
          {current && (
            <EntrantColumns
              key={current.id}
              left={current?.left || {}}
              right={current?.right || {}}
              setLeft={(left) => setCurrent({ ...current, left })}
              setRight={(right) => setCurrent({ ...current, right })}
              middle={
                <>
                  <Input
                    type={"checkbox"}
                    label={"Custom Score"}
                    checked={current?.customScore}
                    onChange={(e) =>
                      setCurrent({ ...current, customScore: e.target.checked })
                    }
                  />
                  <Input
                    disabled={!current?.customScore}
                    style={{ textAlign: "center" }}
                    value={current?.score || "vs"}
                    onChange={(e) =>
                      setCurrent({ ...current, score: e.target.value })
                    }
                    label={"Score"}
                  />

                  <Input
                    type={"checkbox"}
                    label={"Custom Round"}
                    checked={current?.customRound}
                    onChange={(e) =>
                      setCurrent({ ...current, customRound: e.target.checked })
                    }
                  />
                  <Input
                    disabled={!current?.customRound}
                    style={{ textAlign: "center" }}
                    value={current?.round || ""}
                    onChange={(e) =>
                      setCurrent({ ...current, round: e.target.value })
                    }
                    label={"Round"}
                  />

                  <Input
                    type={"checkbox"}
                    label={"Custom Start Time"}
                    checked={current?.customStartTime}
                    onChange={(e) =>
                      setCurrent({
                        ...current,
                        customStartTime: e.target.checked,
                      })
                    }
                  />
                  <Input
                    disabled={!current?.customStartTime}
                    style={{ textAlign: "center" }}
                    value={current?.startTime || ""}
                    onChange={(e) =>
                      setCurrent({ ...current, startTime: e.target.value })
                    }
                    label={"Start Time"}
                  />
                </>
              }
            />
          )}
          <div style={{ marginTop: 10 }}>
            <PushButton
              dirty={dirty}
              state={pushQueueState}
              onClick={() => (b.push(), markReset())}
            >
              Push Queue
            </PushButton>
          </div>
        </Preloader>
      )}
    </Card>
  );
});
Queue.displayName = "Queue";

const definition: CardDefinition = {
  title: "Queue",
  id: "queue",
  component: Queue,
};

export default definition;
