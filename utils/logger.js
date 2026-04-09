import { config } from '../config/index.js';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS[config.logging.level] || LOG_LEVELS.info;
    this.timers = new Map();
  }

  log(level, message, data = {}) {
    if (LOG_LEVELS[level] > this.level) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data,
    };

    console.log(JSON.stringify(logEntry));
  }

  error(message, data) {
    this.log('error', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  info(message, data) {
    this.log('info', message, data);
  }

  debug(message, data) {
    this.log('debug', message, data);
  }

  startTimer(label) {
    this.timers.set(label, Date.now());
  }

  endTimer(label) {
    if (!this.timers.has(label)) {
      this.warn(`Timer "${label}" was not started`);
      return null;
    }

    const duration = Date.now() - this.timers.get(label);
    this.timers.delete(label);
    return duration;
  }

  logRequest(method, path, statusCode, duration, data = {}) {
    this.info(`${method} ${path}`, {
      statusCode,
      duration: `${duration}ms`,
      ...data,
    });
  }

  logFaceVerification(data) {
    this.info('Face Verification', {
      ...data,
    });
  }
}

export const logger = new Logger();
