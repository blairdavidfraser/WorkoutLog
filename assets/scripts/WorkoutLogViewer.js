import { WorkoutEntry, EnduranceWorkoutEntry, StrengthWorkoutEntry, DailyLogEntry } from './WorkoutEntry.js';
import { Utilities } from './Utilities.js';
import { formatEntry } from './EntryFormatter.js';
import { weatherService, buildWeatherWidget } from './WeatherService.js';

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

function showCopyToast() {
  const viewerEl = document.getElementById('viewer-content');
  const top = viewerEl ? viewerEl.getBoundingClientRect().top + 12 : 80;
  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  toast.style.top = top + 'px';
  toast.textContent = 'Copied to clipboard';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1000);
}

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
    this.filteredDate = null;
    this.onEditEntry = null;
    this.onDeleteEntry = null;
    this.onScheduledSave = null;
    this.onEditScheduledEntry = null;
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
    if (this.filteredDate) {
      this.renderFilteredDateView(container);
      return;
    }

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
    if (!this.filteredTag && !this.filteredActivityType && !this.filteredDate) {
      return;
    }

    const filterDiv = document.createElement('div');
    filterDiv.className = 'filters-display';

    const label = document.createElement('span');
    label.className = 'filter-label';
    label.textContent = 'Filters: ';
    filterDiv.appendChild(label);

    if (this.filteredDate) {
      const pill = this.createFilterPill(this.filteredDate, 'date');
      filterDiv.appendChild(pill);
    }

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
      } else if (type === 'date') {
        this.filteredDate = null;
      }
      this.setSearchInput(this.filteredTag || this.filteredActivityType || this.filteredDate || '');
      this.render();
      this.showBackButton(this.filteredTag || this.filteredActivityType || this.filteredDate);
    });

    pill.appendChild(closeBtn);
    return pill;
  }

  renderFilteredDateView(container) {
    const entries = this.workoutLog.entries.filter(e => e.date.startsWith(this.filteredDate));
    if (entries.length === 0) {
      container.innerHTML = `<p style="text-align: center; color: #999;">No entries found for ${this.filteredDate}.</p>`;
      return;
    }
    entries.forEach(entry => {
      const card = this.createEntryElement(entry);
      container.appendChild(this.createSwipeWrapper(card, entry));
    });
  }

  renderAllEntries(container) {
    const allEntries = this.workoutLog.entries;
    // Sort by date to ensure correct divider position regardless of file order
    const entries = [...allEntries].sort((a, b) => a.date.localeCompare(b.date));

    // Use local date (not UTC) so the divider matches the user's calendar day
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const hasFuture = entries.some(e => e.date > today);

    if (entries.length === 0) {
      const msg = document.createElement('p');
      msg.style.cssText = 'text-align:center;color:#999;padding:var(--spacing-md) 0';
      msg.textContent = 'No workout log entries found.';
      container.appendChild(msg);
      container.appendChild(this.createScheduledDivider());
      return;
    }

    let dayIndex = 0;
    let lastDate = null;
    let dividerInserted = false;

    entries.forEach(entry => {
      if (!dividerInserted && entry.date > today) {
        dividerInserted = true;
        container.appendChild(this.createScheduledDivider());
      }
      if (entry.date !== lastDate) {
        lastDate = entry.date;
        dayIndex++;
      }
      const card = this.createEntryElement(entry, entry.date > today);
      card.classList.add(dayIndex % 2 === 0 ? 'day-stripe-even' : 'day-stripe-odd');
      container.appendChild(this.createSwipeWrapper(card, entry));
    });

    if (!dividerInserted) {
      container.appendChild(this.createScheduledDivider());
    }

    requestAnimationFrame(() => {
      const divider = container.querySelector('.scheduled-divider');
      if (hasFuture && divider) {
        const divTop = divider.getBoundingClientRect().top;
        const conTop = container.getBoundingClientRect().top;
        container.scrollTop += divTop - conTop;
      } else {
        container.scrollTop = container.scrollHeight;
      }
    });
  }

  createScheduledDivider() {
    const btn = document.createElement('button');
    btn.className = 'scheduled-divider';
    btn.textContent = 'Scheduled Workouts';
    btn.addEventListener('click', () => this.showScheduledModal());
    return btn;
  }

  showScheduledModal() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const existingFuture = [...this.workoutLog.entries]
      .filter(e => e.date > today)
      .sort((a, b) => a.date.localeCompare(b.date));

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'max-width:min(95vw,700px);width:100%;padding:var(--spacing-sm) var(--spacing-md) var(--spacing-md);display:flex;flex-direction:column;max-height:85vh;';
    modal.addEventListener('click', e => e.stopPropagation());

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.style.cssText = 'font-size:1.1rem;margin-bottom:var(--spacing-sm);padding-bottom:var(--spacing-xs)';
    header.textContent = 'Scheduled Workouts';
    modal.appendChild(header);

    // Scrollable table area
    const tableWrap = document.createElement('div');
    tableWrap.style.cssText = 'overflow:auto;flex:1;min-height:120px;margin-bottom:var(--spacing-sm)';

    const table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:0.87rem;';

    const thead = document.createElement('thead');
    const hRow = document.createElement('tr');
    [['Date', ''], ['Activity', ''], ['Focus', ''], ['', 'width:28px'], ['', 'width:20px']].forEach(([text, sty]) => {
      const th = document.createElement('th');
      th.style.cssText = `text-align:left;padding:3px 4px;font-weight:600;font-size:0.78rem;color:var(--dark-gray);border-bottom:1px solid var(--medium-gray);white-space:nowrap;${sty}`;
      th.textContent = text;
      hRow.appendChild(th);
    });
    thead.appendChild(hRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    tableWrap.appendChild(table);

    const TYPES = ['', 'Daily', 'Run', 'Swim', 'Cycle', 'Row', 'Erg', 'Yoga', 'Strength', 'Nutrition'];
    const F = 'width:100%;padding:2px 4px;border:1px solid var(--medium-gray);border-radius:var(--radius-sm);font-family:inherit;font-size:0.85rem;box-sizing:border-box;';

    const rows = [];

    const addRow = ({ date = '', type = '', focus = '', notes = '', entry = null } = {}) => {
      const tr = document.createElement('tr');
      const mkTd = (sty = '') => {
        const td = document.createElement('td');
        td.style.cssText = 'padding:2px 2px;' + sty;
        tr.appendChild(td);
        return td;
      };

      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.style.cssText = F + 'min-width:110px;';
      dateInput.value = date;
      dateInput.addEventListener('change', () => dateInput.blur());
      mkTd().appendChild(dateInput);

      const typeSelect = document.createElement('select');
      typeSelect.style.cssText = F + 'min-width:70px;';
      TYPES.forEach(t => {
        const o = document.createElement('option');
        o.value = t; o.textContent = t || '–';
        if (t === type) o.selected = true;
        typeSelect.appendChild(o);
      });
      mkTd().appendChild(typeSelect);

      const focusInput = document.createElement('input');
      focusInput.type = 'text'; focusInput.style.cssText = F;
      focusInput.value = focus; focusInput.placeholder = 'Easy aerobic…';
      mkTd().appendChild(focusInput);

      // Pencil — opens full entry modal for existing entries
      const pencilBtn = document.createElement('button');
      pencilBtn.type = 'button'; pencilBtn.textContent = '✏️';
      pencilBtn.style.cssText = 'background:none;border:none;font-size:0.95rem;cursor:pointer;padding:0;width:28px;line-height:1;filter:grayscale(1);opacity:' + (entry ? '0.45' : '0.15') + ';';
      if (entry) {
        pencilBtn.addEventListener('click', () => {
          overlay.remove();
          if (this.onEditScheduledEntry) this.onEditScheduledEntry(entry, () => this.showScheduledModal());
        });
      } else {
        pencilBtn.disabled = true;
      }
      mkTd('width:28px;text-align:center;').appendChild(pencilBtn);

      const delBtn = document.createElement('button');
      delBtn.type = 'button'; delBtn.textContent = '×';
      delBtn.style.cssText = 'background:none;border:none;color:#bbb;font-size:1.1rem;cursor:pointer;padding:0;width:20px;line-height:1;';
      delBtn.addEventListener('click', () => { tr.remove(); rows.splice(rows.indexOf(rowRef), 1); });
      mkTd('width:20px;').appendChild(delBtn);

      tbody.appendChild(tr);
      const rowRef = { dateInput, typeSelect, focusInput, notes };
      rows.push(rowRef);
    };

    existingFuture.forEach(e => addRow({
      date: e.date, type: e.type,
      focus: e.getTagValue('Focus') || '',
      notes: e.getTagValue('Notes') || '',
      entry: e,
    }));
    for (let i = 0; i < 5; i++) addRow();

    const addRowBtn = document.createElement('button');
    addRowBtn.type = 'button'; addRowBtn.textContent = '+ Add row';
    addRowBtn.style.cssText = 'background:none;border:none;color:var(--primary-red);font-size:0.83rem;cursor:pointer;padding:4px 2px;display:block;';
    addRowBtn.addEventListener('click', () => addRow());
    tableWrap.appendChild(addRowBtn);
    modal.appendChild(tableWrap);

    const divLine = document.createElement('hr');
    divLine.style.cssText = 'border:none;border-top:1px solid var(--medium-gray);margin:0 0 var(--spacing-sm)';
    modal.appendChild(divLine);

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.style.cssText = 'padding-top:0;border-top:none;gap:var(--spacing-sm);';

    const getValidRows = () => rows
      .map(r => ({ date: r.dateInput.value, type: r.typeSelect.value, focus: r.focusInput.value.trim(), notes: r.notes || '' }))
      .filter(r => r.date && r.type);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-secondary';
    copyBtn.style.cssText = 'padding:0.3rem 0.9rem;margin-right:auto;';
    copyBtn.textContent = 'Copy to Clipboard';
    copyBtn.addEventListener('click', () => {
      const lines = ['# Scheduled Future Workouts'];
      [...getValidRows()].sort((a, b) => a.date.localeCompare(b.date)).forEach(r => {
        const parts = [`${r.date}: ${r.type}`];
        if (r.focus) parts.push(`Focus: ${r.focus}`);
        if (r.notes) parts.push(`Notes: ${r.notes}`);
        lines.push(parts.join('\n'));
      });
      copyToClipboard(lines.join('\n\n'));
      showCopyToast();
    });
    actions.appendChild(copyBtn);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-primary';
    saveBtn.style.cssText = 'padding:0.3rem 0.9rem;';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
      const validRows = getValidRows();
      overlay.remove();
      if (this.onScheduledSave) this.onScheduledSave(validRows);
    });
    actions.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.style.cssText = 'padding:0.3rem 0.9rem;';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => overlay.remove());
    actions.appendChild(cancelBtn);

    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  createEntryElement(entry, isFuture = false) {
    const entryDiv = document.createElement('div');
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isTentative = entry.hasTag('Tags') && entry.getTagValue('Tags') === 'Tentative';
    const isTentativePast = isTentative && entry.date <= today;

    entryDiv.className = 'log-entry-text' + (isTentativePast ? ' tentative-entry' : '');

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

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-entry-btn';
    delBtn.textContent = '×';
    delBtn.title = 'Delete entry';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onDeleteEntry) this.onDeleteEntry(entry);
    });
    header.appendChild(delBtn);

    entryDiv.appendChild(header);

    // Tag lines
    const tagsEl = document.createElement('pre');
    tagsEl.className = 'log-entry-tags';

    const visibleTags = entry.getAllTags().filter(t => !(t.tag === 'Tags' && t.value === 'Tentative'));
    visibleTags.forEach((tag, index) => {
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
      if (tag.tag === 'Notes') {
        tagsEl.appendChild(document.createTextNode(': '));
        const noteSpan = document.createElement('span');
        noteSpan.className = 'comment-text';
        noteSpan.textContent = tag.value;
        tagsEl.appendChild(noteSpan);
      } else {
        tagsEl.appendChild(document.createTextNode(': ' + tag.value + unit));
      }

      if (tag.comment) {
        tagsEl.appendChild(document.createTextNode(' -- '));
        const commentSpan = document.createElement('span');
        commentSpan.className = 'comment-text';
        commentSpan.textContent = tag.comment;
        tagsEl.appendChild(commentSpan);
      }

      if (index < visibleTags.length - 1) {
        tagsEl.appendChild(document.createTextNode('\n'));
      }
    });

    entryDiv.appendChild(tagsEl);

    if (isFuture) {
      const weatherHolder = document.createElement('div');
      weatherHolder.className = 'weather-widget weather-widget--loading';
      weatherHolder.textContent = '⛅ …';
      entryDiv.appendChild(weatherHolder);
      weatherService.getWeatherForDate(entry.date)
        .then(w => {
          if (w) entryDiv.replaceChild(buildWeatherWidget(w), weatherHolder);
          else weatherHolder.remove();
        })
        .catch(() => weatherHolder.remove());
    }

    // Double-tap / double-click → copy entry to clipboard
    let lastTap = 0;

    const buildCopyText = () => formatEntry(entry);

    const isActionTarget = (e) => e.target.closest('.edit-entry-btn') || e.target.closest('.delete-entry-btn') || e.target.closest('a');

    // Press feedback (all pointer types); desktop double-click copy
    entryDiv.addEventListener('pointerdown', (e) => {
      if (isActionTarget(e)) return;
      entryDiv.classList.add('clicking');
    });
    entryDiv.addEventListener('pointerup', (e) => {
      entryDiv.classList.remove('clicking');
      if (e.pointerType !== 'mouse') return;
      if (isActionTarget(e)) return;
      const now = Date.now();
      if (now - lastTap < 350) {
        lastTap = 0;
        copyToClipboard(buildCopyText());
        showCopyToast();
      } else {
        lastTap = now;
      }
    });
    entryDiv.addEventListener('pointercancel', () => entryDiv.classList.remove('clicking'));

    return entryDiv;
  }

  createSwipeWrapper(card, entry) {
    const wrapper = document.createElement('div');
    wrapper.className = 'entry-swipe-wrapper';

    const editAction = document.createElement('div');
    editAction.className = 'entry-swipe-action entry-swipe-action--edit';
    editAction.textContent = 'Edit';
    wrapper.appendChild(editAction);

    const delAction = document.createElement('div');
    delAction.className = 'entry-swipe-action entry-swipe-action--delete';
    delAction.textContent = '×';
    wrapper.appendChild(delAction);

    wrapper.appendChild(card);

    const EDIT_SNAP = 80;
    const DEL_SNAP = -70;
    const THRESHOLD = 40;

    let snapX = 0;    // settled position after last gesture
    let baseX = 0;    // snapX at touchstart of current gesture
    let startX = 0, startY = 0;
    let isTracking = false, isHorizontal = null;
    let lastTap = 0;
    const buildCopyText = () => formatEntry(entry);

    const applySnap = (x, animate = true) => {
      snapX = x;
      card.style.transition = animate ? 'transform 0.2s ease' : 'none';
      card.style.transform = x === 0 ? '' : `translateX(${x}px)`;
    };

    wrapper.addEventListener('touchstart', (e) => {
      baseX = snapX;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isTracking = true;
      isHorizontal = null;
      card.style.transition = 'none';
    }, { passive: true });

    wrapper.addEventListener('touchmove', (e) => {
      if (!isTracking) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (isHorizontal === null) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        isHorizontal = Math.abs(dx) >= Math.abs(dy);
      }
      if (!isHorizontal) return;

      e.preventDefault();
      const clampedX = Math.max(DEL_SNAP, Math.min(EDIT_SNAP, baseX + dx));
      card.style.transform = `translateX(${clampedX}px)`;
    }, { passive: false });

    wrapper.addEventListener('touchend', (e) => {
      if (!isTracking) return;
      isTracking = false;

      const dx = e.changedTouches[0].clientX - startX;
      const wasTap = !isHorizontal && Math.abs(dx) < 10;

      if (isHorizontal) {
        // Swipe: decide snap destination
        const proposed = baseX + dx;
        if (proposed > THRESHOLD) {
          applySnap(EDIT_SNAP);
        } else if (proposed < -THRESHOLD) {
          applySnap(DEL_SNAP);
        } else {
          applySnap(0);
        }
        return;
      }

      if (wasTap) {
        if (snapX !== 0) {
          // Card is snapped — check if tap landed in the action zone
          const tapX = e.changedTouches[0].clientX;
          const wRect = wrapper.getBoundingClientRect();
          const relX = tapX - wRect.left;
          if (snapX === EDIT_SNAP && relX < EDIT_SNAP) {
            applySnap(0);
            if (this.onEditEntry) this.onEditEntry(entry);
          } else if (snapX === DEL_SNAP && relX > wRect.width + DEL_SNAP) {
            applySnap(0);
            if (this.onDeleteEntry) this.onDeleteEntry(entry);
          } else {
            applySnap(0); // tap outside action zone — just close
          }
        } else {
          // Not snapped — handle double-tap copy
          if (e.target.closest('.edit-entry-btn') || e.target.closest('.delete-entry-btn') || e.target.closest('a')) return;
          const now = Date.now();
          if (now - lastTap < 350) {
            lastTap = 0;
            copyToClipboard(buildCopyText());
            showCopyToast();
          } else {
            lastTap = now;
          }
        }
      }
    }, { passive: true });

    return wrapper;
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
      const card = this.createEntryElement(entry);
      container.appendChild(this.createSwipeWrapper(card, entry));
    });
  }

  setSearchInput(value) {
    const el = document.getElementById('editor-search');
    if (el) el.value = value;
  }

  onTagClick(tagName, entryType) {
    if (['Run', 'Swim', 'Cycle', 'Row', 'Erg', 'Yoga', 'Strength'].includes(tagName)) {
      this.filteredActivityType = tagName;
    } else {
      this.filteredTag = tagName;
    }
    this.setSearchInput(tagName);
    this.render();
    this.showBackButton(true);
  }

  onActivityTypeClick(type) {
    this.filteredActivityType = type;
    this.setSearchInput(type);
    this.render();
    this.showBackButton(true);
  }

  goBack() {
    this.filteredTag = null;
    this.filteredActivityType = null;
    this.filteredDate = null;
    this.setSearchInput('');
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
