/**
 * Logger Utility
 * Conditional logging based on environment
 * Prevents console spam in production
 */

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || 'info';

class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  error(...args) {
    console.error(`[${this.context}] ❌`, ...args);
  }

  warn(...args) {
    if (isDevelopment || logLevel === 'debug') {
      console.warn(`[${this.context}] ⚠️`, ...args);
    }
  }

  info(...args) {
    if (isDevelopment || ['info', 'debug'].includes(logLevel)) {
      console.log(`[${this.context}] ℹ️`, ...args);
    }
  }

  debug(...args) {
    if (isDevelopment || logLevel === 'debug') {
      console.log(`[${this.context}] 🐛`, ...args);
    }
  }

  success(...args) {
    if (isDevelopment || logLevel === 'debug') {
      console.log(`[${this.context}] ✅`, ...args);
    }
  }
}

// Default logger
const logger = new Logger();

// Create logger with custom context
const createLogger = (context) => new Logger(context);

module.exports = { logger, createLogger, Logger };
