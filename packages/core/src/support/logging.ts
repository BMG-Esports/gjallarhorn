import winston from "winston";

const { combine, timestamp, errors, printf } = winston.format;

const _logger = winston.createLogger({
  level: "verbose",
  format: combine(
    errors({ stack: true }),
    timestamp(),
    printf(({ moduleName, timestamp, level, message, stack, ...rest }) => {
      return `[${timestamp} / ${level.toUpperCase()}]${
        moduleName ?? ""
      } ${message}${stack ? "\n" + stack : ""}${
        Object.keys(rest).length ? JSON.stringify(rest) : ""
      }`;
    })
  ),
  transports: [new winston.transports.Console()],
});

export const logger = (moduleName?: string) =>
  _logger.child({
    moduleName: moduleName ? "[" + moduleName + "]" : undefined,
  });
