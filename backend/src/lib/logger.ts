class Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: string, message: string, meta?: any) {
    if (this.isProduction) {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        message,
        ...meta,
      });
    }
    const metaString = meta ? ` | ${JSON.stringify(meta)}` : '';
    const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : level === 'debug' ? '\x1b[36m' : '\x1b[32m';
    const reset = '\x1b[0m';
    return `[${new Date().toISOString()}] ${color}[${level.toUpperCase()}]${reset} ${message}${metaString}`;
  }

  info(message: string, meta?: any) {
    console.log(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: any) {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, error?: any, meta?: any) {
    const errorMeta = error instanceof Error 
      ? { errorName: error.name, errorMessage: error.message, errorStack: error.stack }
      : { error };
    console.error(this.formatMessage('error', message, { ...errorMeta, ...meta }));
  }

  debug(message: string, meta?: any) {
    if (!this.isProduction) {
      console.log(this.formatMessage('debug', message, meta));
    }
  }
}

export const logger = new Logger();
export default logger;
