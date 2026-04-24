/**
 * Utilities - Parsing, formatting, and date manipulation
 */

export class Duration {
  constructor(hours = 0, minutes = 0, seconds = 0) {
    this.hours = hours;
    this.minutes = minutes;
    this.seconds = seconds;
  }

  static fromString(str) {
    if (!str) return null;
    const parts = str.trim().split(':');
    if (parts.length !== 3) return null;

    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2], 10) || 0;

    return new Duration(hours, minutes, seconds);
  }

  static parse(value) {
    return Duration.fromString(value);
  }

  toString() {
    return `${String(this.hours).padStart(2, '0')}:${String(this.minutes).padStart(2, '0')}:${String(this.seconds).padStart(2, '0')}`;
  }

  toSeconds() {
    return this.hours * 3600 + this.minutes * 60 + this.seconds;
  }

  static secondsToDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return new Duration(hours, minutes, secs);
  }
}

export class TagData {
  constructor(tag, value, comment = '') {
    this.tag = tag;
    this.value = value;
    this.comment = comment;
  }
}

export class Utilities {
  static parseNumber(str) {
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  }

  static formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }

  static formatDateISO(dateStr) {
    if (!dateStr) return '';
    return dateStr; // Already in YYYY-MM-DD format
  }

  static getDateDaysAgo(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }

  static dateToISO(date) {
    return date.toISOString().split('T')[0];
  }

  static isDateInRange(dateStr, startDate, endDate) {
    return dateStr >= startDate && dateStr <= endDate;
  }

  static getDatesInRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  static parseTagValue(str) {
    return str ? str.trim() : '';
  }

  static capitalizeWords(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase());
  }
}
