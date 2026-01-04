/**
 * Logger Service
 * 
 * Structured logging with levels, timestamps, and context.
 * Logs to console in dev, file in production.
 */

import fs from 'fs-extra';
import path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: string;
    data?: unknown;
}

interface LoggerOptions {
    /** Minimum level to log */
    minLevel: LogLevel;
    /** Log to file in production */
    logToFile: boolean;
    /** Max log file size in bytes (default 5MB) */
    maxFileSize: number;
    /** Log directory */
    logDir: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const DEFAULT_OPTIONS: LoggerOptions = {
    minLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    logToFile: process.env.NODE_ENV !== 'development',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    logDir: 'logs',
};

class Logger {
    private options: LoggerOptions;
    private appPath: string | null = null;

    constructor(options: Partial<LoggerOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Set the app path for file logging
     */
    setAppPath(appPath: string): void {
        this.appPath = appPath;
    }

    /**
     * Check if should log at this level
     */
    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[this.options.minLevel];
    }

    /**
     * Format log entry
     */
    private formatEntry(entry: LogEntry): string {
        const { timestamp, level, context, message, data } = entry;
        const contextStr = context ? `[${context}]` : '';
        const dataStr = data ? ` ${JSON.stringify(data)}` : '';
        return `${timestamp} ${level.toUpperCase().padEnd(5)} ${contextStr} ${message}${dataStr}`;
    }

    /**
     * Write to log file
     */
    private async writeToFile(entry: LogEntry): Promise<void> {
        if (!this.options.logToFile || !this.appPath) return;

        try {
            const logDir = path.join(this.appPath, this.options.logDir);
            await fs.ensureDir(logDir);

            const logFile = path.join(logDir, 'app.log');
            const line = this.formatEntry(entry) + '\n';

            // Check file size and rotate if needed
            if (await fs.pathExists(logFile)) {
                const stats = await fs.stat(logFile);
                if (stats.size >= this.options.maxFileSize) {
                    const rotatedFile = path.join(logDir, `app.${Date.now()}.log`);
                    await fs.rename(logFile, rotatedFile);
                }
            }

            await fs.appendFile(logFile, line);
        } catch {
            // Silently fail file logging
        }
    }

    /**
     * Log a message
     */
    private log(level: LogLevel, message: string, context?: string, data?: unknown): void {
        if (!this.shouldLog(level)) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            data,
        };

        // Console output with colors
        const formatted = this.formatEntry(entry);
        switch (level) {
            case 'debug':
                console.debug('\x1b[90m%s\x1b[0m', formatted);
                break;
            case 'info':
                console.info('\x1b[36m%s\x1b[0m', formatted);
                break;
            case 'warn':
                console.warn('\x1b[33m%s\x1b[0m', formatted);
                break;
            case 'error':
                console.error('\x1b[31m%s\x1b[0m', formatted);
                break;
        }

        // Write to file
        this.writeToFile(entry);
    }

    /**
     * Create a child logger with context
     */
    child(context: string): ChildLogger {
        return new ChildLogger(this, context);
    }

    // Public methods
    debug(message: string, data?: unknown): void {
        this.log('debug', message, undefined, data);
    }

    info(message: string, data?: unknown): void {
        this.log('info', message, undefined, data);
    }

    warn(message: string, data?: unknown): void {
        this.log('warn', message, undefined, data);
    }

    error(message: string, data?: unknown): void {
        this.log('error', message, undefined, data);
    }

    // Internal method for child loggers
    _log(level: LogLevel, message: string, context: string, data?: unknown): void {
        this.log(level, message, context, data);
    }
}

class ChildLogger {
    constructor(
        private parent: Logger,
        private context: string
    ) {}

    debug(message: string, data?: unknown): void {
        this.parent._log('debug', message, this.context, data);
    }

    info(message: string, data?: unknown): void {
        this.parent._log('info', message, this.context, data);
    }

    warn(message: string, data?: unknown): void {
        this.parent._log('warn', message, this.context, data);
    }

    error(message: string, data?: unknown): void {
        this.parent._log('error', message, this.context, data);
    }
}

// Export singleton
export const logger = new Logger();

// Export child logger factory
export function createLogger(context: string): ChildLogger {
    return logger.child(context);
}
