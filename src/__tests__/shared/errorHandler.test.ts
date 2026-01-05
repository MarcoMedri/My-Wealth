/**
 * ErrorHandler Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ErrorSeverity,
  toAppError,
  createError,
  handleError,
  withErrorHandling,
  type AppError,
} from '../../shared/errorHandler';

describe('errorHandler', () => {
  // Mock console methods
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('toAppError', () => {
    it('should convert Error to AppError', () => {
      const error = new Error('Test error');
      const appError = toAppError(error, 'TEST_ERROR', ErrorSeverity.ERROR);

      expect(appError.code).toBe('TEST_ERROR');
      expect(appError.message).toBe('Test error');
      expect(appError.severity).toBe(ErrorSeverity.ERROR);
      expect(appError.timestamp).toBeDefined();
      expect(appError.stack).toBeDefined();
    });

    it('should return AppError as-is', () => {
      const appError: AppError = {
        code: 'TEST_ERROR',
        message: 'Test message',
        severity: ErrorSeverity.WARNING,
        timestamp: new Date().toISOString(),
      };

      const result = toAppError(appError);
      expect(result).toBe(appError);
    });

    it('should convert unknown error to AppError', () => {
      const error = 'String error';
      const appError = toAppError(error, 'UNKNOWN', ErrorSeverity.ERROR);

      expect(appError.code).toBe('UNKNOWN');
      expect(appError.message).toBe('String error');
      expect(appError.severity).toBe(ErrorSeverity.ERROR);
    });
  });

  describe('createError', () => {
    it('should create AppError with all fields', () => {
      const error = createError(
        'TEST_ERROR',
        'Test message',
        ErrorSeverity.CRITICAL,
        { userId: '123' }
      );

      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.context).toEqual({ userId: '123' });
      expect(error.timestamp).toBeDefined();
    });

    it('should use default severity', () => {
      const error = createError('TEST_ERROR', 'Test message');
      expect(error.severity).toBe(ErrorSeverity.ERROR);
    });
  });

  describe('handleError', () => {
    it('should log error to console', () => {
      const error = createError('TEST_ERROR', 'Test message', ErrorSeverity.ERROR);
      
      handleError(error, { showToast: false, logToFile: false });

      expect(console.error).toHaveBeenCalled();
    });

    it('should handle different severity levels', () => {
      const infoError = createError('INFO_ERROR', 'Info', ErrorSeverity.INFO);
      const warnError = createError('WARN_ERROR', 'Warning', ErrorSeverity.WARNING);
      const criticalError = createError('CRITICAL_ERROR', 'Critical', ErrorSeverity.CRITICAL);

      handleError(infoError, { showToast: false, logToFile: false });
      expect(console.info).toHaveBeenCalled();

      handleError(warnError, { showToast: false, logToFile: false });
      expect(console.warn).toHaveBeenCalled();

      handleError(criticalError, { showToast: false, logToFile: false });
      expect(console.error).toHaveBeenCalled();
    });

    it('should add context to error', () => {
      const error = createError('TEST_ERROR', 'Test');
      const context = { operation: 'save' };

      handleError(error, { context, showToast: false, logToFile: false });

      expect(error.context).toEqual(context);
    });
  });

  describe('withErrorHandling', () => {
    it('should wrap async function and handle errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));
      const wrapped = withErrorHandling(fn, 'TEST_ERROR', { showToast: false, logToFile: false });

      await expect(wrapped()).rejects.toThrow();
      expect(console.error).toHaveBeenCalled();
    });

    it('should return result on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const wrapped = withErrorHandling(fn, 'TEST_ERROR');

      const result = await wrapped();
      expect(result).toBe('success');
    });

    it('should preserve function arguments', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const wrapped = withErrorHandling(fn, 'TEST_ERROR');

      await wrapped('arg1', 'arg2');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });
});
