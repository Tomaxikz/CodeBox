import { relative } from "node:path";

type LogLevel = "[INFO]" | "[WARN]" | "[ERROR]" | "[DEBUG]";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const LOG_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const colors = {
  gray: "\x1b[90m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
};

const levelColors = {
  "[DEBUG]": colors.blue,
  "[INFO]": colors.green,
  "[WARN]": colors.yellow,
  "[ERROR]": colors.red,
} satisfies Record<LogLevel, string>;

function paint(color: string, value: string) {
  return `${color}${value}${colors.reset}`;
}

function toProjectPath(filePath: string) {
  return relative(process.cwd(), filePath).replaceAll("\\", "/");
}

function normalizePath(filePath: string) {
  return filePath.replaceAll("\\", "/");
}

function getFilePathFromStackLine(line: string) {
  const match = line.match(/\(?(.+):\d+:\d+\)?$/);

  if (!match) {
    return null;
  }

  const rawLocation = match[1];

  if (!rawLocation) {
    return null;
  }

  const trimmedLocation = rawLocation.trim();
  const openParenIndex = trimmedLocation.lastIndexOf("(");

  if (openParenIndex === -1) {
    return trimmedLocation.replace(/^at\s+/, "").trim();
  }

  return trimmedLocation.slice(openParenIndex + 1).trim();
}

function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLogsDirectoryPath() {
  return `${process.cwd()}/storage/logs`;
}

function getLogFilePath() {
  const date = getTodayDate();

  return `${getLogsDirectoryPath()}/${date}-app.log`;
}

export async function cleanupOldLogs(maxAgeMs = ONE_DAY_MS) {
  const logsGlob = new Bun.Glob("*.log");
  const now = Date.now();

  try {
    for await (const fileName of logsGlob.scan({
      cwd: getLogsDirectoryPath(),
      onlyFiles: true,
    })) {
      const filePath = `${getLogsDirectoryPath()}/${fileName}`;
      const file = Bun.file(filePath);
      const stat = await file.stat();
      const age = now - stat.mtime.getTime();

      if (age > maxAgeMs) {
        await file.delete();
      }
    }
  } catch (error) {
    const systemError = error as { code?: string };

    if (systemError.code === "ENOENT" || systemError.code === "ENOTDIR") {
      return;
    }

    throw error;
  }
}

let logWriteQueue = Promise.resolve();
let nextLogCleanupAt = 0;

function maybeCleanupOldLogs() {
  const now = Date.now();

  if (now < nextLogCleanupAt) {
    return;
  }

  nextLogCleanupAt = now + LOG_CLEANUP_INTERVAL_MS;

  void cleanupOldLogs().catch((error: unknown) => {
    console.error(`${paint(colors.red, "[LOGGER]")} Failed to clean old logs`, error);
  });
}

function writeLogFile(line: string) {
  logWriteQueue = logWriteQueue
    .then(async () => {
      const logFilePath = getLogFilePath();
      const file = Bun.file(logFilePath);
      const oldContent = await file.exists() ? await file.text() : "";

      await Bun.write(logFilePath, `${oldContent}${line}\n`, {
        createPath: true,
      });
    })
    .catch((error: unknown) => {
      console.error(`${paint(colors.red, "[LOGGER]")} Failed to write log file`, error);
    });
}

function isProjectCaller(filePath: string) {
  const normalizedFilePath = normalizePath(filePath);
  const normalizedRoot = normalizePath(process.cwd());
  const normalizedLoggerPath = normalizePath(import.meta.path);

  return (
    normalizedFilePath.startsWith(`${normalizedRoot}/`) &&
    normalizedFilePath !== normalizedLoggerPath &&
    !normalizedFilePath.includes("/node_modules/") &&
    !normalizedFilePath.includes("[eval]")
  );
}

function getCallerFilePath() {
  const stack = new Error().stack;

  if (!stack) {
    return "unknown";
  }

  const lines = stack.split("\n");

  for (const line of lines) {
    const callerPath = getFilePathFromStackLine(line);

    if (callerPath && isProjectCaller(callerPath)) {
      return toProjectPath(callerPath);
    }
  }

  return "unknown";
}

function formatLogTime() {
  const iso = new Date().toISOString();

  const [datePart, rest = ""] = iso.split("T");
  const [timePart = ""] = rest.split(".");

  return `${datePart} ${timePart}`;
}

function log(level: LogLevel, message: string) {
  maybeCleanupOldLogs();

  const time = formatLogTime();
  const filePath = getCallerFilePath();
  const terminalLog = `${paint(colors.gray, `[${time}]`)} ${paint(levelColors[level], level)} ${paint(colors.gray, filePath)}: ${paint(colors.white, message)}`;
  const fileLog = `[${time}] ${level} ${filePath}: ${message}`;
  console.log(terminalLog);
  void writeLogFile(fileLog);
}

export const logger = {
  debug: (message: string) => log("[DEBUG]", message),
  info: (message: string) => log("[INFO]", message),
  warn: (message: string) => log("[WARN]", message),
  error: (message: string) => log("[ERROR]", message),
};
