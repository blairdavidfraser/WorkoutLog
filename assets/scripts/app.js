import { WorkoutLog } from './WorkoutLog.js';
import { WorkoutLogViewer } from './WorkoutLogViewer.js';
import { WorkoutLogEditor } from './WorkoutLogEditor.js';
import { Dashboard } from './Dashboard.js';
import { Persistence } from './Persistence.js';
import { EntryModal } from './EntryModal.js';

/**
 * Main Application Controller
 */
class App {
  constructor() {
    this.persistence = new Persistence();
    this.workoutLog = null;
    this.viewer = null;
    this.editor = null;
    this.dashboard = null;
    this.currentView = 'dashboard';
  }

  async init() {
    // Load data
    const logText = await this.persistence.loadWorkoutLog();
    this.workoutLog = WorkoutLog.parse(logText);

    // Initialize components
    this.viewer = new WorkoutLogViewer(this.workoutLog);
    this.editor = new WorkoutLogEditor(this.persistence, this.workoutLog);
    this.dashboard = new Dashboard(this.workoutLog);

    // Setup event listeners
    this.setupNavigation();
    this.setupEditor();
    this.setupDashboard();

    // Render initial view
    this.renderDashboard();
  }

  setupNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.switchView(view);
      });
    });
  }

  switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
    });

    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });

    // Show selected view
    const viewElement = document.getElementById(viewName);
    if (viewElement) {
      viewElement.classList.add('active');
    }

    const tabElement = document.querySelector(`[data-view="${viewName}"]`);
    if (tabElement) {
      tabElement.classList.add('active');
    }

    this.currentView = viewName;

    // Render appropriate view
    switch (viewName) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'viewer':
        this.renderViewer();
        break;
      case 'editor':
        this.renderEditor();
        break;
    }
  }

  renderDashboard() {
    // Always refresh dashboard data
    this.dashboard.render();
  }

  renderViewer() {
    this.viewer.render();
  }

  async renderEditor() {
    await this.editor.load();
  }

  setupEditor() {
    const selectAllBtn = document.getElementById('select-all-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const searchInput = document.getElementById('editor-search');
    const addEntryBtn = document.getElementById('add-entry-btn');
    const addEntryDropdown = document.getElementById('add-entry-dropdown');
    const dropdownItems = addEntryDropdown.querySelectorAll('button[data-entry-type]');

    const entryModal = new EntryModal(this.workoutLog, this.editor, this.persistence);

    // Add button toggle dropdown
    if (addEntryBtn) {
      addEntryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addEntryDropdown.classList.toggle('show');
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.add-entry-btn') && !e.target.closest('.add-entry-dropdown')) {
        addEntryDropdown.classList.remove('show');
      }
    });

    // Dropdown item click handlers
    dropdownItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const entryType = e.target.dataset.entryType;
        const itemRect = e.target.getBoundingClientRect();

        // Update modal reference to use current workoutLog
        entryModal.workoutLog = this.workoutLog;
        entryModal.editor = this.editor;
        entryModal.persistence = this.persistence;

        if (entryType === 'misc') {
          addEntryDropdown.classList.remove('show');
          entryModal.showMiscellaneous();
          return;
        }

        const todayEntries = this.getTodayEntriesByType(entryType);
        if (todayEntries.length > 0) {
          this.showEditOrNewMenu(itemRect, addEntryDropdown, todayEntries,
            () => this.openModal(entryModal, entryType, null),
            (entry) => this.openModal(entryModal, entryType, entry)
          );
        } else {
          addEntryDropdown.classList.remove('show');
          this.openModal(entryModal, entryType, null);
        }
      });
    });

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        this.editor.selectAll();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const success = await this.editor.save();
        if (success) {
          // Reload the log
          const logText = await this.persistence.loadWorkoutLog();
          this.workoutLog = WorkoutLog.parse(logText);
          this.viewer = new WorkoutLogViewer(this.workoutLog);
          this.dashboard = new Dashboard(this.workoutLog);
          this.editor.workoutLog = this.workoutLog;
          this.editor.populateTagSuggestions();
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.editor.cancel();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.editor.onSearchInput(e);
      });
    }
  }

  getTodayEntriesByType(entryType) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayEntries = this.workoutLog.entries.filter(e => e.date === todayStr);
    const cardioTypes = ['Run', 'Swim', 'Cycle', 'Row', 'Erg', 'Yoga'];
    switch (entryType) {
      case 'daily':    return todayEntries.filter(e => e.type === 'Daily');
      case 'cardio':   return todayEntries.filter(e => cardioTypes.includes(e.type));
      case 'strength': return todayEntries.filter(e => e.type === 'Strength');
      case 'nutrition': return todayEntries.filter(e => e.type === 'Nutrition');
      default: return [];
    }
  }

  openModal(entryModal, entryType, existingEntry) {
    switch (entryType) {
      case 'daily':    entryModal.showDaily(existingEntry); break;
      case 'cardio':   entryModal.showCardio(existingEntry); break;
      case 'strength': entryModal.showStrength(existingEntry); break;
      case 'nutrition': entryModal.showNutrition(existingEntry); break;
    }
  }

  showEditOrNewMenu(itemRect, parentDropdown, existingEntries, onNew, onEdit) {
    document.querySelectorAll('.entry-choice-menu').forEach(m => m.remove());

    const closeAll = () => {
      menu.remove();
      parentDropdown.classList.remove('show');
      document.removeEventListener('mousedown', closeOnOutside);
    };

    const menu = document.createElement('div');
    menu.className = 'entry-choice-menu';

    if (existingEntries.length === 1) {
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit Today\'s Entry';
      editBtn.addEventListener('click', () => { closeAll(); onEdit(existingEntries[0]); });
      menu.appendChild(editBtn);
    } else {
      existingEntries.forEach(entry => {
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit ' + (entry.shortcutName || entry.type);
        editBtn.addEventListener('click', () => { closeAll(); onEdit(entry); });
        menu.appendChild(editBtn);
      });
    }

    const newBtn = document.createElement('button');
    newBtn.textContent = 'New Entry';
    newBtn.addEventListener('click', () => { closeAll(); onNew(); });
    menu.appendChild(newBtn);

    document.body.appendChild(menu);

    menu.style.top = (itemRect.bottom + 4) + 'px';
    menu.style.left = itemRect.left + 'px';

    const closeOnOutside = (e) => {
      if (!menu.contains(e.target) && !parentDropdown.contains(e.target)) {
        closeAll();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', closeOnOutside), 0);
  }

  setupDashboard() {
    const periodBtns = document.querySelectorAll('.period-btn');
    periodBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const period = parseInt(e.target.dataset.period, 10);

        // Update active state
        periodBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        this.dashboard.currentPeriod = period;
        this.dashboard.render();
      });
    });

    // Set default active period
    const defaultBtn = document.querySelector('[data-period="30"]');
    if (defaultBtn) {
      defaultBtn.classList.add('active');
    }
  }

  setupViewerNavigation() {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.viewer.goBack();
      });
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  app.setupViewerNavigation();
});
