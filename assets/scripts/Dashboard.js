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
  }

  renderWeightChart(days) {
    const canvas = document.getElementById('weight-chart');
    if (!canvas) return;

    const data = this.workoutLog.getWeightHistory(days);
    if (data.length === 0) {
      const body = document.getElementById('weight-body');
      if (body) body.innerHTML = '<p style="text-align: center; color: #999;">No weight data available.</p>';
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
      const body = document.getElementById('waist-body');
      if (body) body.innerHTML = '<p style="text-align: center; color: #999;">No waist data available.</p>';
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
