import React, { useMemo, forwardRef } from "react";
import { CardDefinition, CardHostHandle, CardMap } from ".";
import { ColumnCardHost } from "./columns";

export function WindowCardHost({ cards }: { cards: CardMap }) {
  return <div>Window!</div>;
}

export const CardHost = forwardRef<
  CardHostHandle,
  {
    cards: CardDefinition[];
    mode: "column" | "window";
    prefix: string;
  }
>(({ cards: definitions, prefix }, ref) => {
  const cards = useMemo(
    () => new Map(definitions.map((def) => [def.id, def])),
    [definitions]
  );

  return <ColumnCardHost prefix={prefix} ref={ref} cards={cards} />;
});
CardHost.displayName = "CardHost";
