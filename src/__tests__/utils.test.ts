/**
 * Utility Functions Tests
 * Tests for cn (className merge), date formatting, and relative time.
 */

import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatDateShort, getRelativeTime } from '../renderer/src/lib/utils';

describe('Utility Functions', () => {
    describe('cn (className merge)', () => {
        it('should merge multiple class strings', () => {
            const result = cn('bg-red-500', 'text-white');
            expect(result).toContain('bg-red-500');
            expect(result).toContain('text-white');
        });

        it('should handle conditional classes', () => {
            const isActive = true;
            const result = cn('base-class', isActive && 'active-class');
            expect(result).toContain('base-class');
            expect(result).toContain('active-class');
        });

        it('should filter out falsy values', () => {
            const result = cn('base', false, null, undefined, 'other');
            expect(result).toBe('base other');
        });

        it('should merge conflicting Tailwind classes (last wins)', () => {
            // tailwind-merge should prefer the last conflicting class
            const result = cn('text-red-500', 'text-blue-500');
            expect(result).toContain('text-blue-500');
            expect(result).not.toContain('text-red-500');
        });

        it('should handle array inputs', () => {
            const result = cn(['class1', 'class2']);
            expect(result).toContain('class1');
            expect(result).toContain('class2');
        });
    });

    describe('formatDate', () => {
        it('should format Date object correctly', () => {
            const date = new Date('2025-01-15');
            const result = formatDate(date);
            expect(result).toContain('15');
            expect(result).toContain('2025');
        });

        it('should format ISO string correctly', () => {
            const result = formatDate('2025-06-20');
            expect(result).toContain('20');
            expect(result).toContain('2025');
        });
    });

    describe('formatDateShort', () => {
        it('should format date without year', () => {
            const date = new Date('2025-03-25');
            const result = formatDateShort(date);
            expect(result).toContain('25');
            // Should contain month abbreviation but not necessarily year
        });

        it('should handle string input', () => {
            const result = formatDateShort('2025-12-31');
            expect(result).toContain('31');
        });
    });

    describe('getRelativeTime', () => {
        it('should return "Today" for current date', () => {
            const today = new Date();
            const result = getRelativeTime(today);
            expect(result).toBe('Today');
        });

        it('should return "Yesterday" for yesterday', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const result = getRelativeTime(yesterday);
            expect(result).toBe('Yesterday');
        });

        it('should return "X days ago" for recent days', () => {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            const result = getRelativeTime(threeDaysAgo);
            expect(result).toBe('3 days ago');
        });

        it('should return "X weeks ago" for weeks', () => {
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            const result = getRelativeTime(twoWeeksAgo);
            expect(result).toBe('2 weeks ago');
        });

        it('should return formatted date for old dates', () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 60);
            const result = getRelativeTime(oldDate);
            // Should return a formatted date, not "X days ago"
            expect(result).not.toContain('days ago');
            expect(result).not.toContain('weeks ago');
        });

        it('should handle string input', () => {
            const result = getRelativeTime(new Date().toISOString());
            expect(result).toBe('Today');
        });
    });
});
