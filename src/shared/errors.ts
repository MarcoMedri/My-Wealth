/**
 * Custom Error Classes
 * 
 * Centralized error handling with typed error classes.
 */

/**
 * Base application error
 */
export class AppError extends Error {
    public readonly code: string;
    public readonly isOperational: boolean;
    public readonly details?: Record<string, unknown>;

    constructor(
        message: string,
        code: string = 'APP_ERROR',
        isOperational: boolean = true,
        details?: Record<string, unknown>
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.isOperational = isOperational;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Validation errors (user input issues)
 */
export class ValidationError extends AppError {
    public readonly field?: string;

    constructor(message: string, field?: string, details?: Record<string, unknown>) {
        super(message, 'VALIDATION_ERROR', true, details);
        this.field = field;
    }
}

/**
 * Not found errors
 */
export class NotFoundError extends AppError {
    public readonly resource: string;
    public readonly id: string;

    constructor(resource: string, id: string) {
        super(`${resource} with id "${id}" not found`, 'NOT_FOUND', true, { resource, id });
        this.resource = resource;
        this.id = id;
    }
}

/**
 * File system errors
 */
export class FileSystemError extends AppError {
    public readonly path: string;
    public readonly operation: 'read' | 'write' | 'delete' | 'create';

    constructor(message: string, path: string, operation: 'read' | 'write' | 'delete' | 'create') {
        super(message, 'FILE_SYSTEM_ERROR', true, { path, operation });
        this.path = path;
        this.operation = operation;
    }
}

/**
 * Network/API errors
 */
export class NetworkError extends AppError {
    public readonly statusCode?: number;
    public readonly endpoint?: string;

    constructor(message: string, statusCode?: number, endpoint?: string) {
        super(message, 'NETWORK_ERROR', true, { statusCode, endpoint });
        this.statusCode = statusCode;
        this.endpoint = endpoint;
    }
}

/**
 * Rate limit errors (e.g., Yahoo Finance)
 */
export class RateLimitError extends NetworkError {
    public readonly retryAfter?: number;

    constructor(service: string, retryAfter?: number) {
        super(`${service} rate limit exceeded. Please try again later.`, 429, service);
        this.retryAfter = retryAfter;
    }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, 'CONFIGURATION_ERROR', false, details);
    }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

/**
 * Extract a user-friendly message from any error
 */
export function getErrorMessage(error: unknown): string {
    if (isAppError(error)) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'An unexpected error occurred';
}

/**
 * Log error with appropriate level
 */
export function logError(error: unknown, context?: string): void {
    const message = getErrorMessage(error);
    const prefix = context ? `[${context}]` : '';
    
    if (isAppError(error) && error.isOperational) {
        console.warn(`${prefix} ${error.code}: ${message}`);
    } else {
        console.error(`${prefix} Unexpected error: ${message}`, error);
    }
}
