import errorLogger from './errorLogger';

enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = this.getTimestamp();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  error(message: string, data?: unknown): void {
    const formattedMessage = this.formatMessage(LogLevel.ERROR, message, data);
    console.error(formattedMessage);
    // También registrar en archivo
    errorLogger.logError(new Error(formattedMessage), message);
  }

  warn(message: string, data?: unknown): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, data));
  }

  info(message: string, data?: unknown): void {
    console.log(this.formatMessage(LogLevel.INFO, message, data));
  }

  debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage(LogLevel.DEBUG, message, data));
    }
  }
}

export default new Logger();
