import { PlanLog } from './PlanLog.js';
import { PlanModal } from './PlanModal.js';
import { weatherService, buildWeatherWidget } from './WeatherService.js';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export class PlanWidget {
  constructor() {
    this.planLog = new PlanLog();
    this.modal = new PlanModal();
    this.entries = [];
    this.onDone = null;
  }

  init() {
    const copyBtn = document.getElementById('plan-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyToClipboard());
    }
  }

  copyToClipboard() {
    if (!this.entries.length) this.entries = this.planLog.getPlannedDays();
    const lines = ['# Planned workouts for next 15 days', ''];
    this.entries.forEach(e => {
      if (!e.type) return;
      let line = `${e.date}: ${e.type}`;
      if (e.focus) line += ` | Focus: ${e.focus}`;
      if (e.rpe != null) line += ` | RPE: ${e.rpe}`;
      if (e.notes) line += ` | Notes: ${e.notes}`;
      lines.push(line);
    });
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
    this.showToast('Copied to Clipboard');
  }

  render() {
    const body = document.getElementById('plan-content');
    if (!body) return;

    this.entries = this.planLog.getPlannedDays();
    body.innerHTML = '';

    const rows = document.createElement('div');
    rows.className = 'plan-rows';
    this.entries.forEach((entry, i) => rows.appendChild(this.createRow(entry, i)));
    body.appendChild(rows);
  }

  createRow(entry, index) {
    const row = document.createElement('div');
    row.className = entry.completed ? 'plan-row plan-row--completed' : 'plan-row';
    row.draggable = true;
    row.dataset.index = index;

    const d = new Date(entry.date + 'T00:00:00');
    const label = `${DAY_NAMES[d.getDay()]} ${entry.date.slice(5).replace('-', '/')}`;

    const make = (cls, text) => {
      const span = document.createElement('span');
      span.className = `plan-cell ${cls}`;
      span.textContent = text;
      return span;
    };

    row.appendChild(make('plan-date', label));
    row.appendChild(make('plan-type', entry.type || '-----'));
    row.appendChild(make('plan-focus', entry.focus || ''));
    row.appendChild(make('plan-rpe', entry.rpe != null ? `RPE ${entry.rpe}` : ''));

    const actionsCell = document.createElement('span');
    actionsCell.className = 'plan-cell plan-row-actions';

    const handle = document.createElement('span');
    handle.className = 'plan-drag-handle';
    handle.addEventListener('click', (e) => e.stopPropagation());
    actionsCell.appendChild(handle);

    row.appendChild(actionsCell);

    this.attachRowEvents(row, entry, index, handle);
    return row;
  }

  attachRowEvents(row, entry, index, handle) {
    let touchStartY = 0;
    let isTouchDragging = false;
    let touchOnHandle = false;
    let ghost = null;

    const openModal = async () => {
      if (entry.completed) return;
      const result = await this.modal.show(entry);
      if (result !== null) {
        const { completed, ...data } = result;
        this.entries[index] = { ...this.entries[index], ...data };
        if (completed) this.entries[index].completed = true;
        const completedEntry = { ...this.entries[index] };
        this.planLog.save(this.entries);
        this.render();
        if (completed && this.onDone) {
          this.onDone(completedEntry);
        } else {
          this.showToast('Saved to Plan');
        }
      }
    };

    row.addEventListener('click', (e) => {
      if (e.target.closest('.plan-type')) openModal();
      else if (e.target.closest('.plan-date')) this.showWeatherModal(entry.date);
    });

    let touchOnClickable = false;
    let touchOnDate = false;

    row.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      isTouchDragging = false;
      touchOnHandle = handle.contains(e.target) || e.target === handle;
      touchOnClickable = !!e.target.closest('.plan-type');
      touchOnDate = !!e.target.closest('.plan-date');
    }, { passive: true });

    row.addEventListener('touchmove', (e) => {
      if (!touchOnHandle) return;
      e.preventDefault(); // prevent page scroll when dragging from handle
      const currentY = e.touches[0].clientY;

      if (!isTouchDragging) {
        if (Math.abs(currentY - touchStartY) <= 10) return;
        isTouchDragging = true;
        const rect = row.getBoundingClientRect();
        ghost = row.cloneNode(true);
        ghost.className = 'plan-row plan-ghost';
        Object.assign(ghost.style, {
          position: 'fixed',
          left: rect.left + 'px',
          width: rect.width + 'px',
          top: (currentY - 20) + 'px',
          opacity: '0.85',
          pointerEvents: 'none',
          zIndex: '1000',
          background: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          borderRadius: 'var(--radius-md)',
        });
        document.body.appendChild(ghost);
        row.classList.add('dragging');
      }

      ghost.style.top = (currentY - 20) + 'px';
      document.querySelectorAll('.plan-row').forEach(r => r.classList.remove('drag-over'));
      const els = document.elementsFromPoint(e.touches[0].clientX, currentY);
      const target = els.find(el => el.classList.contains('plan-row') && el !== row && !el.classList.contains('plan-ghost'));
      if (target) target.classList.add('drag-over');
    }, { passive: false });

    const cleanupTouch = () => {
      if (ghost) { ghost.remove(); ghost = null; }
      row.classList.remove('dragging');
      document.querySelectorAll('.plan-row').forEach(r => r.classList.remove('drag-over'));
      isTouchDragging = false;
      touchOnHandle = false;
    };

    row.addEventListener('touchend', (e) => {
      if (isTouchDragging) {
        const touch = e.changedTouches[0];
        const els = document.elementsFromPoint(touch.clientX, touch.clientY);
        const target = els.find(el => el.classList.contains('plan-row') && el !== row && !el.classList.contains('plan-ghost'));
        cleanupTouch();
        if (target) {
          const toIndex = parseInt(target.dataset.index, 10);
          if (!isNaN(toIndex) && toIndex !== index) this.reorder(index, toIndex);
        }
        return;
      }
      const wasOnHandle = touchOnHandle;
      const wasOnClickable = touchOnClickable;
      const wasOnDate = touchOnDate;
      cleanupTouch();
      if (!wasOnHandle && wasOnClickable) openModal();
      else if (!wasOnHandle && wasOnDate) this.showWeatherModal(entry.date);
    }, { passive: true });

    row.addEventListener('touchcancel', cleanupTouch, { passive: true });

    // Desktop: drag only from handle
    row.draggable = false;
    handle.addEventListener('mousedown', () => { row.draggable = true; });

    row.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', String(index));
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => row.classList.add('dragging'), 0);
    });

    row.addEventListener('dragend', () => {
      row.draggable = false;
      row.classList.remove('dragging');
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.plan-row').forEach(r => r.classList.remove('drag-over'));
      row.classList.add('drag-over');
    });

    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(fromIndex) && fromIndex !== index) this.reorder(fromIndex, index);
    });
  }

  reorder(fromIndex, toIndex) {
    const dates = this.entries.map(e => e.date);
    const workouts = this.entries.map(({ type, focus, rpe }) => ({ type, focus, rpe }));
    const [moved] = workouts.splice(fromIndex, 1);
    workouts.splice(toIndex, 0, moved);
    this.entries = dates.map((date, i) => ({ date, ...workouts[i] }));
    this.planLog.save(this.entries);
    this.render();
  }

  async showWeatherModal(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', () => overlay.remove());

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'max-width:260px;padding:var(--spacing-md);text-align:center';
    modal.addEventListener('click', e => e.stopPropagation());

    const title = document.createElement('div');
    title.style.cssText = 'font-weight:600;font-size:0.95rem;margin-bottom:var(--spacing-sm);color:var(--primary-red)';
    title.textContent = label;
    modal.appendChild(title);

    const loading = document.createElement('div');
    loading.className = 'weather-widget weather-widget--loading';
    loading.textContent = '⛅ Loading…';
    modal.appendChild(loading);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-secondary';
    closeBtn.style.cssText = 'margin-top:var(--spacing-sm);padding:0.25rem 0.9rem;font-size:0.9rem;width:100%';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => overlay.remove());
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    try {
      const weather = await weatherService.getWeatherForDate(dateStr);
      modal.replaceChild(
        weather ? buildWeatherWidget(weather) : (() => {
          const msg = document.createElement('div');
          msg.className = 'weather-widget weather-widget--loading';
          msg.textContent = 'No forecast available.';
          return msg;
        })(),
        loading
      );
    } catch {
      loading.textContent = 'Weather unavailable.';
    }
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.style.top = '80px';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
  }
}
