const fetch = require("node-fetch");
const fs = require("fs/promises");
const path = require("path");

const STATIC = "https://static.brawltools.com";
const ROOT = path.resolve(__dirname, "..", "data");

fetch(STATIC + "/meta/legends.json")
  .then((legends) => legends.json())
  .then(async (legends) => {
    await fs.mkdir(ROOT, { recursive: true });
    await fs.writeFile(
      path.resolve(ROOT, "legends.json"),
      JSON.stringify(
        Object.keys(legends).map((key) => [
          key,
          legends[key].name +
            (legends[key].crossover
              ? ` (${legends[legends[key].crossover]?.name})`
              : ""),
        ])
      )
    );

    await fs.writeFile(
      path.resolve(ROOT, "legendsNames.json"),
      JSON.stringify(legends)
    );
  });
