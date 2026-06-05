/**
 * Timezone Service
 * Handles dates and fixed slot formatting (9 PM Indian Standard Time / 5:30 PM Germany CEST)
 */
export declare class TimezoneService {
    /**
     * Formats the daily counseling slot for a given date.
     * Enforces timezone calculations:
     * 9:00 PM IST is:
     * - 5:30 PM CEST (German daylight saving, UTC+2) between last Sunday of March and last Sunday of October
     * - 4:30 PM CET (German standard time, UTC+1) for the rest of the year
     */
    static getSlotDetails(dateStr: string): {
        date: string;
        istTime: string;
        cestTime: string;
        formattedSlot: string;
        isValid: boolean;
    };
}
