import { WorkoutEntry, DailyLogEntry, EnduranceWorkoutEntry, StrengthWorkoutEntry } from './WorkoutEntry.js';
import { Utilities } from './Utilities.js';

/**
 * WorkoutLog - Parses and manages all workout entries
 */
export class WorkoutLog {
  constructor(entries = []) {
    this.entries = entries;
  }

  static parse(text) {
    const lines = text.split('\n');
    const blocks = [];
    let currentBlock = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock);
          currentBlock = [];
        }
        continue;
      }

      // Handle pipe as newline separator
      if (trimmed.includes('|')) {
        const parts = trimmed.split('|');
        currentBlock.push(...parts.map(p => p.trim()).filter(p => p));
      } else {
        currentBlock.push(trimmed);
      }
    }

    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }

    const entries = blocks
      .map(block => WorkoutEntry.parse(block))
      .filter(entry => entry !== null);

    return new WorkoutLog(entries);
  }

  addEntry(entry) {
    this.entries.push(entry);
    this.entries.sort((a, b) => a.date.localeCompare(b.date));
  }

  removeEntry(date, type) {
    this.entries = this.entries.filter(e => !(e.date === date && e.type === type));
  }

  getEntriesByDate(date) {
    return this.entries.filter(e => e.date === date);
  }

  getEntriesByType(type) {
    return this.entries.filter(e => e.type === type);
  }

  getEntriesInDateRange(startDate, endDate) {
    return this.entries.filter(e => Utilities.isDateInRange(e.date, startDate, endDate));
  }

  getEntriesWithTag(tagName) {
    return this.entries.filter(e => e.hasTag(tagName));
  }

  getLastNDays(days) {
    const startDate = Utilities.getDateDaysAgo(days);
    const endDate = Utilities.dateToISO(new Date());
    return this.getEntriesInDateRange(startDate, endDate);
  }

  getDailyLogsLastNDays(days) {
    return this.getLastNDays(days).filter(e => e instanceof DailyLogEntry);
  }

  getWorkoutsByActivityType(type, days = null) {
    let entries = this.getEntriesByType(type);
    if (days) {
      const filtered = this.getLastNDays(days);
      entries = entries.filter(e => filtered.includes(e));
    }
    return entries;
  }

  // Statistics helpers
  getWeightHistory(days = 30) {
    const dailyLogs = this.getDailyLogsLastNDays(days);
    return dailyLogs
      .map(log => ({
        date: log.date,
        weight: log.getWeight()
      }))
      .filter(item => item.weight !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  getWaistHistory(days = 30) {
    const dailyLogs = this.getDailyLogsLastNDays(days);
    return dailyLogs
      .map(log => ({
        date: log.date,
        waist: log.getWaist()
      }))
      .filter(item => item.waist !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  getRPEByActivityType(days = 30) {
    const workouts = this.getLastNDays(days).filter(e => e instanceof EnduranceWorkoutEntry || e instanceof StrengthWorkoutEntry);
    const rpeByType = {};

    workouts.forEach(workout => {
      if (!rpeByType[workout.type]) {
        rpeByType[workout.type] = [];
      }
      const rpe = workout.getRPE ? workout.getRPE() : null;
      if (rpe !== null) {
        rpeByType[workout.type].push(rpe);
      }
    });

    return rpeByType;
  }

  getAverageWeightLastNDays(days) {
    const weights = this.getWeightHistory(days).map(item => item.weight);
    if (weights.length === 0) return null;
    return weights.reduce((a, b) => a + b, 0) / weights.length;
  }

  getAverageWaistLastNDays(days) {
    const waists = this.getWaistHistory(days).map(item => item.waist);
    if (waists.length === 0) return null;
    return waists.reduce((a, b) => a + b, 0) / waists.length;
  }

  getAllDates() {
    return [...new Set(this.entries.map(e => e.date))].sort();
  }

  getAllUniqueTags() {
    const tags = new Set();
    this.entries.forEach(entry => {
      entry.getTagNames().forEach(tag => {
        tags.add(tag);
      });
    });
    return Array.from(tags).sort();
  }

  toString() {
    const lines = ['# Workout Log'];
    
    this.entries.forEach(entry => {
      lines.push(`${entry.date}: ${entry.type}`);
      entry.getAllTags().forEach(tag => {
        const comment = tag.comment ? ` -- ${tag.comment}` : '';
        lines.push(`${tag.tag}: ${tag.value}${comment}`);
      });
      lines.push('');
    });

    return lines.join('\n').trim();
  }
}
