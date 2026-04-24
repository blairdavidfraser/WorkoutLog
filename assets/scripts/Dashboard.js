import { Utilities } from './Utilities.js';

/**
 * Dashboard - Renders analytics and charts
 */
export class Dashboard {
  constructor(workoutLog) {
    this.workoutLog = workoutLog;
    this.currentPeriod = 30;
    this.chartInstances = {};
  }

  render() {
    const container = document.querySelector('.dashboard-container');
    if (!container) return;

    this.renderWeightChart(this.currentPeriod);
    this.renderWaistChart(this.currentPeriod);
    this.renderRPEChart(this.currentPeriod);
  }

  renderWeightChart(days) {
    const canvas = document.getElementById('weight-chart');
    if (!canvas) return;

    const data = this.workoutLog.getWeightHistory(days);
    if (data.length === 0) {
      canvas.parentElement.innerHTML = '<p style="text-align: center; color: #999;">No weight data available.</p>';
      return;
    }

    const average = this.workoutLog.getAverageWeightLastNDays(days);
    const ctx = canvas.getContext('2d');

    // Simple canvas chart drawing
    this.drawLineChart(
      ctx,
      canvas,
      data.map(d => d.weight),
      `${days}-Day Average: ${average ? average.toFixed(1) : 'N/A'} lbs`,
      '#d32f2f'
    );
  }

  renderWaistChart(days) {
    const canvas = document.getElementById('waist-chart');
    if (!canvas) return;

    const data = this.workoutLog.getWaistHistory(days);
    if (data.length === 0) {
      canvas.parentElement.innerHTML = '<p style="text-align: center; color: #999;">No waist data available.</p>';
      return;
    }

    const average = this.workoutLog.getAverageWaistLastNDays(days);
    const ctx = canvas.getContext('2d');

    this.drawLineChart(
      ctx,
      canvas,
      data.map(d => d.waist),
      `${days}-Day Average: ${average ? average.toFixed(1) : 'N/A'} in`,
      '#ffb74d'
    );
  }

  renderRPEChart(days) {
    const canvas = document.getElementById('rpe-chart');
    if (!canvas) return;

    // Get workouts for the period grouped by date
    const lastNDays = this.workoutLog.getLastNDays(days);
    const workouts = lastNDays.filter(e => 
      e.getRPE && typeof e.getRPE === 'function'
    );

    if (workouts.length === 0) {
      canvas.parentElement.innerHTML = '<p style="text-align: center; color: #999;">No workout data available.</p>';
      return;
    }

    // Group by date and activity type
    const byDateActivity = {};
    workouts.forEach(w => {
      if (!byDateActivity[w.date]) {
        byDateActivity[w.date] = {};
      }
      if (!byDateActivity[w.date][w.type]) {
        byDateActivity[w.date][w.type] = [];
      }
      const rpe = w.getRPE();
      if (rpe !== null) {
        byDateActivity[w.date][w.type].push(rpe);
      }
    });

    const dates = Object.keys(byDateActivity).sort();
    const activityTypes = [...new Set(workouts.map(w => w.type))];
    const activityColors = {
      'Run': '#ff9800',
      'Swim': '#01579b',
      'Cycle': '#d32f2f',
      'Row': '#0277bd',
      'Erg': '#757575',
      'Strength': '#d32f2f',
      'Yoga': '#ffb74d'
    };

    const ctx = canvas.getContext('2d');
    this.drawRPEChart(ctx, canvas, dates, byDateActivity, activityTypes, activityColors);
  }

  drawRPEChart(ctx, canvas, dates, byDateActivity, activityTypes, activityColors) {
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const padding = { top: 60, right: 40, bottom: 40, left: 50 };
    const legendHeight = 30;

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#d32f2f';
    ctx.fillText('RPE by Activity', padding.left, 25);

    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom - legendHeight;

    // Draw legend
    let legendX = padding.left;
    const legendY = canvas.height - padding.bottom - legendHeight + 5;
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#212121';

    activityTypes.forEach(type => {
      const color = activityColors[type] || '#999';
      
      // Color box
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY - 10, 12, 12);
      
      // Label
      ctx.fillStyle = '#212121';
      ctx.textAlign = 'left';
      ctx.fillText(type, legendX + 18, legendY - 2);
      
      legendX += 120;
    });

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(canvas.width - padding.right, y);
      ctx.stroke();
    }

    // Draw y-axis labels
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const rpe = 10 - (i * 2);
      const y = padding.top + (chartHeight / 5) * i;
      ctx.fillText(rpe, padding.left - 10, y + 4);
    }

    // Draw bars
    const barWidth = chartWidth / (dates.length || 1);
    const barGroupWidth = barWidth * 0.8;
    const barWidthPerActivity = barGroupWidth / (activityTypes.length || 1);

    dates.forEach((date, dateIndex) => {
      const activities = byDateActivity[date];
      let activityIndex = 0;

      activityTypes.forEach(type => {
        if (activities[type]) {
          const avgRPE = activities[type].reduce((a, b) => a + b, 0) / activities[type].length;
          const barHeight = (avgRPE / 10) * chartHeight;
          const x = padding.left + (dateIndex * barWidth) + (barGroupWidth - barWidthPerActivity * activityTypes.length) / 2 + (activityIndex * barWidthPerActivity);
          const y = padding.top + chartHeight - barHeight;

          const color = activityColors[type] || '#999';
          ctx.fillStyle = color;
          ctx.fillRect(x, y, barWidthPerActivity - 2, barHeight);
        }

        activityIndex++;
      });
    });
  }

  drawLineChart(ctx, canvas, values, title, color) {
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#d32f2f';
    ctx.fillText(title, padding, 20);

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (canvas.height - 2 * padding) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
    }

    // Scale data
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    values.forEach((value, i) => {
      const x = padding + (canvas.width - 2 * padding) * (i / (values.length - 1 || 1));
      const y = canvas.height - padding - (value - minValue) / range * (canvas.height - 2 * padding);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = color;
    values.forEach((value, i) => {
      const x = padding + (canvas.width - 2 * padding) * (i / (values.length - 1 || 1));
      const y = canvas.height - padding - (value - minValue) / range * (canvas.height - 2 * padding);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
}
