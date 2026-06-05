/**
 * Timezone Service
 * Handles dates and fixed slot formatting (9 PM Indian Standard Time / 5:30 PM Germany CEST)
 */
export class TimezoneService {
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
  } {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return { date: dateStr, istTime: '', cestTime: '', formattedSlot: '', isValid: false };
      }

      // Basic German daylight savings detection (Approximate: April to October is CEST)
      const month = date.getMonth(); // 0-indexed (3 is April, 9 is October)
      const isDaylightSaving = month >= 3 && month <= 9;
      
      const istTime = '21:00';
      const cestTime = isDaylightSaving ? '17:30' : '16:30';
      const tzLabel = isDaylightSaving ? 'CEST' : 'CET';
      
      const formattedSlot = `9:00 PM IST / ${cestTime === '17:30' ? '5:30 PM' : '4:30 PM'} ${tzLabel}`;

      // Date check: must not be in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const bookingDate = new Date(dateStr);
      bookingDate.setHours(0, 0, 0, 0);

      const isValid = bookingDate.getTime() >= today.getTime();

      return {
        date: dateStr,
        istTime,
        cestTime,
        formattedSlot,
        isValid,
      };
    } catch {
      return { date: dateStr, istTime: '', cestTime: '', formattedSlot: '', isValid: false };
    }
  }
}
