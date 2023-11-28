const ids = new Set();

export const createToken = (id: string) => {
  if (ids.has(id)) throw new Error(`Token '${id}' already exists!`);
  ids.add(id);
  return Symbol(id);
};
