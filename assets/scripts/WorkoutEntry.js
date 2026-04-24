import { Duration, TagData, Utilities } from './Utilities.js';

/**
 * WorkoutEntry - Base class for all workout log entries
 */
export class WorkoutEntry {
  constructor(date, type, tags = [], shortcutName = null) {
    this.date = date; // YYYY-MM-DD
    this.type = type; // Daily, Run, Swim, etc.
    this.shortcutName = shortcutName; // "Cycle Commute", "Yoga", etc. if shorthand notation
    this.tags = new Map();
    
    tags.forEach(tag => {
      this.tags.set(tag.tag.toLowerCase(), tag);
    });
  }

  static parse(lines) {
    if (lines.length === 0) return null;
    
    const firstLine = lines[0].trim();
    const match = firstLine.match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)$/);
    
    if (!match) return null;
    
    const date = match[1];
    const originalType = match[2].trim();
    let type = originalType;
    let shortcutName = null;

    const tags = [];
    for (let i = 1; i < lines.length; i++) {
      const tag = WorkoutEntry.parseTag(lines[i]);
      if (tag) tags.push(tag);
    }

    // Detect shortcuts and normalize type
    const shortcut = WorkoutEntry.getShortcut(originalType);
    if (shortcut) {
      shortcutName = originalType; // Store original name
      type = shortcut.type;
      // Add default tags for shortcut
      shortcut.defaultTags.forEach(tag => {
        if (!tags.some(t => t.tag.toLowerCase() === tag.tag.toLowerCase())) {
          tags.push(tag);
        }
      });
    } else {
      type = WorkoutEntry.normalizeType(originalType);
    }

    // Return appropriate subclass
    return WorkoutEntry.createSubclass(date, type, tags, shortcutName);
  }

  static getShortcut(type) {
    const lower = type.toLowerCase().trim();
    
    if (lower === 'cycle commute') {
      return {
        type: 'Cycle',
        defaultTags: [new TagData('RPE', '3', 'default for cycle commute')]
      };
    }
    
    if (lower === 'yoga') {
      return {
        type: 'Yoga',
        defaultTags: [new TagData('RPE', '1', 'default for yoga')]
      };
    }
    
    if (lower === 'spin') {
      return {
        type: 'Cycle',
        defaultTags: []
      };
    }
    
    return null;
  }

  static normalizeType(type) {
    type = type.toLowerCase().trim();
    
    if (type === 'rowing') return 'Row';
    if (type === 'spin') return 'Cycle';
    
    const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
    return capitalize(type);
  }

  static createSubclass(date, type, tags, shortcutName = null) {
    switch (type) {
      case 'Daily':
        return new DailyLogEntry(date, tags, shortcutName);
      case 'Run':
      case 'Swim':
      case 'Cycle':
      case 'Row':
      case 'Erg':
        return new EnduranceWorkoutEntry(date, type, tags, shortcutName);
      case 'Strength':
        return new StrengthWorkoutEntry(date, tags, shortcutName);
      case 'Yoga':
        return new YogaEntry(date, tags, shortcutName);
      case 'Nutrition':
        return new NutritionEntry(date, tags, shortcutName);
      case 'Measurements':
        return new MeasurementsEntry(date, tags, shortcutName);
      case 'Data':
        return new DataEntry(date, tags, shortcutName);
      default:
        return new WorkoutEntry(date, type, tags, shortcutName);
    }
  }

  static parseTag(line) {
    if (!line || !line.includes(':')) return null;
    
    // Handle pipe as newline
    const parts = line.split('--');
    const tagValuePart = parts[0];
    const comment = parts.length > 1 ? parts[1].trim() : '';
    
    const colonIndex = tagValuePart.indexOf(':');
    if (colonIndex === -1) return null;
    
    const tag = tagValuePart.substring(0, colonIndex).trim();
    const value = tagValuePart.substring(colonIndex + 1).trim();
    
    return new TagData(tag, value, comment);
  }

  getTag(name) {
    return this.tags.get(name.toLowerCase()) || null;
  }

  hasTag(name) {
    return this.tags.has(name.toLowerCase());
  }

  getTagValue(name) {
    const tag = this.getTag(name);
    return tag ? tag.value : null;
  }

  getTagComment(name) {
    const tag = this.getTag(name);
    return tag ? tag.comment : null;
  }

  getNotes() {
    return this.getTagValue('Notes');
  }

  getPain() {
    const pain = this.getTagValue('Pain');
    return pain ? parseInt(pain, 10) : null;
  }

  getAllTags() {
    return Array.from(this.tags.values());
  }

  getTagNames() {
    return Array.from(this.tags.keys()).map(key => {
      const tag = this.tags.get(key);
      return tag.tag;
    });
  }
}

/**
 * DailyLogEntry - Daily body metrics
 */
export class DailyLogEntry extends WorkoutEntry {
  constructor(date, tags = [], shortcutName = null) {
    super(date, 'Daily', tags, shortcutName);
  }

  getWeight() {
    const weight = this.getTagValue('Weight');
    return weight ? Utilities.parseNumber(weight) : null;
  }

  getWaist() {
    const waist = this.getTagValue('Waist');
    return waist ? Utilities.parseNumber(waist) : null;
  }

  getRHR() {
    const rhr = this.getTagValue('RHR');
    return rhr ? parseInt(rhr, 10) : null;
  }

  getHRV() {
    const hrv = this.getTagValue('HRV');
    return hrv ? parseInt(hrv, 10) : null;
  }

  getSleep() {
    return Duration.parse(this.getTagValue('Sleep'));
  }

  getEnergy() {
    const energy = this.getTagValue('Energy');
    return energy ? parseInt(energy, 10) : null;
  }

  getIllness() {
    return this.getTagValue('Illness');
  }
}

/**
 * EnduranceWorkoutEntry - Run, Swim, Cycle, Row, Erg
 */
export class EnduranceWorkoutEntry extends WorkoutEntry {
  constructor(date, type, tags = [], shortcutName = null) {
    super(date, type, tags, shortcutName);
  }

  getRPE() {
    const rpe = this.getTagValue('RPE');
    // Default to 3 for cycle commute, 1 for yoga
    if (!rpe && this.type === 'Cycle') return 3;
    return rpe ? parseInt(rpe, 10) : 1;
  }

  getDuration() {
    return Duration.parse(this.getTagValue('Duration'));
  }

  getDistance() {
    const distance = this.getTagValue('Distance');
    return distance ? Utilities.parseNumber(distance) : null;
  }

  getAvgHR() {
    const avgHR = this.getTagValue('Avg HR');
    return avgHR ? parseInt(avgHR, 10) : null;
  }

  getMaxHR() {
    const maxHR = this.getTagValue('Max HR');
    return maxHR ? parseInt(maxHR, 10) : null;
  }

  getWatts() {
    const watts = this.getTagValue('Watts');
    return watts ? Utilities.parseNumber(watts) : null;
  }

  getDetails() {
    return this.getTagValue('Details');
  }
}

/**
 * StrengthWorkoutEntry - Strength training with exercises
 */
export class StrengthWorkoutEntry extends WorkoutEntry {
  constructor(date, tags = [], shortcutName = null) {
    super(date, 'Strength', tags, shortcutName);
  }

  getRPE() {
    const rpe = this.getTagValue('RPE');
    return rpe ? parseInt(rpe, 10) : null;
  }

  getFocus() {
    return this.getTagValue('Focus');
  }

  getDuration() {
    return Duration.parse(this.getTagValue('Duration'));
  }

  getExercises() {
    const exercises = [];
    const commonTags = ['RPE', 'Focus', 'Duration', 'Pain', 'Notes'];
    
    const tagNames = this.getTagNames();
    tagNames.forEach(tagName => {
      if (!commonTags.includes(tagName)) {
        const value = this.getTagValue(tagName);
        const comment = this.getTagComment(tagName);
        exercises.push({
          name: tagName,
          value: value,
          comment: comment
        });
      }
    });
    
    return exercises;
  }
}

/**
 * YogaEntry - Yoga/Mobility workouts
 */
export class YogaEntry extends WorkoutEntry {
  constructor(date, tags = [], shortcutName = null) {
    super(date, 'Yoga', tags, shortcutName);
  }

  getDuration() {
    return Duration.parse(this.getTagValue('Duration'));
  }

  getRPE() {
    const rpe = this.getTagValue('RPE');
    return rpe ? parseInt(rpe, 10) : 1; // Default to 1 for yoga
  }
}

/**
 * NutritionEntry - Meal logging
 */
export class NutritionEntry extends WorkoutEntry {
  constructor(date, tags = [], shortcutName = null) {
    super(date, 'Nutrition', tags, shortcutName);
  }

  getMeals() {
    const meals = [];
    const commonTags = ['Notes', 'Pain'];
    
    const tagNames = this.getTagNames();
    tagNames.forEach(tagName => {
      if (!commonTags.includes(tagName)) {
        meals.push({
          name: tagName,
          food: this.getTagValue(tagName),
          comment: this.getTagComment(tagName)
        });
      }
    });
    
    return meals;
  }
}

/**
 * MeasurementsEntry - Body composition measurements
 */
export class MeasurementsEntry extends WorkoutEntry {
  constructor(date, tags = [], shortcutName = null) {
    super(date, 'Measurements', tags, shortcutName);
  }

  getMeasurements() {
    const measurements = [];
    const commonTags = ['Notes', 'Pain'];
    
    const tagNames = this.getTagNames();
    tagNames.forEach(tagName => {
      if (!commonTags.includes(tagName)) {
        measurements.push({
          bodyPart: tagName,
          inches: Utilities.parseNumber(this.getTagValue(tagName)),
          comment: this.getTagComment(tagName)
        });
      }
    });
    
    return measurements;
  }
}

/**
 * DataEntry - Auxiliary measurements (DEXA, etc.)
 */
export class DataEntry extends WorkoutEntry {
  constructor(date, tags = [], shortcutName = null) {
    super(date, 'Data', tags, shortcutName);
  }
}
