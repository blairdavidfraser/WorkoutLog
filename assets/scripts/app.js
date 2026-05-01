import { WorkoutLog } from './WorkoutLog.js';
import { WorkoutLogViewer } from './WorkoutLogViewer.js';
import { WorkoutLogEditor } from './WorkoutLogEditor.js';
import { Dashboard } from './Dashboard.js';
import { Persistence } from './Persistence.js';
import { EntryModal } from './EntryModal.js';
import { GitHub } from './GitHub.js';
import { PlanWidget } from './PlanWidget.js';
import { WorkoutEntry } from './WorkoutEntry.js';
import { TagData } from './Utilities.js';

/**
 * Main Application Controller
 */
class App {
  constructor() {
    this.persistence = new Persistence();
    this.github = new GitHub();
    this.planWidget = new PlanWidget();
    this.workoutLog = null;
    this.viewer = null;
    this.editor = null;
    this.dashboard = null;
    this.currentView = 'dashboard';
    this.logMode = 'view';
  }

  async init() {
    // Load data
    const logText = await this.persistence.loadWorkoutLog();
    this.workoutLog = WorkoutLog.parse(logText);

    // Initialize components
    this.viewer = new WorkoutLogViewer(this.workoutLog);
    this.editor = new WorkoutLogEditor(this.persistence, this.workoutLog);
    this.dashboard = new Dashboard(this.workoutLog);

    // Populate search datalist on init (viewer search needs it from the start)
    this.editor.populateTagSuggestions();

    // Setup event listeners
    this.setupNavigation();
    this.setupEditor();
    this.setupDashboard();

    // Render initial view
    this.renderDashboard();
    this.planWidget.init();
    this.planWidget.onDone = (planEntry) => {
      this.switchView('history');
      this.openModalForPlanEntry(planEntry);
    };

    // Initialize workout-log to view mode state
    this.enterViewMode(false);
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
      case 'planning':
        this.planWidget.render();
        break;
      case 'history':
        this.enterViewMode();
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

  async enterEditMode() {
    this.logMode = 'edit';
    document.getElementById('viewer-content').style.display = 'none';
    document.getElementById('viewer-search-bar').style.display = 'none';
    document.getElementById('add-entry-wrapper').style.display = 'none';
    document.getElementById('back-btn').style.display = 'none';
    document.getElementById('editor-header-actions').style.display = 'flex';
    document.getElementById('editor-panel').style.display = 'flex';
    document.getElementById('hamburger-mode-btn').textContent = 'View Log';
    document.getElementById('hamburger-dropdown').classList.remove('show');
    await this.editor.load();
  }

  enterViewMode(render = true) {
    this.logMode = 'view';
    document.getElementById('editor-panel').style.display = 'none';
    document.getElementById('editor-header-actions').style.display = 'none';
    document.getElementById('viewer-content').style.display = '';
    document.getElementById('viewer-search-bar').style.display = '';
    document.getElementById('add-entry-wrapper').style.display = '';
    document.getElementById('hamburger-mode-btn').textContent = 'Edit Log';
    document.getElementById('hamburger-dropdown').classList.remove('show');
    if (render) this.viewer.render();
  }

  setupEditor() {
    const selectAllBtn = document.getElementById('select-all-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const searchInput = document.getElementById('editor-search');
    const addEntryBtn = document.getElementById('add-entry-btn');
    const addEntryDropdown = document.getElementById('add-entry-dropdown');
    const dropdownItems = addEntryDropdown.querySelectorAll('button[data-entry-type]');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const hamburgerDropdown = document.getElementById('hamburger-dropdown');
    const hamburgerModeBtn = document.getElementById('hamburger-mode-btn');
    const hamburgerGithubBtn = document.getElementById('hamburger-github-btn');

    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hamburgerDropdown.classList.toggle('show');
      });
    }

    if (hamburgerGithubBtn) {
      hamburgerGithubBtn.addEventListener('click', async () => {
        hamburgerDropdown.classList.remove('show');

        if (!this.github.isConfigured()) {
          const saved = await this.github.showConfigModal();
          if (!saved) return;
        }

        hamburgerGithubBtn.disabled = true;
        hamburgerGithubBtn.textContent = '⏳ Uploading…';
        try {
          const content = await this.persistence.loadWorkoutLog();
          await this.github.upload(content);
          this.showToast('Uploaded to GitHub ✓');
        } catch (err) {
          const retry = confirm(`GitHub upload failed: ${err.message}\n\nUpdate GitHub settings?`);
          if (retry) await this.github.showConfigModal();
        } finally {
          hamburgerGithubBtn.disabled = false;
          hamburgerGithubBtn.textContent = '⬆️ GitHub';
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.hamburger-wrapper')) {
        hamburgerDropdown.classList.remove('show');
      }
    });

    if (hamburgerModeBtn) {
      hamburgerModeBtn.addEventListener('click', () => {
        const goToEdit = this.logMode === 'view';
        if (this.currentView !== 'history') {
          this.switchView('history');
        }
        if (goToEdit) {
          this.enterEditMode();
        } else {
          this.enterViewMode();
        }
      });
    }

    this.entryModal = new EntryModal(this.workoutLog, this.editor, this.persistence);
    this.viewer.onEditEntry = (entry) => this.openModalForEntry(entry);

    this.entryModal.onSaved = async () => {
      const logText = await this.persistence.loadWorkoutLog();
      this.workoutLog = WorkoutLog.parse(logText);
      this.viewer.workoutLog = this.workoutLog;
      this.viewer.onEditEntry = (entry) => this.openModalForEntry(entry);
      this.dashboard.workoutLog = this.workoutLog;
      this.editor.workoutLog = this.workoutLog;
      this.editor.originalText = logText;
      this.editor.textarea.value = logText;
      this.editor.populateTagSuggestions();
      if (this.currentView === 'history' && this.logMode === 'view') this.viewer.render();
      if (this.currentView === 'dashboard') this.dashboard.render();
    };

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
        addEntryDropdown.classList.remove('show');
        this.entryModal.workoutLog = this.workoutLog;
        this.entryModal.editor = this.editor;
        this.entryModal.persistence = this.persistence;
        switch (entryType) {
          case 'daily':     this.entryModal.showDaily(); break;
          case 'cardio':    this.entryModal.showCardio(); break;
          case 'strength':  this.entryModal.showStrength(); break;
          case 'nutrition': this.entryModal.showNutrition(); break;
          case 'misc':      this.entryModal.showMiscellaneous(); break;
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
          const logText = await this.persistence.loadWorkoutLog();
          this.workoutLog = WorkoutLog.parse(logText);
          this.viewer = new WorkoutLogViewer(this.workoutLog);
          this.viewer.onEditEntry = (entry) => this.openModalForEntry(entry);
          this.dashboard = new Dashboard(this.workoutLog);
          this.editor.workoutLog = this.workoutLog;
          this.editor.populateTagSuggestions();
          this.enterViewMode();
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.editor.cancel();
        this.enterViewMode();
      });
    }

    if (searchInput) {
      // Custom dropdown — native datalist is unreliable on iOS
      const searchDropdown = document.createElement('div');
      searchDropdown.className = 'search-dropdown';
      document.body.appendChild(searchDropdown);

      const getTagOptions = () => {
        const opts = new Set();
        this.workoutLog.entries.forEach(e => opts.add(e.shortcutName || e.type));
        this.workoutLog.getAllUniqueTags().forEach(t => opts.add(t));
        return Array.from(opts).sort();
      };

      const positionDropdown = () => {
        const rect = searchInput.getBoundingClientRect();
        searchDropdown.style.top = (rect.bottom + 2) + 'px';
        searchDropdown.style.left = rect.left + 'px';
        searchDropdown.style.width = rect.width + 'px';
      };

      const applyFilter = (value) => {
        const activityTypes = ['Run', 'Swim', 'Cycle', 'Row', 'Erg', 'Yoga', 'Strength', 'Daily', 'Nutrition'];
        const matchedType = activityTypes.find(t => t.toLowerCase() === value.toLowerCase());
        const isDate = /^\d{4}(-\d{2}(-\d{2})?)?$/.test(value);
        if (!value) {
          this.viewer.filteredTag = null;
          this.viewer.filteredActivityType = null;
          this.viewer.filteredDate = null;
        } else if (isDate) {
          this.viewer.filteredDate = value;
          this.viewer.filteredTag = null;
          this.viewer.filteredActivityType = null;
        } else if (matchedType) {
          this.viewer.filteredActivityType = matchedType;
          this.viewer.filteredTag = null;
          this.viewer.filteredDate = null;
        } else {
          this.viewer.filteredTag = value;
          this.viewer.filteredActivityType = null;
          this.viewer.filteredDate = null;
        }
        if (this.currentView === 'history' && this.logMode === 'view') {
          this.viewer.render();
          this.viewer.showBackButton(this.viewer.filteredTag || this.viewer.filteredActivityType || this.viewer.filteredDate);
        }
      };

      const showSearchDropdown = (filter = '') => {
        const lower = filter.toLowerCase();
        const options = getTagOptions();
        const matches = filter ? options.filter(o => o.toLowerCase().includes(lower)) : options;
        searchDropdown.innerHTML = '';
        matches.forEach(text => {
          const item = document.createElement('div');
          item.className = 'search-dropdown-item';
          item.textContent = text;
          item.addEventListener('pointerdown', e => {
            e.preventDefault(); // prevent input blur before selection
            searchInput.value = text;
            searchDropdown.classList.remove('show');
            applyFilter(text);
          });
          searchDropdown.appendChild(item);
        });
        positionDropdown();
        searchDropdown.classList.toggle('show', matches.length > 0);
      };

      searchInput.addEventListener('focus', () => showSearchDropdown(searchInput.value.trim()));
      searchInput.addEventListener('blur', () => searchDropdown.classList.remove('show'));
      searchInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        showSearchDropdown(value);
        applyFilter(value);
      });

      window.visualViewport?.addEventListener('resize', () => {
        if (searchDropdown.classList.contains('show')) positionDropdown();
      });
    }
  }

  openModalForPlanEntry(planEntry) {
    if (!planEntry.type || planEntry.type === 'Rest Day') return;
    const tags = [];
    if (planEntry.focus) tags.push(new TagData('Focus', planEntry.focus, ''));
    if (planEntry.rpe != null) tags.push(new TagData('RPE', String(planEntry.rpe), ''));
    if (planEntry.notes) tags.push(new TagData('Notes', planEntry.notes, ''));
    const entry = WorkoutEntry.createSubclass(planEntry.date, planEntry.type, tags);
    this.openModalForEntry(entry);
  }

  openModalForEntry(entry) {
    this.entryModal.workoutLog = this.workoutLog;
    this.entryModal.editor = this.editor;
    this.entryModal.persistence = this.persistence;
    switch (entry.type) {
      case 'Daily':    this.entryModal.showDaily(entry); break;
      case 'Run':
      case 'Swim':
      case 'Cycle':
      case 'Row':
      case 'Erg':
      case 'Yoga':     this.entryModal.showCardio(entry); break;
      case 'Strength': this.entryModal.showStrength(entry); break;
      case 'Nutrition': this.entryModal.showNutrition(entry); break;
      default:         this.entryModal.showMiscellaneous(); break;
    }
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

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    const viewerEl = document.getElementById('viewer-content');
    toast.style.top = (viewerEl ? viewerEl.getBoundingClientRect().top + 12 : 80) + 'px';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  app.setupViewerNavigation();
});
