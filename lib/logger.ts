import pino from "pino";

const isDev = process.env.NODE_ENV === "development";
const logLevel = process.env.LOG_LEVEL ?? (isDev ? "debug" : "info");

const logger = pino(
  {
    level: logLevel,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: undefined,
  },
  isDev
    ? pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
          messageFormat: "[{module}] {msg}",
        },
      })
    : undefined,
);

export default logger;

/**
 * Returns a child logger bound to a specific module name.
 * Usage: const log = getModuleLogger("api/chats");
 */
export function getModuleLogger(module: string) {
  return logger.child({ module });
}
