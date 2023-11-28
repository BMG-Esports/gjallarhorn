import { useBackend } from "../../../../client/support/backend";
import {
  Card,
  CardDefinition,
  CardProps,
} from "../../../../client/ui/components/cards";
import { Preloader } from "../../../../client/ui/components/loading";
import { PushButton } from "../../../../client/ui/components/push-button";
import { useDirtyContainer } from "../../../../client/ui/fields/dirtyable";
import { Input } from "../../../../client/ui/fields/input";
import { CastersBackend, Caster } from "../../../../backends/cards/casters";
import React, { forwardRef } from "react";
import { Mic } from "lucide-react";

import styles from "./style.scss";
import { TCastersBackend } from "@bmg-esports/gjallarhorn-tokens";

const CasterFields = ({
  i,
  caster,
  setCaster,
}: {
  i: number;
  caster: Caster;
  setCaster: (c: Caster) => void;
}) => {
  return (
    <div>
      <h3>Caster {i}</h3>
      <Input
        label="Name"
        value={caster.caster ?? ""}
        onChange={(e) => setCaster({ ...caster, caster: e.target.value })}
      />
      <Input
        label="Twitter"
        value={caster.twitter ?? ""}
        onChange={(e) => setCaster({ ...caster, twitter: e.target.value })}
      />
      <Input
        label="Pronouns"
        value={caster.pronouns ?? ""}
        onChange={(e) => setCaster({ ...caster, pronouns: e.target.value })}
      />
    </div>
  );
};

export const Casters = forwardRef<HTMLDivElement, CardProps>((props, ref) => {
  const c = useBackend<CastersBackend>(TCastersBackend);

  const { dirty, markReset, wrapDirty } = useDirtyContainer(
    c.useState("dirtyState")
  );

  const [casters, setCasters] = c.useState("casters");
  const pushState = c.useState("pushState")[0];

  return (
    <Card
      dirty={dirty}
      ref={ref}
      {...props}
      title="Casters"
      icon={<Mic />}
      header={
        <PushButton
          state={pushState}
          dirty={dirty}
          flat
          onClick={() => (c.write(), markReset())}
        >
          Push
        </PushButton>
      }
    >
      <Preloader fields={[casters]}>
        <div className={styles.casters}>
          {wrapDirty(
            casters?.map((c, i) => (
              <CasterFields
                key={i}
                i={i + 1}
                caster={c}
                setCaster={(nC) =>
                  setCasters([...((casters[i] = nC), casters)])
                }
              />
            ))
          )}
        </div>
        <PushButton
          dirty={dirty}
          state={pushState}
          onClick={() => (c.write(), markReset())}
        >
          Push Casters
        </PushButton>
      </Preloader>
    </Card>
  );
});
Casters.displayName = "Casters";

const definition: CardDefinition = {
  title: "Casters",
  id: "casters",
  component: Casters,
};

export default definition;
