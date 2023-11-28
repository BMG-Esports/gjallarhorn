import { useBackend } from "../../../client/support/backend";
import { entrantName } from "../../../client/support/hooks";
import { QueueBackend, QueueSet } from "../../../backends/cards/queue";
import { TQueueBackend } from "@bmg-esports/gjallarhorn-tokens";
import { ChevronRight } from "lucide-react";
import React from "react";
import { fuzzySearch } from "react-select-search";
import { SearchDropdown } from "../fields/dropdown";

export const queueSetName = (qs: QueueSet) =>
  qs.round
    ? `${entrantName(qs.left) || "TBD"} ${qs.score || "vs"} ${
        entrantName(qs.right) || "TBD"
      }`
    : null;

export const QueueSetSelector = ({
  onSelect,
}: {
  onSelect: (set: QueueSet) => void;
}) => {
  const q = useBackend<QueueBackend>(TQueueBackend);
  const queue = q.useState("queue", [])[0];
  const idx = q.useState("startIndex", 0)[0];

  return (
    <SearchDropdown
      value={String(0)}
      placeholder="Queue"
      search
      filterOptions={fuzzySearch}
      options={queue?.map((set, i) => ({
        value: String(set.id),
        name: queueSetName(set) + set.round,
        set,
        active: i === idx,
      }))}
      onChange={(_, opt: any) => onSelect(opt.set)}
      renderOption={(props: any, opt: any, _, className) => {
        return (
          <button
            style={{
              height: "auto",
              padding: "4px 6px",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            className={className}
            {...props}
          >
            {opt.active && <ChevronRight style={{ opacity: 0.5 }} size={16} />}
            <div>
              <div style={{ fontWeight: 400 }}>{queueSetName(opt.set)}</div>
              <div
                style={{
                  fontWeight: 400,
                  fontSize: "0.9em",
                  marginTop: -4,
                  opacity: 0.5,
                }}
              >
                {opt.set.round}
              </div>
            </div>
          </button>
        );
      }}
    />
  );
};
