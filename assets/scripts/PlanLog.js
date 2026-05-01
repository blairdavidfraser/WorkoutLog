const PLAN_KEY = 'workout_plan';

function toDateString(d) {
  return d.toISOString().slice(0, 10);
}

export class PlanLog {
  load() {
    try {
      return JSON.parse(localStorage.getItem(PLAN_KEY) || '[]');
    } catch {
      return [];
    }
  }

  save(entries) {
    localStorage.setItem(PLAN_KEY, JSON.stringify(entries));
  }

  getPlannedDays() {
    const stored = this.load();
    const byDate = {};
    stored.forEach(e => { if (e.date) byDate[e.date] = e; });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const ds = toDateString(d);
      result.push(byDate[ds] || { date: ds, type: '', focus: '', rpe: null, notes: '' });
    }
    return result;
  }
}
