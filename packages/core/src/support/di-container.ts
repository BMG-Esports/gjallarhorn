import { Newable } from "../@types/types";
import { Container } from "inversify";
export const container = new Container({
  defaultScope: "Singleton",
});

export function bind(bindings: { [token: symbol]: Newable }) {
  Object.getOwnPropertySymbols(bindings).forEach((token) => {
    if (container.isBound(token))
      throw new Error("The token is already bound to something else!");
    const Target = bindings[token];
    container.bind(token).to(Target).inSingletonScope();
  });
}
