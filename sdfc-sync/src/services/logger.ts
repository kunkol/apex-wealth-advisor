import winston from 'winston';

let debugEnabled = false;

export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
}

export function isDebugEnabled(): boolean {
  return debugEnabled;
}

export function createLogger(component: string): winston.Logger {
  return winston.createLogger({
    level: debugEnabled ? 'debug' : 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] [${level.toUpperCase()}] [${component}] ${message}`;
      })
    ),
    transports: [new winston.transports.Console()],
  });
}

// Simple debug logger that respects global debug flag
export function debug(component: string, message: string): void {
  if (debugEnabled) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${timestamp}] [DEBUG] [${component}] ${message}`);
  }
}

export function info(component: string, message: string): void {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${timestamp}] [INFO] [${component}] ${message}`);
}

export function error(component: string, message: string): void {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.error(`[${timestamp}] [ERROR] [${component}] ${message}`);
}
