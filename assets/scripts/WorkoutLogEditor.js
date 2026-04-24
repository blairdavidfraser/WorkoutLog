/**
 * WorkoutLogEditor - Text editor for the workout log
 */
export class WorkoutLogEditor {
  constructor(persistence, workoutLog) {
    this.persistence = persistence;
    this.workoutLog = workoutLog;
    this.originalText = '';
    this.textarea = document.getElementById('log-textarea');
    this.searchInput = document.getElementById('editor-search');
  }

  populateTagSuggestions() {
    const datalist = document.getElementById('tag-suggestions');
    if (!datalist || !this.workoutLog) return;

    datalist.innerHTML = '';
    const tags = this.workoutLog.getAllUniqueTags();
    
    tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      datalist.appendChild(option);
    });
  }

  async load() {
    try {
      const text = await this.persistence.loadWorkoutLog();
      this.originalText = text;
      this.textarea.value = text;
      this.populateTagSuggestions();
      
      // Scroll to bottom
      this.textarea.scrollTop = this.textarea.scrollHeight;
    } catch (error) {
      console.error('Error loading workout log:', error);
      this.textarea.value = 'Error loading workout log.';
    }
  }

  async save() {
    const newText = this.textarea.value;
    try {
      await this.persistence.saveWorkoutLog(newText);
      this.originalText = newText;
      alert('Workout log saved successfully!');
      return true;
    } catch (error) {
      console.error('Error saving workout log:', error);
      alert('Error saving workout log.');
      return false;
    }
  }

  cancel() {
    this.textarea.value = this.originalText;
  }

  selectAll() {
    this.textarea.select();
  }

  search(query) {
    if (!query) {
      this.textarea.value = this.originalText;
      return;
    }

    const lines = this.originalText.split('\n');
    const queryLower = query.toLowerCase();
    const filtered = lines.filter(line => 
      line.toLowerCase().includes(queryLower)
    );

    this.textarea.value = filtered.join('\n');
  }

  onSearchInput(event) {
    const query = event.target.value;
    this.search(query);
  }
}
