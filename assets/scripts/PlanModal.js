const ACTIVITY_TYPES = ['Rest Day', 'Run', 'Swim', 'Cycle', 'Row', 'Erg', 'Yoga', 'Strength', 'Daily', 'Nutrition'];
const UNASSIGNED = '';

const FIELD_STYLE = 'width:100%;padding:0.25rem 0.5rem;border:2px solid var(--medium-gray);border-radius:var(--radius-md);font-size:0.95rem;box-sizing:border-box';
const LABEL_STYLE = 'font-weight:500;font-size:0.88rem;white-space:nowrap';

export class PlanModal {
  show(entry = null) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.cssText = 'max-width:360px;padding:var(--spacing-sm) var(--spacing-md) var(--spacing-md)';

      const header = document.createElement('div');
      header.className = 'modal-header';
      header.style.cssText = 'font-size:1.2rem;margin-bottom:var(--spacing-sm);padding-bottom:var(--spacing-xs)';
      header.textContent = 'Plan Workout';
      modal.appendChild(header);

      const currentType = entry?.type || UNASSIGNED;

      // Two-column grid: label | control
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:auto 1fr;gap:0.35rem var(--spacing-sm);align-items:center;margin-bottom:var(--spacing-sm)';

      const addRow = (labelText, el) => {
        el.style.cssText = FIELD_STYLE;
        const lbl = document.createElement('label');
        lbl.style.cssText = LABEL_STYLE;
        lbl.textContent = labelText;
        grid.appendChild(lbl);
        grid.appendChild(el);
        return el;
      };

      // Activity
      const typeSelect = addRow('Activity:', document.createElement('select'));
      if (currentType === UNASSIGNED) {
        const emptyOpt = document.createElement('option');
        emptyOpt.value = UNASSIGNED;
        emptyOpt.textContent = '–';
        emptyOpt.selected = true;
        typeSelect.appendChild(emptyOpt);
      }
      ACTIVITY_TYPES.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        if (currentType === t) opt.selected = true;
        typeSelect.appendChild(opt);
      });

      // Focus
      const focusInput = addRow('Focus:', document.createElement('input'));
      focusInput.type = 'text';
      focusInput.placeholder = 'Easy aerobic, Tempo…';
      focusInput.value = entry?.focus || '';

      // RPE
      const rpeInput = addRow('RPE:', document.createElement('select'));
      ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v || '–';
        if (String(entry?.rpe ?? '') === v) opt.selected = true;
        rpeInput.appendChild(opt);
      });

      modal.appendChild(grid);

      // Notes — label above, 2-row textarea
      const notesWrap = document.createElement('div');
      notesWrap.style.cssText = 'margin-bottom:var(--spacing-xs)';
      const notesLabel = document.createElement('label');
      notesLabel.style.cssText = 'display:block;' + LABEL_STYLE + ';margin-bottom:2px';
      notesLabel.textContent = 'Notes';
      const notesInput = document.createElement('textarea');
      notesInput.style.cssText = FIELD_STYLE + ';resize:none;font-family:inherit';
      notesInput.rows = 2;
      notesInput.placeholder = 'Optional notes…';
      notesInput.value = entry?.notes || '';
      notesWrap.appendChild(notesLabel);
      notesWrap.appendChild(notesInput);
      modal.appendChild(notesWrap);

      // Rest day / unassigned logic
      const applyRestDay = (isRest) => {
        rpeInput.value = isRest ? '1' : rpeInput.value;
        rpeInput.disabled = isRest;
      };

      applyRestDay(currentType === 'Rest Day');
      if (currentType === UNASSIGNED) { rpeInput.value = ''; rpeInput.disabled = true; }
      typeSelect.addEventListener('change', () => {
        rpeInput.disabled = false;
        applyRestDay(typeSelect.value === 'Rest Day');
      });

      // Actions — compact, no divider
      const actions = document.createElement('div');
      actions.className = 'modal-actions';
      actions.style.cssText = 'margin-top:var(--spacing-sm);padding-top:0;border-top:none;gap:var(--spacing-sm)';

      const todayStr = new Date().toISOString().slice(0, 10);
      const isToday = entry?.date === todayStr;
      const canComplete = isToday && currentType && currentType !== UNASSIGNED && currentType !== 'Rest Day';

      const getPayload = (completed) => {
        const type = typeSelect.value;
        return {
          type,
          focus: focusInput.value.trim(),
          rpe: type === 'Rest Day' ? 1
             : type === UNASSIGNED   ? null
             : (rpeInput.value ? parseInt(rpeInput.value, 10) : null),
          notes: notesInput.value.trim(),
          completed,
        };
      };

      if (canComplete) {
        const completedBtn = document.createElement('button');
        completedBtn.style.cssText = 'padding:0.3rem 0.9rem;background:#388e3c;color:white;border:2px solid #388e3c;border-radius:var(--radius-md);font-size:1rem;font-weight:500;cursor:pointer;margin-right:auto';
        completedBtn.textContent = 'Completed';
        completedBtn.addEventListener('click', () => {
          overlay.remove();
          resolve(getPayload(true));
        });
        typeSelect.addEventListener('change', () => {
          const v = typeSelect.value;
          completedBtn.style.display = (v === 'Rest Day' || v === UNASSIGNED) ? 'none' : '';
        });
        actions.appendChild(completedBtn);
      }

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn-primary';
      saveBtn.style.cssText = 'padding:0.3rem 0.9rem';
      saveBtn.textContent = 'Save';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn-secondary';
      cancelBtn.style.cssText = 'padding:0.3rem 0.9rem';
      cancelBtn.textContent = 'Cancel';

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      modal.appendChild(actions);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      saveBtn.addEventListener('click', () => {
        overlay.remove();
        resolve(getPayload(false));
      });

      cancelBtn.addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });
    });
  }
}
