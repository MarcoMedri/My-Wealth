/**
 * Centralized Error Handler
 * 
 * Provides unified error handling across the application with:
 * - Error severity levels
 * - File logging
 * - User notifications
 * - Error context tracking
 */

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface AppError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  timestamp: string;
  stack?: string;
}

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logToFile?: boolean;
  context?: Record<string, unknown>;
}

/**
 * Convert a generic error to AppError format
 */
export function toAppError(
  error: Error | AppError | unknown,
  code: string = 'UNKNOWN_ERROR',
  severity: ErrorSeverity = ErrorSeverity.ERROR
): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return {
      code,
      message: error.message,
      severity,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };
  }

  return {
    code,
    message: String(error),
    severity,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Type guard for AppError
 */
function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'severity' in error &&
    'timestamp' in error
  );
}

/**
 * Handle an error with appropriate logging and user notification
 */
export function handleError(
  error: Error | AppError | unknown,
  options: ErrorHandlerOptions = {}
): void {
  const {
    showToast = true,
    logToFile = true,
    context,
  } = options;

  // Convert to AppError format
  const appError = isAppError(error) ? error : toAppError(error);

  // Add context if provided
  if (context) {
    appError.context = { ...appError.context, ...context };
  }

  // Log to console
  logToConsole(appError);

  // Log to file (in production, this would write to a file via Electron)
  if (logToFile) {
    logToFile_Internal(appError);
  }

  // Show user notification based on severity
  if (showToast) {
    showUserNotification(appError);
  }
}

/**
 * Log error to console with appropriate level
 */
function logToConsole(error: AppError): void {
  const prefix = `[${error.severity.toUpperCase()}] ${error.code}:`;
  const details = {
    message: error.message,
    timestamp: error.timestamp,
    context: error.context,
    stack: error.stack,
  };

  switch (error.severity) {
    case ErrorSeverity.INFO:
      console.info(prefix, details);
      break;
    case ErrorSeverity.WARNING:
      console.warn(prefix, details);
      break;
    case ErrorSeverity.ERROR:
    case ErrorSeverity.CRITICAL:
      console.error(prefix, details);
      break;
  }
}

/**
 * Log error to file
 * In production, this would use Electron's file system API
 */
function logToFile_Internal(error: AppError): void {
  try {
    const logEntry = {
      ...error,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // In a real implementation, this would write to a file
    console.error('[ErrorHandler] Log entry:', JSON.stringify(logEntry, null, 2));

    // TODO: Implement actual file logging via Electron IPC
    // window.api.logError(logEntry);
  } catch (loggingError) {
    console.error('[ErrorHandler] Failed to log error to file:', loggingError);
  }
}

/**
 * Show user notification based on error severity
 */
function showUserNotification(error: AppError): void {
  // Import toast dynamically to avoid circular dependencies
  import('sonner').then(({ toast }) => {
    const message = getUserFriendlyMessage(error);

    switch (error.severity) {
      case ErrorSeverity.INFO:
        toast.info(message);
        break;
      case ErrorSeverity.WARNING:
        toast.warning(message);
        break;
      case ErrorSeverity.ERROR:
        toast.error(message);
        break;
      case ErrorSeverity.CRITICAL:
        toast.error(message, {
          duration: Infinity,
          action: {
            label: 'Reload',
            onClick: () => window.location.reload(),
          },
        });
        break;
    }
  }).catch((err) => {
    console.error('[ErrorHandler] Failed to show toast:', err);
  });
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(error: AppError): string {
  // Map error codes to user-friendly messages
  const messageMap: Record<string, string> = {
    NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
    VALIDATION_ERROR: 'Invalid data provided. Please check your input.',
    SAVE_ERROR: 'Failed to save data. Please try again.',
    LOAD_ERROR: 'Failed to load data. Please try again.',
    UNKNOWN_ERROR: 'An unexpected error occurred.',
  };

  return messageMap[error.code] || error.message;
}

/**
 * Create a specific error type
 */
export function createError(
  code: string,
  message: string,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  context?: Record<string, unknown>
): AppError {
  return {
    code,
    message,
    severity,
    context,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  errorCode: string,
  options?: ErrorHandlerOptions
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = toAppError(error, errorCode);
      handleError(appError, options);
      throw appError;
    }
  }) as T;
}
