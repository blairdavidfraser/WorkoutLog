const ACTIVITY_TYPES = ['Rest Day', 'Run', 'Swim', 'Cycle', 'Row', 'Erg', 'Yoga', 'Strength', 'Daily', 'Nutrition'];
const UNASSIGNED = '';

export class PlanModal {
  show(entry = null) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.maxWidth = '360px';

      const header = document.createElement('div');
      header.className = 'modal-header';
      header.textContent = 'Plan Workout';
      modal.appendChild(header);

      const makeField = (labelText, el) => {
        const row = document.createElement('div');
        row.style.cssText = 'margin-bottom:var(--spacing-md)';
        const lbl = document.createElement('label');
        lbl.style.cssText = 'display:block;margin-bottom:var(--spacing-xs);font-weight:500';
        lbl.textContent = labelText;
        el.style.cssText = 'width:100%;padding:var(--spacing-sm) var(--spacing-md);border:2px solid var(--medium-gray);border-radius:var(--radius-md);font-size:1rem;box-sizing:border-box';
        row.appendChild(lbl);
        row.appendChild(el);
        modal.appendChild(row);
        return el;
      };

      const currentType = entry?.type || UNASSIGNED;

      const typeSelect = makeField('Activity', document.createElement('select'));
      // Only show the empty option for days that haven't been assigned yet;
      // once an activity is set there's no path back to unassigned.
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

      const focusInput = makeField('Focus / Tag', document.createElement('input'));
      focusInput.type = 'text';
      focusInput.placeholder = 'Easy aerobic, Tempo…';
      focusInput.value = entry?.focus || '';

      const rpeInput = makeField('Target RPE', document.createElement('select'));
      ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v || '–';
        if (String(entry?.rpe ?? '') === v) opt.selected = true;
        rpeInput.appendChild(opt);
      });

      const notesInput = makeField('Notes', document.createElement('input'));
      notesInput.type = 'text';
      notesInput.placeholder = 'Optional notes…';
      notesInput.value = entry?.notes || '';

      const applyRestDay = (isRest) => {
        if (isRest) {
          rpeInput.value = '1';
          rpeInput.disabled = true;
        } else {
          rpeInput.disabled = false;
        }
      };

      applyRestDay(currentType === 'Rest Day');
      if (currentType === UNASSIGNED) { rpeInput.value = ''; rpeInput.disabled = true; }
      typeSelect.addEventListener('change', () => {
        const v = typeSelect.value;
        rpeInput.disabled = false;
        applyRestDay(v === 'Rest Day');
      });

      const actions = document.createElement('div');
      actions.className = 'modal-actions';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn-primary';
      saveBtn.textContent = 'Save';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn-secondary';
      cancelBtn.textContent = 'Cancel';

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      modal.appendChild(actions);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      saveBtn.addEventListener('click', () => {
        const type = typeSelect.value;
        overlay.remove();
        resolve({
          type,
          focus: focusInput.value.trim(),
          rpe: type === 'Rest Day' ? 1
             : type === UNASSIGNED   ? null
             : (rpeInput.value ? parseInt(rpeInput.value, 10) : null),
          notes: notesInput.value.trim(),
        });
      });

      cancelBtn.addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });
    });
  }
}
