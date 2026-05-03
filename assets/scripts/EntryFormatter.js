/**
 * EntryFormatter - Canonical text serialisation for each entry type.
 * Used by EntryModal (saving) and WorkoutLogViewer (copy-to-clipboard).
 */

function tagLine(name, value, comment) {
  return comment ? `${name}: ${value} -- ${comment}` : `${name}: ${value}`;
}

export function formatDailyEntry(entry) {
  const lines = [`${entry.date}: Daily`];

  const weight = entry.getTagValue('Weight');
  const waist  = entry.getTagValue('Waist');
  const wc     = entry.getTagComment('Weight') || '';
  const wac    = entry.getTagComment('Waist')  || '';
  if (weight && waist && !wc && !wac) {
    lines.push(`Weight: ${weight} | Waist: ${waist}`);
  } else {
    if (weight) lines.push(tagLine('Weight', weight, wc));
    if (waist)  lines.push(tagLine('Waist',  waist,  wac));
  }

  const sleep = entry.getTagValue('Sleep');
  if (sleep) lines.push(tagLine('Sleep', sleep, entry.getTagComment('Sleep') || ''));

  const rhr = entry.getTagValue('RHR');
  const hrv = entry.getTagValue('HRV');
  const rc  = entry.getTagComment('RHR') || '';
  const hc  = entry.getTagComment('HRV') || '';
  if (rhr && hrv && !rc && !hc) {
    lines.push(`RHR: ${rhr} | HRV: ${hrv}`);
  } else {
    if (rhr) lines.push(tagLine('RHR', rhr, rc));
    if (hrv) lines.push(tagLine('HRV', hrv, hc));
  }

  const energy = entry.getTagValue('Energy');
  if (energy) lines.push(tagLine('Energy', energy, entry.getTagComment('Energy') || ''));

  const pain = entry.getTagValue('Pain');
  if (pain) lines.push(tagLine('Pain', pain, entry.getTagComment('Pain') || ''));

  const notes = entry.getTagValue('Notes');
  if (notes) lines.push(`Notes: ${notes}`);

  return lines.join('\n');
}

export function formatCardioEntry(entry) {
  const lines = [`${entry.date}: ${entry.shortcutName || entry.type}`];

  // Type tag only present when the activity type was non-standard
  const typeVal = entry.getTagValue('Type');
  if (typeVal) lines.push(tagLine('Type', typeVal, entry.getTagComment('Type') || ''));

  const focus = entry.getTagValue('Focus');
  const rpe   = entry.getTagValue('RPE');
  const fc    = entry.getTagComment('Focus') || '';
  const rc    = entry.getTagComment('RPE')   || '';
  if (focus && rpe && !fc && !rc) {
    lines.push(`Focus: ${focus} | RPE: ${rpe}`);
  } else {
    if (focus) lines.push(tagLine('Focus', focus, fc));
    if (rpe)   lines.push(tagLine('RPE',   rpe,   rc));
  }

  const distance = entry.getTagValue('Distance');
  const duration = entry.getTagValue('Duration');
  const power    = entry.getTagValue('Power');
  const dc = entry.getTagComment('Distance') || '';
  const uc = entry.getTagComment('Duration') || '';
  const pc = entry.getTagComment('Power')    || '';
  if ((distance || duration || power) && !dc && !uc && !pc) {
    const parts = [];
    if (distance) parts.push(`Distance: ${distance}`);
    if (duration) parts.push(`Duration: ${duration}`);
    if (power)    parts.push(`Power: ${power}`);
    lines.push(parts.join(' | '));
  } else {
    if (distance) lines.push(tagLine('Distance', distance, dc));
    if (duration) lines.push(tagLine('Duration', duration, uc));
    if (power)    lines.push(tagLine('Power',    power,    pc));
  }

  const avgHR = entry.getTagValue('Avg HR');
  const maxHR = entry.getTagValue('Max HR');
  const ac    = entry.getTagComment('Avg HR') || '';
  const mc    = entry.getTagComment('Max HR') || '';
  if (avgHR && maxHR && !ac && !mc) {
    lines.push(`Avg HR: ${avgHR} | Max HR: ${maxHR}`);
  } else {
    if (avgHR) lines.push(tagLine('Avg HR', avgHR, ac));
    if (maxHR) lines.push(tagLine('Max HR', maxHR, mc));
  }

  const pain = entry.getTagValue('Pain');
  if (pain) lines.push(tagLine('Pain', pain, entry.getTagComment('Pain') || ''));

  const notes = entry.getTagValue('Notes');
  if (notes) lines.push(`Notes: ${notes}`);

  const details = entry.getTagValue('Details');
  if (details) lines.push(`Details: ${details}`);

  return lines.join('\n');
}

export function formatStrengthEntry(entry) {
  const lines = [`${entry.date}: Strength`];

  const rpe   = entry.getTagValue('RPE');
  const focus = entry.getTagValue('Focus');
  const rc    = entry.getTagComment('RPE')   || '';
  const fc    = entry.getTagComment('Focus') || '';
  if (rpe && focus && !rc && !fc) {
    lines.push(`RPE: ${rpe} | Focus: ${focus}`);
  } else {
    if (rpe)   lines.push(tagLine('RPE',   rpe,   rc));
    if (focus) lines.push(tagLine('Focus', focus, fc));
  }

  const pain = entry.getTagValue('Pain');
  if (pain) lines.push(tagLine('Pain', pain, entry.getTagComment('Pain') || ''));

  entry.getExercises().forEach(ex => {
    if (ex.value) lines.push(tagLine(ex.name, ex.value, ex.comment || ''));
  });

  const notes = entry.getTagValue('Notes');
  if (notes) lines.push(`Notes: ${notes}`);

  return lines.join('\n');
}

export function formatNutritionEntry(entry) {
  const lines = [`${entry.date}: Nutrition`];
  const fieldOrder = ['Breakfast', 'Lunch', 'Dinner', 'AM Snacks', 'PM Snacks', 'Alcohol', 'Notes'];
  fieldOrder.forEach(label => {
    const value = entry.getTagValue(label);
    if (value) lines.push(tagLine(label, value, entry.getTagComment(label) || ''));
  });
  return lines.join('\n');
}

export function formatEntry(entry) {
  switch (entry.type) {
    case 'Daily':     return formatDailyEntry(entry);
    case 'Run':
    case 'Swim':
    case 'Cycle':
    case 'Row':
    case 'Erg':
    case 'Yoga':      return formatCardioEntry(entry);
    case 'Strength':  return formatStrengthEntry(entry);
    case 'Nutrition': return formatNutritionEntry(entry);
    default: {
      const lines = [`${entry.date}: ${entry.shortcutName || entry.type}`];
      entry.getAllTags().forEach(tag => {
        lines.push(tagLine(tag.tag, tag.value, tag.comment || ''));
      });
      return lines.join('\n');
    }
  }
}
