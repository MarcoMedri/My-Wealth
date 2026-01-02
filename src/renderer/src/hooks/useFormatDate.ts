import { useCallback } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { DateFormat, TimeFormat } from '../../../../src/shared/types';

export function useFormatDate() {
    const dateFormat = useSettingsStore(state => state.dateFormat);
    const timeFormat = useSettingsStore(state => state.timeFormat);

    const formatDate = useCallback((date: Date | string | number): string => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();

        switch (dateFormat) {
            case 'dd/MM/yyyy':
                return `${day}/${month}/${year}`;
            case 'MM/dd/yyyy':
                return `${month}/${day}/${year}`;
            case 'yyyy-MM-dd':
                return `${year}-${month}-${day}`;
            case 'dd.MM.yyyy':
                return `${day}.${month}.${year}`;
            default:
                return d.toLocaleDateString();
        }
    }, [dateFormat]);

    const formatTime = useCallback((date: Date | string | number): string => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        let hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, '0');

        if (timeFormat === 'hh:mm a') {
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            return `${hours}:${minutes} ${ampm}`;
        }

        // HH:mm
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }, [timeFormat]);

    const formatDateTime = useCallback((date: Date | string | number): string => {
        return `${formatDate(date)} ${formatTime(date)}`;
    }, [formatDate, formatTime]);

    return {
        formatDate,
        formatTime,
        formatDateTime,
        dateFormat,  // exposed for components that need the raw pattern
        timeFormat
    };
}
