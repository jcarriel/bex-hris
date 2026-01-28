import * as fs from 'fs';
import * as path from 'path';

class ErrorLogger {
  private logDir = path.join(process.cwd(), 'logs');
  private errorLogFile = path.join(this.logDir, 'errors.log');

  constructor() {
    this.ensureLogDir();
  }

  private ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  logError(error: any, context?: string) {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    const errorStack = error instanceof Error ? error.stack : '';
    const contextStr = context ? `[${context}]` : '';

    const logEntry = `
${timestamp} ${contextStr}
Error: ${errorMessage}
Stack: ${errorStack}
---
`;

    try {
      fs.appendFileSync(this.errorLogFile, logEntry);
    } catch (err) {
      console.error('Failed to write to error log:', err);
    }
  }

  getRecentErrors(lines: number = 100): string {
    try {
      if (!fs.existsSync(this.errorLogFile)) {
        return 'No error logs found';
      }

      const content = fs.readFileSync(this.errorLogFile, 'utf-8');
      const logLines = content.split('\n');
      return logLines.slice(-lines).join('\n');
    } catch (err) {
      return `Failed to read error log: ${err}`;
    }
  }

  clearErrors() {
    try {
      if (fs.existsSync(this.errorLogFile)) {
        fs.unlinkSync(this.errorLogFile);
      }
    } catch (err) {
      console.error('Failed to clear error log:', err);
    }
  }
}

export default new ErrorLogger();
