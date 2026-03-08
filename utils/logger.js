/**
 * logger.js - Simple Console Logger with Colors
 * 
 * Provides colored console output for different log levels.
 * Uses ANSI escape codes for terminal colors — no external dependencies needed.
 * 
 * Usage:
 *   const logger = require('./logger');
 *   logger.info('Server started');
 *   logger.success('Job completed');
 *   logger.warn('Retrying job...');
 *   logger.error('Something went wrong');
 */

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

/**
 * Get the current timestamp in a readable format.
 * Example output: "2024-01-15 14:30:45"
 */
function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Format and print a log message with color and timestamp.
 * @param {string} level - Log level label (INFO, SUCCESS, etc.)
 * @param {string} color - ANSI color code
 * @param {string} message - The message to log
 * @param {object} [data] - Optional data to display alongside the message
 */
function log(level, color, message, data) {
  const timestamp = `${colors.cyan}[${getTimestamp()}]${colors.reset}`;
  const levelTag = `${color}${colors.bright}[${level}]${colors.reset}`;
  const msg = `${color}${message}${colors.reset}`;

  if (data) {
    console.log(`${timestamp} ${levelTag} ${msg}`, data);
  } else {
    console.log(`${timestamp} ${levelTag} ${msg}`);
  }
}

// Export the logger with four easy-to-use methods
const logger = {
  /** Log general information (blue) */
  info: (message, data) => log('INFO', colors.blue, message, data),

  /** Log success messages (green) */
  success: (message, data) => log('SUCCESS', colors.green, message, data),

  /** Log warnings (yellow) */
  warn: (message, data) => log('WARN', colors.yellow, message, data),

  /** Log errors (red) */
  error: (message, data) => log('ERROR', colors.red, message, data),
};

module.exports = logger;
