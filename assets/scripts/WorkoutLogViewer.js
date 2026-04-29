import { WorkoutEntry, EnduranceWorkoutEntry, StrengthWorkoutEntry, DailyLogEntry } from './WorkoutEntry.js';
import { Utilities } from './Utilities.js';

const UNITS = {
  'Weight':  ' lb.',
  'Waist':   '"',
  'Distance': ' km',
  'RHR':     ' bpm',
  'Avg HR':  ' bpm',
  'Max HR':  ' bpm',
  'HRV':     ' ms',
  'Pain':    '/5',
  'Energy':  '/5',
  'RPE':     '/10',
};

/**
 * WorkoutLogViewer - Renders workout log entries with tag filtering
 */
export class WorkoutLogViewer {
  constructor(workoutLog) {
    this.workoutLog = workoutLog;
    this.filteredTag = null;
    this.filteredActivityType = null;
    this.onEditEntry = null;
    this.activityColors = {
      'Run': 'run',
      'Swim': 'swim',
      'Cycle': 'cycle',
      'Row': 'row',
      'Erg': 'erg',
      'Yoga': 'yoga',
      'Strength': 'strength',
      'Daily': 'daily',
      'Nutrition': 'nutrition',
      'Measurements': 'measurements',
      'Data': 'data'
    };
  }

  render() {
    const container = document.getElementById('viewer-content');
    if (!container) return;

    container.innerHTML = '';

    // Show active filters
    this.renderFilters(container);

    // If filtered, show filtered view
    if (this.filteredTag) {
      this.renderFilteredTagView(container);
      return;
    }

    if (this.filteredActivityType) {
      this.renderFilteredActivityView(container);
      return;
    }

    // Otherwise, show all entries
    this.renderAllEntries(container);
  }

  renderFilters(container) {
    if (!this.filteredTag && !this.filteredActivityType) {
      return;
    }

    const filterDiv = document.createElement('div');
    filterDiv.className = 'filters-display';

    const label = document.createElement('span');
    label.className = 'filter-label';
    label.textContent = 'Filters: ';
    filterDiv.appendChild(label);

    if (this.filteredActivityType) {
      const pill = this.createFilterPill(this.filteredActivityType, 'activity');
      filterDiv.appendChild(pill);
    }

    if (this.filteredTag) {
      const pill = this.createFilterPill(this.filteredTag, 'tag');
      filterDiv.appendChild(pill);
    }

    container.appendChild(filterDiv);
  }

  createFilterPill(text, type) {
    const pill = document.createElement('span');
    pill.className = 'filter-pill';
    pill.textContent = text;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'filter-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
      if (type === 'activity') {
        this.filteredActivityType = null;
      } else if (type === 'tag') {
        this.filteredTag = null;
      }
      this.render();
      this.showBackButton(this.filteredTag || this.filteredActivityType);
    });

    pill.appendChild(closeBtn);
    return pill;
  }

  renderAllEntries(container) {
    const entries = this.workoutLog.entries;
    if (entries.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #999;">No workout log entries found.</p>';
      return;
    }

    let dayIndex = 0;
    let lastDate = null;
    entries.forEach(entry => {
      if (entry.date !== lastDate) {
        lastDate = entry.date;
        dayIndex++;
      }
      const entryDiv = this.createEntryElement(entry);
      entryDiv.classList.add(dayIndex % 2 === 0 ? 'day-stripe-even' : 'day-stripe-odd');
      container.appendChild(entryDiv);
    });

    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
  }

  createEntryElement(entry) {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'log-entry-text';

    // Header row: date + type link (left), pencil (right)
    const header = document.createElement('div');
    header.className = 'log-entry-header';

    const titleSpan = document.createElement('span');
    const boldSpan = document.createElement('strong');
    boldSpan.textContent = entry.date + ': ';
    titleSpan.appendChild(boldSpan);

    const typeLink = document.createElement('a');
    typeLink.href = '#';
    typeLink.className = 'type-hyperlink';
    typeLink.textContent = entry.shortcutName || entry.type;
    typeLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.onActivityTypeClick(entry.type);
    });
    titleSpan.appendChild(typeLink);
    header.appendChild(titleSpan);

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-entry-btn';
    editBtn.textContent = '✏️';
    editBtn.title = 'Edit entry';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onEditEntry) this.onEditEntry(entry);
    });
    header.appendChild(editBtn);

    entryDiv.appendChild(header);

    // Tag lines
    const tagsEl = document.createElement('pre');
    tagsEl.className = 'log-entry-tags';

    entry.getAllTags().forEach((tag, index) => {
      const tagLink = document.createElement('a');
      tagLink.href = '#';
      tagLink.className = 'tag-hyperlink';
      tagLink.textContent = tag.tag;
      tagLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.onTagClick(tag.tag, entry.type);
      });
      tagsEl.appendChild(tagLink);

      const unit = UNITS[tag.tag] || '';
      tagsEl.appendChild(document.createTextNode(': ' + tag.value + unit));

      if (tag.comment) {
        tagsEl.appendChild(document.createTextNode(' -- '));
        const commentSpan = document.createElement('span');
        commentSpan.className = 'comment-text';
        commentSpan.textContent = tag.comment;
        tagsEl.appendChild(commentSpan);
      }

      if (index < entry.getAllTags().length - 1) {
        tagsEl.appendChild(document.createTextNode('\n'));
      }
    });

    entryDiv.appendChild(tagsEl);

    return entryDiv;
  }

  renderFilteredTagView(container) {
    const entries = this.workoutLog.getEntriesWithTag(this.filteredTag);

    // Create table header
    const table = document.createElement('table');
    table.className = 'filtered-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const dateHeader = document.createElement('th');
    dateHeader.textContent = 'Date';
    const valueHeader = document.createElement('th');
    valueHeader.textContent = this.filteredTag;
    const commentHeader = document.createElement('th');
    commentHeader.textContent = 'Comment';

    headerRow.appendChild(dateHeader);
    headerRow.appendChild(valueHeader);
    headerRow.appendChild(commentHeader);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    entries.forEach(entry => {
      const row = document.createElement('tr');

      const dateCell = document.createElement('td');
      dateCell.textContent = Utilities.formatDateISO(entry.date);

      const valueCell = document.createElement('td');
      valueCell.textContent = entry.getTagValue(this.filteredTag) || '';

      const commentCell = document.createElement('td');
      commentCell.textContent = entry.getTagComment(this.filteredTag) || '';
      commentCell.className = 'comment-cell';

      row.appendChild(dateCell);
      row.appendChild(valueCell);
      row.appendChild(commentCell);
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  renderFilteredActivityView(container) {
    const entries = this.workoutLog.getEntriesByType(this.filteredActivityType);

    if (entries.length === 0) {
      container.innerHTML = `<p style="text-align: center; color: #999;">No ${this.filteredActivityType} entries found.</p>`;
      return;
    }

    entries.forEach(entry => {
      const entryDiv = this.createEntryElement(entry);
      container.appendChild(entryDiv);
    });
  }

  onTagClick(tagName, entryType) {
    // If it's an activity type, filter by activity
    if (['Run', 'Swim', 'Cycle', 'Row', 'Erg', 'Yoga', 'Strength'].includes(tagName)) {
      this.filteredActivityType = tagName;
    } else {
      this.filteredTag = tagName;
    }

    this.render();
    this.showBackButton(true);
  }

  onActivityTypeClick(type) {
    this.filteredActivityType = type;
    this.render();
    this.showBackButton(true);
  }

  goBack() {
    this.filteredTag = null;
    this.filteredActivityType = null;
    this.render();
    this.showBackButton(false);
  }

  showBackButton(show) {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.style.display = show ? 'block' : 'none';
    }
  }
}
