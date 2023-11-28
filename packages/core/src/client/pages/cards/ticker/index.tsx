import {
  DragDropContext,
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
  Droppable,
} from "react-beautiful-dnd";
import { useBackend } from "../../../../client/support/backend";
import {
  Card,
  CardDefinition,
  CardProps,
} from "../../../../client/ui/components/cards";
import { Preloader } from "../../../../client/ui/components/loading";
import { PushButton } from "../../../../client/ui/components/push-button";
import { TickerBackend, TickerEntry } from "../../../../backends/cards/ticker";
import { List, MoveVertical, Trash } from "lucide-react";
import React, { forwardRef } from "react";
import styles from "./style.scss";
import ReactDOM from "react-dom";
import { Input } from "../../../../client/ui/fields/input";
import { Button } from "../../../../client/ui/fields/button";
import { InputRow } from "../../../../client/ui/fields/input-row";
import {
  DirtyTrigger,
  useDirtyContainer,
} from "../../../../client/ui/fields/dirtyable";
import { AutoToggle } from "../../../../client/ui/fields/auto-toggle";
import { TTickerBackend } from "@bmg-esports/gjallarhorn-tokens";

// To break out of the position-relative of card stuff.
const portal = document.createElement("div");
document.body.appendChild(portal);

const TickerEntryEditor = ({
  provided,
  snapshot,
  entry,
  setEntry,
  onDelete,
}: {
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  entry: TickerEntry;
  setEntry: (e: TickerEntry) => void;
  onDelete: () => void;
}) => {
  const usePortal = snapshot.isDragging;
  const child = (
    <div
      className={styles.entryContainer}
      ref={provided.innerRef}
      {...provided.draggableProps}
    >
      <div className={styles.entry}>
        <div className={styles.icon}>
          <div {...provided.dragHandleProps}>
            <MoveVertical />
          </div>
        </div>
        <div className={styles.editor}>
          <Input
            spellCheck
            className={styles.input}
            value={entry.subject || ""}
            placeholder="Subject"
            onChange={(e) => setEntry({ ...entry, subject: e.target.value })}
          />
          <Input
            spellCheck
            className={styles.input}
            placeholder="Body"
            value={entry.ticker || ""}
            onChange={(e) => setEntry({ ...entry, ticker: e.target.value })}
          />
        </div>
        <div className={styles.icon}>
          <Trash className={styles.delete} onClick={onDelete} />
        </div>
      </div>
    </div>
  );

  if (!usePortal) return child;
  return ReactDOM.createPortal(child, portal);
};

export const Ticker = forwardRef<HTMLDivElement, CardProps>((props, ref) => {
  const b = useBackend<TickerBackend>(TTickerBackend);
  const [entries, setEntries] = b.useState("entries");
  const pushState = b.useState("pushState")[0];
  const [autoShuffle, setAutoShuffle] = b.useState("autoShuffle");

  const { dirty, markReset, markDirty, wrapDirty } = useDirtyContainer(
    b.useState("dirtyState")
  );

  return (
    <Card
      ref={ref}
      {...props}
      title="Ticker"
      icon={<List />}
      dirty={dirty}
      header={
        <PushButton
          state={pushState}
          flat
          dirty={dirty}
          onClick={() => (b.push(), markReset())}
        >
          Push
        </PushButton>
      }
    >
      {wrapDirty(
        <Preloader fields={[entries, autoShuffle]}>
          <InputRow>
            <Button onClick={() => b.addEntry()}>Add</Button>
            <AutoToggle
              enabled={autoShuffle}
              setEnabled={setAutoShuffle}
              label="5m"
            >
              <Button onClick={() => (b.shuffle(), markReset())}>
                Shuffle
              </Button>
            </AutoToggle>
          </InputRow>

          <DragDropContext
            onDragEnd={(result) => {
              if (!result.destination) return; // out of bounds
              const [reordered] = entries.splice(result.source.index, 1);
              entries.splice(result.destination.index, 0, reordered);
              setEntries(entries);
              markDirty();
            }}
          >
            <Droppable droppableId="ticker">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={styles.entries}
                >
                  {entries?.map((e, i) => (
                    <Draggable key={e.id} draggableId={e.id} index={i}>
                      {(provided, snapshot) => (
                        <TickerEntryEditor
                          provided={provided}
                          snapshot={snapshot}
                          entry={e}
                          setEntry={(e) => (
                            (entries[i] = e), setEntries(entries)
                          )}
                          onDelete={() =>
                            setEntries(entries.filter((_, idx) => idx != i))
                          }
                        />
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <PushButton
            dirty={dirty}
            onClick={() => (b.push(), markReset())}
            state={pushState}
          >
            Push Ticker
          </PushButton>
          <DirtyTrigger v={entries?.length} />
        </Preloader>
      )}
    </Card>
  );
});
Ticker.displayName = "Ticker";

const definition: CardDefinition = {
  title: "Ticker",
  id: "ticker",
  component: Ticker,
};

export default definition;
