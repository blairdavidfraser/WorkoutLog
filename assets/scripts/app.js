import { WorkoutLog } from './WorkoutLog.js';
import { WorkoutLogViewer } from './WorkoutLogViewer.js';
import { WorkoutLogEditor } from './WorkoutLogEditor.js';
import { Dashboard } from './Dashboard.js';
import { Persistence } from './Persistence.js';

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
