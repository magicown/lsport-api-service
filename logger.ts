/**
 * 구조화된 로깅 유틸리티
 * 레벨별 로깅 + JSON 포맷 + 타임스탬프
 * 프로덕션: warn 이상만 출력, 개발: debug 이상
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3, fatal: 4,
};

const MIN_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}

function formatLog(level: LogLevel, module: string, message: string, data?: Record<string, any>): string {
  const entry: Record<string, any> = {
    ts: new Date().toISOString(),
    level,
    mod: module,
    msg: message,
  };
  if (data) Object.assign(entry, data);
  return JSON.stringify(entry);
}

function createLogger(module: string) {
  return {
    debug(msg: string, data?: Record<string, any>) {
      if (shouldLog('debug')) console.log(formatLog('debug', module, msg, data));
    },
    info(msg: string, data?: Record<string, any>) {
      if (shouldLog('info')) console.log(formatLog('info', module, msg, data));
    },
    warn(msg: string, data?: Record<string, any>) {
      if (shouldLog('warn')) console.warn(formatLog('warn', module, msg, data));
    },
    error(msg: string, data?: Record<string, any>) {
      if (shouldLog('error')) console.error(formatLog('error', module, msg, data));
    },
    fatal(msg: string, data?: Record<string, any>) {
      if (shouldLog('fatal')) console.error(formatLog('fatal', module, msg, data));
    },
  };
}

export { createLogger };
export type { LogLevel };
