/**
 * Persistence - Local storage for workout log data
 */
export class Persistence {
  constructor() {
    this.storageKey = 'workoutLog';
    this.defaultLog = `# Workout Log
#
# Format: 
#   - Any line starting with # is textual content, and not data.
#   - Each entry is a block of text with no newlines. 
#   - The first line gives the date in YYYY-MM-DD format, followed by ':', followed by the type of entry.
#   - All subsequent lines take the form: "<Tag>: <Value> -- <Comment>".
#
# Example Daily Entry:
2025-11-04: Daily
Weight: 188 | Waist: 35 
Sleep: 6:08:00 -- Slept well 
Energy: 4
Pain: 3 -- Back stiff overnight, but loosens up after workout.

# Example Run Entry:
2025-11-05: Run
RPE: 8 | Distance: 5.72 | Duration: 0:30:20
Avg HR: 158
Pain: 1
Notes: Great run, feeling strong.

# Example Strength Entry:
2025-11-06: Strength
Focus: Upper Body
RPE: 7
Bench Press: 3x5x185 -- Felt good
Dumbbell Shoulder Press: 3x8x45 -- Strong
`;
  }

  async loadWorkoutLog() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored || this.defaultLog;
    } catch (error) {
      console.warn('Could not load from localStorage:', error);
      return this.defaultLog;
    }
  }

  async saveWorkoutLog(text) {
    try {
      localStorage.setItem(this.storageKey, text);
      return true;
    } catch (error) {
      console.error('Could not save to localStorage:', error);
      throw error;
    }
  }

  async clearWorkoutLog() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Could not clear localStorage:', error);
      throw error;
    }
  }

  async hasWorkoutLog() {
    try {
      return localStorage.getItem(this.storageKey) !== null;
    } catch (error) {
      return false;
    }
  }
}
