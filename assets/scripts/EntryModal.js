import { TagData } from './Utilities.js';
import { WorkoutEntry, StrengthWorkoutEntry } from './WorkoutEntry.js';
import { formatEntry } from './EntryFormatter.js';

function showToast(message) {
  const viewerEl = document.getElementById('viewer-content');
  const top = viewerEl ? viewerEl.getBoundingClientRect().top + 12 : 80;
  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  toast.style.top = top + 'px';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1500);
}

/**
 * EntryModal - Handles entry creation modals
 */
export class EntryModal {
    constructor(workoutLog, editor, persistence) {
        this.workoutLog = workoutLog;
        this.editor = editor;
        this.persistence = persistence;
        this.onSaved = null;
    }

    showDaily(existingEntry = null) {
        const modal = this.createModal('Daily Log');
        const table = document.createElement('table');
        table.className = 'form-table';

        // Create date input
        const dateInput = this.createDateInput();

        // Date row
        const dateRow = document.createElement('tr');

        const dateLabelCell = document.createElement('td');
        dateLabelCell.className = 'label-cell';
        dateLabelCell.textContent = 'Date';
        dateRow.appendChild(dateLabelCell);

        const dateColonCell = document.createElement('td');
        dateColonCell.className = 'separator';
        dateColonCell.textContent = ':';
        dateRow.appendChild(dateColonCell);

        const dateInputCell = document.createElement('td');
        dateInputCell.appendChild(dateInput);
        dateRow.appendChild(dateInputCell);

        const dateEmptyCell1 = document.createElement('td');
        dateEmptyCell1.className = 'empty-cell';
        dateRow.appendChild(dateEmptyCell1);

        const dateEmptyCell2 = document.createElement('td');
        dateEmptyCell2.className = 'empty-cell';
        dateRow.appendChild(dateEmptyCell2);

        table.appendChild(dateRow);

        const fields = [
            { label: 'Weight', type: 'text', noComment: true, placeholder: 'lb.' },
            { label: 'Waist', type: 'text', noComment: true, placeholder: '"' },
            { label: 'Sleep', type: 'text', noComment: false },
            { label: 'RHR', type: 'text', noComment: true, placeholder: 'bpm' },
            { label: 'HRV', type: 'text', noComment: true, placeholder: 'ms' },
            { label: 'Energy', type: 'select', options: ['', '1', '2', '3', '4', '5'], noComment: false },
            { label: 'Pain', type: 'select', options: ['', '1', '2', '3', '4', '5'], noComment: false },
            { label: 'Notes', type: 'textarea', noComment: true }
        ];

        const formData = {};

        fields.forEach(field => {
            const tr = document.createElement('tr');

            const labelCell = document.createElement('td');
            labelCell.className = 'label-cell';
            labelCell.textContent = field.label;
            tr.appendChild(labelCell);

            const colonCell = document.createElement('td');
            colonCell.className = 'separator';
            colonCell.textContent = ':';
            tr.appendChild(colonCell);

            const inputCell = document.createElement('td');
            let input;

            if (field.type === 'select') {
                input = document.createElement('select');
                field.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt || '–';
                    input.appendChild(option);
                });
            } else if (field.type === 'textarea') {
                input = document.createElement('textarea');
                if (field.label === 'Notes') {
                    input.className = 'notes-field';
                    inputCell.className = 'notes-cell';
                }
            } else {
                input = document.createElement('input');
                input.type = field.type;
                if (field.placeholder) input.placeholder = field.placeholder;
            }

            input.name = field.label;
            inputCell.appendChild(input);
            tr.appendChild(inputCell);

            // For Notes field, only create 3 cells; for others, create 4
            if (field.label !== 'Notes') {
                const commentBtnCell = document.createElement('td');
                commentBtnCell.className = 'comment-btn-cell';
                const commentBtn = document.createElement('button');
                commentBtn.type = 'button';
                commentBtn.className = 'comment-btn';
                commentBtn.textContent = '+';
                commentBtn.title = 'Add comment';
                commentBtn._comment = '';
                commentBtn.addEventListener('click', () => this.showCommentPopup(commentBtn));
                commentBtnCell.appendChild(commentBtn);
                tr.appendChild(commentBtnCell);
                formData[field.label] = { input, commentBtn };
            } else {
                formData[field.label] = { input, commentBtn: null };
            }

            table.appendChild(tr);
        });

        // Pre-populate if editing
        if (existingEntry) {
            dateInput.value = existingEntry.date;
            Object.keys(formData).forEach(label => {
                const { input, commentBtn } = formData[label];
                const val = existingEntry.getTagValue(label);
                const comment = existingEntry.getTagComment(label);
                if (val !== null && val !== undefined) input.value = val;
                if (comment && commentBtn) {
                    commentBtn._comment = comment;
                    commentBtn.classList.add('has-comment');
                }
            });
        }

        modal.appendChild(table);

        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-primary';
        saveBtn.textContent = existingEntry ? 'Update' : 'Save';
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Cancel';

        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);
        modal.appendChild(actions);

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        saveBtn.addEventListener('click', () => {
            this.saveDailyEntry(formData, dateInput.value, overlay, existingEntry);
        });

        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

    }

    saveDailyEntry(formData, selectedDate, overlay, existingEntry = null) {
        const tags = [];
        const field = (label) => ({
            value:   formData[label].input.value,
            comment: formData[label].commentBtn?._comment || '',
        });

        const w = field('Weight'); if (w.value) tags.push(new TagData('Weight', w.value, w.comment));
        const wa = field('Waist'); if (wa.value) tags.push(new TagData('Waist', wa.value, wa.comment));
        const sl = field('Sleep'); if (sl.value) tags.push(new TagData('Sleep', sl.value, sl.comment));
        const rh = field('RHR');   if (rh.value) tags.push(new TagData('RHR', rh.value, rh.comment));
        const hv = field('HRV');   if (hv.value) tags.push(new TagData('HRV', hv.value, hv.comment));
        const en = field('Energy'); if (en.value) tags.push(new TagData('Energy', en.value, en.comment));
        const pa = field('Pain');   if (pa.value) tags.push(new TagData('Pain', pa.value, pa.comment));
        const no = field('Notes');  if (no.value) tags.push(new TagData('Notes', no.value, ''));

        const content = formatEntry(new WorkoutEntry(selectedDate, 'Daily', tags));
        if (existingEntry) {
            this.replaceAndSave(existingEntry, content, overlay);
        } else {
            this.appendAndSave(content, overlay);
        }
    }

    showCardio(existingEntry = null, prefill = null) {
        const modal = this.createModal('Cardio Entry');
        const table = document.createElement('table');
        table.className = 'form-table';

        // Create date input
        const dateInput = this.createDateInput();

        // Date row
        const dateRow = document.createElement('tr');

        const dateLabelCell = document.createElement('td');
        dateLabelCell.className = 'label-cell';
        dateLabelCell.textContent = 'Date';
        dateRow.appendChild(dateLabelCell);

        const dateColonCell = document.createElement('td');
        dateColonCell.className = 'separator';
        dateColonCell.textContent = ':';
        dateRow.appendChild(dateColonCell);

        const dateInputCell = document.createElement('td');
        dateInputCell.appendChild(dateInput);
        dateRow.appendChild(dateInputCell);

        const dateEmptyCell1 = document.createElement('td');
        dateEmptyCell1.className = 'empty-cell';
        dateRow.appendChild(dateEmptyCell1);

        const dateEmptyCell2 = document.createElement('td');
        dateEmptyCell2.className = 'empty-cell';
        dateRow.appendChild(dateEmptyCell2);

        table.appendChild(dateRow);

        const fields = [
            { label: 'Type', type: 'select', options: ['Run', 'Cycle', 'Erg', 'Swim', 'Row', 'Yoga'], noComment: false },
            { label: 'Focus', type: 'text', noComment: false },
            { label: 'RPE', type: 'select', options: ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], noComment: false },
            { label: 'Distance', type: 'text', noComment: false, placeholder: 'km' },
            { label: 'Duration', type: 'text', noComment: false },
            { label: 'Power', type: 'text', noComment: false },
            { label: 'Avg HR', type: 'text', noComment: false, placeholder: 'bpm' },
            { label: 'Max HR', type: 'text', noComment: false, placeholder: 'bpm' },
            { label: 'Pain', type: 'select', options: ['', '1', '2', '3', '4', '5'], noComment: false },
            { label: 'Details', type: 'textarea', noComment: true, rows: 3 },
            { label: 'Notes', type: 'textarea', noComment: true, rows: 3 }
        ];

        const formData = {};

        fields.forEach(field => {
            const tr = document.createElement('tr');

            const labelCell = document.createElement('td');
            labelCell.className = 'label-cell';
            labelCell.textContent = field.label;
            tr.appendChild(labelCell);

            const colonCell = document.createElement('td');
            colonCell.className = 'separator';
            colonCell.textContent = ':';
            tr.appendChild(colonCell);

            const inputCell = document.createElement('td');
            let input;

            if (field.type === 'select') {
                input = document.createElement('select');
                field.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt || '–';
                    input.appendChild(option);
                });
            } else if (field.type === 'textarea') {
                input = document.createElement('textarea');
                if (field.noComment) {
                    input.className = 'notes-field';
                    inputCell.className = 'notes-cell';
                }
                if (field.rows) input.rows = field.rows;
            } else {
                input = document.createElement('input');
                input.type = field.type;
                if (field.placeholder) input.placeholder = field.placeholder;
            }

            input.name = field.label;
            inputCell.appendChild(input);
            tr.appendChild(inputCell);

            if (!field.noComment) {
                const commentBtnCell = document.createElement('td');
                commentBtnCell.className = 'comment-btn-cell';
                const commentBtn = document.createElement('button');
                commentBtn.type = 'button';
                commentBtn.className = 'comment-btn';
                commentBtn.textContent = '+';
                commentBtn.title = 'Add comment';
                commentBtn._comment = '';
                commentBtn.addEventListener('click', () => this.showCommentPopup(commentBtn));
                commentBtnCell.appendChild(commentBtn);
                tr.appendChild(commentBtnCell);
                formData[field.label] = { input, commentBtn };
            } else {
                formData[field.label] = { input, commentBtn: null };
            }

            table.appendChild(tr);
        });

        // Pre-populate if editing or prefilling from Strava
        const source = existingEntry || prefill;
        if (source) {
            dateInput.value = source.date;
            formData['Type'].input.value = source.type;
            ['Focus', 'RPE', 'Distance', 'Duration', 'Power', 'Avg HR', 'Max HR', 'Pain', 'Details', 'Notes'].forEach(label => {
                const f = formData[label];
                if (!f) return;
                const val = source.getTagValue(label);
                const comment = source.getTagComment(label);
                if (val !== null && val !== undefined) f.input.value = val;
                if (comment && f.commentBtn) {
                    f.commentBtn._comment = comment;
                    f.commentBtn.classList.add('has-comment');
                }
            });
        }

        modal.appendChild(table);

        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-primary';
        saveBtn.textContent = existingEntry ? 'Update' : 'Save';
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Cancel';

        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);
        modal.appendChild(actions);

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const getActivityType = () => {
            const type = formData['Type'].input.value;
            if (['Run', 'Swim', 'Cycle', 'Row', 'Erg', 'Yoga'].includes(type)) {
                return type;
            }
            return 'Cardio';
        };

        saveBtn.addEventListener('click', () => {
            this.saveCardioEntry(formData, dateInput.value, getActivityType(), overlay, existingEntry);
        });

        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

    }

    saveCardioEntry(formData, selectedDate, activityType, overlay, existingEntry = null) {
        const tags = [];
        const field = (label) => ({
            value:   formData[label].input.value,
            comment: formData[label].commentBtn?._comment || '',
        });

        const type = formData['Type'].input.value;
        const typeComment = formData['Type'].commentBtn?._comment || '';
        if (type && type !== activityType) tags.push(new TagData('Type', type, typeComment));

        const fo = field('Focus');    if (fo.value) tags.push(new TagData('Focus',    fo.value, fo.comment));
        const rp = field('RPE');      if (rp.value) tags.push(new TagData('RPE',      rp.value, rp.comment));
        const di = field('Distance'); if (di.value) tags.push(new TagData('Distance', di.value, di.comment));
        const du = field('Duration'); if (du.value) tags.push(new TagData('Duration', du.value, du.comment));
        const po = field('Power');    if (po.value) tags.push(new TagData('Power',    po.value, po.comment));
        const ah = field('Avg HR');   if (ah.value) tags.push(new TagData('Avg HR',   ah.value, ah.comment));
        const mh = field('Max HR');   if (mh.value) tags.push(new TagData('Max HR',   mh.value, mh.comment));
        const pa = field('Pain');     if (pa.value) tags.push(new TagData('Pain',     pa.value, pa.comment));
        const no = field('Notes');    if (no.value) tags.push(new TagData('Notes',    no.value, ''));
        const de = field('Details');  if (de.value) tags.push(new TagData('Details',  de.value, ''));

        const content = formatEntry(new WorkoutEntry(selectedDate, activityType, tags));
        if (existingEntry) {
            this.replaceAndSave(existingEntry, content, overlay);
        } else {
            this.appendAndSave(content, overlay);
        }
    }

    showStrength(existingEntry = null) {
        const modal = this.createModal('Strength Entry');
        const table = document.createElement('table');
        table.className = 'form-table';

        // Create date input
        const dateInput = this.createDateInput();

        // Date row
        const dateRow = document.createElement('tr');

        const dateLabelCell = document.createElement('td');
        dateLabelCell.className = 'label-cell';
        dateLabelCell.textContent = 'Date';
        dateRow.appendChild(dateLabelCell);

        const dateColonCell = document.createElement('td');
        dateColonCell.className = 'separator';
        dateColonCell.textContent = ':';
        dateRow.appendChild(dateColonCell);

        const dateInputCell = document.createElement('td');
        dateInputCell.appendChild(dateInput);
        dateRow.appendChild(dateInputCell);

        const dateEmptyCell1 = document.createElement('td');
        dateEmptyCell1.className = 'empty-cell';
        dateRow.appendChild(dateEmptyCell1);

        const dateEmptyCell2 = document.createElement('td');
        dateEmptyCell2.className = 'empty-cell';
        dateRow.appendChild(dateEmptyCell2);

        table.appendChild(dateRow);

        // Top 3 rows: RPE, Focus, Pain
        const topFields = [
            { label: 'Focus', type: 'text' },
            { label: 'RPE', type: 'select', options: ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
            { label: 'Pain', type: 'select', options: ['', '1', '2', '3', '4', '5'] }
        ];

        const topData = {};

        topFields.forEach(field => {
            const tr = document.createElement('tr');

            const labelCell = document.createElement('td');
            labelCell.className = 'label-cell';
            labelCell.textContent = field.label;
            tr.appendChild(labelCell);

            const colonCell = document.createElement('td');
            colonCell.className = 'separator';
            colonCell.textContent = ':';
            tr.appendChild(colonCell);

            const inputCell = document.createElement('td');
            let input;

            if (field.type === 'select') {
                input = document.createElement('select');
                field.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt || '–';
                    input.appendChild(option);
                });
            } else {
                input = document.createElement('input');
                input.type = field.type;
            }

            input.name = field.label;
            inputCell.appendChild(input);
            tr.appendChild(inputCell);

            const commentBtnCell = document.createElement('td');
            commentBtnCell.className = 'comment-btn-cell';
            const commentBtn = document.createElement('button');
            commentBtn.type = 'button';
            commentBtn.className = 'comment-btn';
            commentBtn.textContent = '+';
            commentBtn.title = 'Add comment';
            commentBtn._comment = '';
            commentBtn.addEventListener('click', () => this.showCommentPopup(commentBtn));
            commentBtnCell.appendChild(commentBtn);
            tr.appendChild(commentBtnCell);

            table.appendChild(tr);
            topData[field.label] = { input, commentBtn };
        });

        // Get existing strength exercise tags
        const strengthTags = this.getStrengthExerciseTags();

        // 10 exercise rows
        const exerciseData = [];
        for (let i = 0; i < 10; i++) {
            const tr = document.createElement('tr');

            const labelCell = document.createElement('td');
            labelCell.className = 'label-cell';
            const exerciseCombo = document.createElement('select');
            exerciseCombo.name = 'exercise_' + i;
            const emptyOpt = document.createElement('option');
            emptyOpt.value = '';
            emptyOpt.textContent = '';
            exerciseCombo.appendChild(emptyOpt);
            strengthTags.forEach(tag => {
                const opt = document.createElement('option');
                opt.value = tag;
                opt.textContent = tag;
                exerciseCombo.appendChild(opt);
            });
            labelCell.appendChild(exerciseCombo);
            tr.appendChild(labelCell);

            const colonCell = document.createElement('td');
            colonCell.className = 'separator';
            colonCell.textContent = ':';
            tr.appendChild(colonCell);

            const valCell = document.createElement('td');
            const valueInput = document.createElement('input');
            valueInput.type = 'text';
            valueInput.name = 'exercise_value_' + i;
            valCell.appendChild(valueInput);
            tr.appendChild(valCell);

            const commentBtnCell = document.createElement('td');
            commentBtnCell.className = 'comment-btn-cell';
            const exCommentBtn = document.createElement('button');
            exCommentBtn.type = 'button';
            exCommentBtn.className = 'comment-btn';
            exCommentBtn.textContent = '+';
            exCommentBtn.title = 'Add comment';
            exCommentBtn._comment = '';
            exCommentBtn.addEventListener('click', () => this.showCommentPopup(exCommentBtn));
            commentBtnCell.appendChild(exCommentBtn);
            tr.appendChild(commentBtnCell);

            table.appendChild(tr);
            exerciseData.push({
                exercise: exerciseCombo,
                value: valueInput,
                commentBtn: exCommentBtn
            });
        }

        // Notes row
        const notesRow = document.createElement('tr');
        const notesLabelCell = document.createElement('td');
        notesLabelCell.className = 'label-cell';
        notesLabelCell.textContent = 'Notes';
        notesRow.appendChild(notesLabelCell);
        const notesColonCell = document.createElement('td');
        notesColonCell.className = 'separator';
        notesColonCell.textContent = ':';
        notesRow.appendChild(notesColonCell);
        const notesInputCell = document.createElement('td');
        notesInputCell.className = 'notes-cell';
        const notesInput = document.createElement('textarea');
        notesInput.className = 'notes-field';
        notesInput.name = 'Notes';
        notesInputCell.appendChild(notesInput);
        notesRow.appendChild(notesInputCell);
        table.appendChild(notesRow);

        // Pre-populate if editing
        if (existingEntry) {
            dateInput.value = existingEntry.date;
            Object.keys(topData).forEach(label => {
                const { input, commentBtn } = topData[label];
                const val = existingEntry.getTagValue(label);
                const comment = existingEntry.getTagComment(label);
                if (val !== null && val !== undefined) input.value = val;
                if (comment && commentBtn) {
                    commentBtn._comment = comment;
                    commentBtn.classList.add('has-comment');
                }
            });
            const exercises = existingEntry.getExercises();
            exercises.forEach((ex, i) => {
                if (i < exerciseData.length) {
                    exerciseData[i].exercise.value = ex.name;
                    exerciseData[i].value.value = ex.value;
                    if (ex.comment) {
                        exerciseData[i].commentBtn._comment = ex.comment;
                        exerciseData[i].commentBtn.classList.add('has-comment');
                    }
                }
            });
            const existingNotes = existingEntry.getTagValue('Notes');
            if (existingNotes) notesInput.value = existingNotes;
        }

        modal.appendChild(table);

        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-primary';
        saveBtn.textContent = existingEntry ? 'Update' : 'Save';
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Cancel';

        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);
        modal.appendChild(actions);

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        saveBtn.addEventListener('click', () => {
            this.saveStrengthEntry(topData, exerciseData, dateInput.value, overlay, notesInput, existingEntry);
        });

        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

    }

    saveStrengthEntry(topData, exerciseData, selectedDate, overlay, notesInput, existingEntry = null) {
        const tags = [];
        const top = (label) => ({
            value:   topData[label].input.value,
            comment: topData[label].commentBtn?._comment || '',
        });

        const rp = top('RPE');   if (rp.value) tags.push(new TagData('RPE',   rp.value, rp.comment));
        const fo = top('Focus'); if (fo.value) tags.push(new TagData('Focus', fo.value, fo.comment));
        const pa = top('Pain');  if (pa.value) tags.push(new TagData('Pain',  pa.value, pa.comment));

        exerciseData.forEach(row => {
            if (row.exercise.value && row.value.value) {
                tags.push(new TagData(row.exercise.value, row.value.value, row.commentBtn?._comment || ''));
            }
        });

        if (notesInput?.value) tags.push(new TagData('Notes', notesInput.value, ''));

        const content = formatEntry(new StrengthWorkoutEntry(selectedDate, tags));
        if (existingEntry) {
            this.replaceAndSave(existingEntry, content, overlay);
        } else {
            this.appendAndSave(content, overlay);
        }
    }

    showNutrition(existingEntry = null) {
        const modal = this.createModal('Nutrition Entry');
        const table = document.createElement('table');
        table.className = 'form-table';

        const dateInput = this.createDateInput();

        const dateRow = document.createElement('tr');
        const dateLabelCell = document.createElement('td');
        dateLabelCell.className = 'label-cell';
        dateLabelCell.textContent = 'Date';
        dateRow.appendChild(dateLabelCell);
        const dateColonCell = document.createElement('td');
        dateColonCell.className = 'separator';
        dateColonCell.textContent = ':';
        dateRow.appendChild(dateColonCell);
        const dateInputCell = document.createElement('td');
        dateInputCell.appendChild(dateInput);
        dateRow.appendChild(dateInputCell);
        const dateEmptyCell1 = document.createElement('td');
        dateEmptyCell1.className = 'empty-cell';
        dateRow.appendChild(dateEmptyCell1);
        const dateEmptyCell2 = document.createElement('td');
        dateEmptyCell2.className = 'empty-cell';
        dateRow.appendChild(dateEmptyCell2);
        table.appendChild(dateRow);

        const fields = [
            { label: 'Breakfast', noComment: false },
            { label: 'Lunch', noComment: false },
            { label: 'Dinner', noComment: false },
            { label: 'AM Snacks', noComment: false },
            { label: 'PM Snacks', noComment: false },
            { label: 'Alcohol', noComment: false },
            { label: 'Notes', noComment: true },
        ];

        const formData = {};

        fields.forEach(field => {
            const tr = document.createElement('tr');

            const labelCell = document.createElement('td');
            labelCell.className = 'label-cell';
            labelCell.textContent = field.label;
            tr.appendChild(labelCell);

            const colonCell = document.createElement('td');
            colonCell.className = 'separator';
            colonCell.textContent = ':';
            tr.appendChild(colonCell);

            const inputCell = document.createElement('td');
            const input = document.createElement('textarea');
            input.className = 'notes-field';
            input.rows = 2;
            input.name = field.label;
            inputCell.appendChild(input);
            tr.appendChild(inputCell);

            if (field.noComment) {
                inputCell.className = 'notes-cell';
                formData[field.label] = { input, commentBtn: null };
            } else {
                const commentBtnCell = document.createElement('td');
                commentBtnCell.className = 'comment-btn-cell';
                const commentBtn = document.createElement('button');
                commentBtn.type = 'button';
                commentBtn.className = 'comment-btn';
                commentBtn.textContent = '+';
                commentBtn.title = 'Add comment';
                commentBtn._comment = '';
                commentBtn.addEventListener('click', () => this.showCommentPopup(commentBtn));
                commentBtnCell.appendChild(commentBtn);
                tr.appendChild(commentBtnCell);
                formData[field.label] = { input, commentBtn };
            }

            table.appendChild(tr);
        });

        // Pre-populate if editing
        if (existingEntry) {
            dateInput.value = existingEntry.date;
            Object.keys(formData).forEach(label => {
                const { input, commentBtn } = formData[label];
                const val = existingEntry.getTagValue(label);
                const comment = existingEntry.getTagComment(label);
                if (val !== null && val !== undefined) input.value = val;
                if (comment && commentBtn) {
                    commentBtn._comment = comment;
                    commentBtn.classList.add('has-comment');
                }
            });
        }

        modal.appendChild(table);

        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-primary';
        saveBtn.textContent = existingEntry ? 'Update' : 'Save';
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Cancel';
        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);
        modal.appendChild(actions);

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        saveBtn.addEventListener('click', () => {
            this.saveNutritionEntry(formData, dateInput.value, overlay, existingEntry);
        });

        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

    }

    saveNutritionEntry(formData, selectedDate, overlay, existingEntry = null) {
        const tags = [];
        const fieldOrder = ['Breakfast', 'Lunch', 'Dinner', 'AM Snacks', 'PM Snacks', 'Alcohol', 'Notes'];
        fieldOrder.forEach(label => {
            const f = formData[label];
            if (!f) return;
            const value = f.input.value.trim();
            if (value) tags.push(new TagData(label, value, f.commentBtn?._comment || ''));
        });

        const content = formatEntry(new WorkoutEntry(selectedDate, 'Nutrition', tags));
        if (existingEntry) {
            this.replaceAndSave(existingEntry, content, overlay);
        } else {
            this.appendAndSave(content, overlay);
        }
    }

    showMiscellaneous() {
        const modal = this.createModal('Manual Entry');
        const table = document.createElement('table');
        table.className = 'form-table';

        // Shortcuts (shown first in dropdown with a separator below)
        const SHORTCUTS = [
            { name: 'Cycle Commute', tags: 'RPE: 3\nDuration: 1:00:00' },
            { name: 'Yoga',          tags: 'RPE: 1' },
            { name: 'Spin',          tags: '' },
        ];
        // Regular types (shown after the separator)
        const REGULAR = ['Daily', 'Run', 'Swim', 'Cycle', 'Row', 'Erg', 'Strength', 'Nutrition', 'Measurements', 'Data'];

        // --- Date row (matches Cardio layout) ---
        const dateInput = this.createDateInput();
        const dateRow = document.createElement('tr');
        const dateLabelCell = document.createElement('td');
        dateLabelCell.className = 'label-cell';
        dateLabelCell.textContent = 'Date';
        dateRow.appendChild(dateLabelCell);
        const dateColonCell = document.createElement('td');
        dateColonCell.className = 'separator';
        dateColonCell.textContent = ':';
        dateRow.appendChild(dateColonCell);
        const dateInputCell = document.createElement('td');
        dateInputCell.appendChild(dateInput);
        dateRow.appendChild(dateInputCell);
        const dateEmpty1 = document.createElement('td');
        dateEmpty1.className = 'empty-cell';
        dateRow.appendChild(dateEmpty1);
        const dateEmpty2 = document.createElement('td');
        dateEmpty2.className = 'empty-cell';
        dateRow.appendChild(dateEmpty2);
        table.appendChild(dateRow);

        // --- Type row with custom combobox dropdown ---
        const typeInput = document.createElement('input');
        typeInput.type = 'text';
        typeInput.placeholder = 'e.g., Run, Cycle Commute…';

        const typeRow = document.createElement('tr');
        const typeLabelCell = document.createElement('td');
        typeLabelCell.className = 'label-cell';
        typeLabelCell.textContent = 'Type';
        typeRow.appendChild(typeLabelCell);
        const typeColonCell = document.createElement('td');
        typeColonCell.className = 'separator';
        typeColonCell.textContent = ':';
        typeRow.appendChild(typeColonCell);
        const typeInputCell = document.createElement('td');
        typeInputCell.style.position = 'relative';
        typeInputCell.appendChild(typeInput);
        typeRow.appendChild(typeInputCell);
        const typeEmpty1 = document.createElement('td');
        typeEmpty1.className = 'empty-cell';
        typeRow.appendChild(typeEmpty1);
        const typeEmpty2 = document.createElement('td');
        typeEmpty2.className = 'empty-cell';
        typeRow.appendChild(typeEmpty2);
        table.appendChild(typeRow);

        modal.appendChild(table);

        // --- Content textarea ---
        const contentTextarea = document.createElement('textarea');
        contentTextarea.placeholder = 'Paste or type tag lines (e.g. RPE: 7, Distance: 10 km)';
        contentTextarea.style.cssText = 'width:100%;padding:var(--spacing-sm);border:2px solid var(--medium-gray);border-radius:var(--radius-md);min-height:160px;margin-top:var(--spacing-md);font-family:monospace;font-size:0.9rem;box-sizing:border-box;resize:vertical;';
        modal.appendChild(contentTextarea);

        // Custom dropdown — appended to body so it isn't clipped by modal overflow
        const typeDropdown = document.createElement('div');
        typeDropdown.className = 'search-dropdown';
        typeDropdown.style.zIndex = '4000'; // above modal-overlay (2000)
        document.body.appendChild(typeDropdown);

        const applyShortcut = (name, tags) => {
            typeInput.value = name;
            typeDropdown.classList.remove('show');
            if (tags && !contentTextarea.value.trim()) contentTextarea.value = tags;
        };

        const positionTypeDropdown = () => {
            const r = typeInput.getBoundingClientRect();
            typeDropdown.style.top = (r.bottom + 2) + 'px';
            typeDropdown.style.left = r.left + 'px';
            typeDropdown.style.width = r.width + 'px';
        };

        const buildTypeDropdown = (filter = '') => {
            const lower = filter.toLowerCase();
            typeDropdown.innerHTML = '';
            let hasItems = false;

            const addItem = (name, tags) => {
                const item = document.createElement('div');
                item.className = 'search-dropdown-item';
                item.textContent = name;
                item.addEventListener('pointerdown', e => {
                    e.preventDefault();
                    applyShortcut(name, tags);
                });
                typeDropdown.appendChild(item);
                hasItems = true;
            };

            const matchingShortcuts = SHORTCUTS.filter(s => !lower || s.name.toLowerCase().includes(lower));
            const matchingRegular   = REGULAR.filter(r => !lower || r.toLowerCase().includes(lower));

            matchingShortcuts.forEach(s => addItem(s.name, s.tags));

            if (matchingShortcuts.length && matchingRegular.length) {
                const sep = document.createElement('div');
                sep.style.cssText = 'border-top:1px solid var(--medium-gray);margin:3px 0;';
                typeDropdown.appendChild(sep);
            }

            matchingRegular.forEach(r => addItem(r, ''));

            positionTypeDropdown();
            typeDropdown.classList.toggle('show', hasItems);
        };

        typeInput.addEventListener('focus', () => buildTypeDropdown(typeInput.value.trim()));
        typeInput.addEventListener('blur',  () => setTimeout(() => typeDropdown.classList.remove('show'), 150));
        typeInput.addEventListener('input', () => buildTypeDropdown(typeInput.value.trim()));

        // Remove dropdown when modal is closed
        const cleanupDropdown = () => typeDropdown.remove();

        // Parse date + type out of pasted text if first line is "YYYY-MM-DD: Type"
        contentTextarea.addEventListener('paste', (e) => {
            const pasted = e.clipboardData.getData('text');
            const firstLine = pasted.split('\n')[0].trim();
            const m = firstLine.match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)$/);
            if (m) {
                e.preventDefault();
                dateInput.value = m[1];
                typeInput.value = m[2].trim();
                contentTextarea.value = pasted.split('\n').slice(1).join('\n').trimStart();
            }
        });

        // --- Actions ---
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

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        saveBtn.addEventListener('click', () => {
            if (!typeInput.value.trim()) {
                alert('Please fill in the entry type.');
                return;
            }
            cleanupDropdown();
            const lines = [dateInput.value + ': ' + typeInput.value.trim()];
            if (contentTextarea.value.trim()) lines.push(contentTextarea.value.trim());
            this.appendAndSave(lines.join('\n'), overlay);
        });

        cancelBtn.addEventListener('click', () => { cleanupDropdown(); overlay.remove(); });
    }

    showStravaEntry(stravaService) {
        const modal = this.createModal('Strava Entry');

        if (!stravaService || !stravaService.isConfigured()) {
            const instructions = document.createElement('p');
            instructions.style.cssText = 'color:var(--dark-gray);margin:var(--spacing-md) 0 var(--spacing-sm);font-size:0.9rem;';
            instructions.innerHTML = 'Create a Strava API app at <a href="https://www.strava.com/settings/api" target="_blank">strava.com/settings/api</a>. Set the Authorization Callback Domain to <code>' + location.hostname + '</code>.';
            modal.appendChild(instructions);

            const table = document.createElement('table');
            table.className = 'form-table';

            const mkRow = (label, type) => {
                const tr = document.createElement('tr');
                const lc = document.createElement('td'); lc.className = 'label-cell'; lc.textContent = label; tr.appendChild(lc);
                const sc = document.createElement('td'); sc.className = 'separator'; sc.textContent = ':'; tr.appendChild(sc);
                const ic = document.createElement('td');
                const input = document.createElement('input'); input.type = type; input.style.width = '100%';
                ic.appendChild(input); tr.appendChild(ic);
                table.appendChild(tr);
                return input;
            };

            const clientIdInput = mkRow('Client ID', 'text');
            const clientSecretInput = mkRow('Client Secret', 'password');
            modal.appendChild(table);

            const actions = document.createElement('div');
            actions.className = 'modal-actions';
            const saveBtn = document.createElement('button');
            saveBtn.className = 'btn-primary';
            saveBtn.textContent = 'Save & Connect';
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-secondary';
            cancelBtn.textContent = 'Cancel';
            actions.appendChild(saveBtn);
            actions.appendChild(cancelBtn);
            modal.appendChild(actions);

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            saveBtn.addEventListener('click', () => {
                const id = clientIdInput.value.trim();
                const secret = clientSecretInput.value.trim();
                if (!id || !secret) { showToast('Enter both Client ID and Client Secret'); return; }
                stravaService.saveCredentials(id, secret);
                overlay.remove();
                stravaService.authorize();
            });
            cancelBtn.addEventListener('click', () => overlay.remove());
            return;
        }

        if (!stravaService.isConnected()) {
            const msg = document.createElement('p');
            msg.style.cssText = 'color:var(--dark-gray);margin:var(--spacing-lg) 0;';
            msg.textContent = 'Connect your Strava account to import workouts.';
            modal.appendChild(msg);
            const actions = document.createElement('div');
            actions.className = 'modal-actions';
            const connectBtn = document.createElement('button');
            connectBtn.className = 'btn-primary';
            connectBtn.textContent = 'Connect Strava';
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-secondary';
            cancelBtn.textContent = 'Cancel';
            actions.appendChild(connectBtn);
            actions.appendChild(cancelBtn);
            modal.appendChild(actions);
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            connectBtn.addEventListener('click', () => { overlay.remove(); stravaService.authorize(); });
            cancelBtn.addEventListener('click', () => overlay.remove());
            return;
        }

        const statusMsg = document.createElement('p');
        statusMsg.className = 'strava-status';
        statusMsg.textContent = 'Loading recent activities…';
        modal.appendChild(statusMsg);

        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Cancel';
        actions.appendChild(cancelBtn);
        modal.appendChild(actions);

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        cancelBtn.addEventListener('click', () => overlay.remove());

        stravaService.getRecentActivities(5).then(activities => {
            statusMsg.remove();

            const list = document.createElement('div');
            list.className = 'strava-activity-list';

            activities.forEach(activity => {
                const item = document.createElement('div');
                item.className = 'strava-activity-item';

                const date = activity.start_date_local.substring(0, 10);
                const distKm = activity.distance ? (activity.distance / 1000).toFixed(1) + ' km' : '';
                const dur = this._stravaFmtSecs(activity.moving_time);
                const sport = activity.sport_type || activity.type || '';

                item.innerHTML = `
                    <div class="strava-activity-name">${activity.name}</div>
                    <div class="strava-activity-meta">${date} · ${sport}${distKm ? ' · ' + distKm : ''} · ${dur}</div>
                `;

                item.addEventListener('click', async () => {
                    list.style.pointerEvents = 'none';
                    const saved = item.innerHTML;
                    item.innerHTML = '<div class="strava-activity-name">Loading…</div>';
                    try {
                        const { detail, laps } = await stravaService.getActivityDetail(activity.id);
                        overlay.remove();
                        this.showCardio(null, this._buildStravaEntry(detail, laps));
                    } catch (e) {
                        item.innerHTML = saved;
                        list.style.pointerEvents = '';
                        showToast('Error loading activity');
                        console.error(e);
                    }
                });

                list.appendChild(item);
            });

            modal.insertBefore(list, actions);

            const disconnectBtn = document.createElement('button');
            disconnectBtn.className = 'btn-secondary';
            disconnectBtn.textContent = 'Disconnect';
            disconnectBtn.style.marginRight = 'auto';
            disconnectBtn.addEventListener('click', () => { stravaService.disconnect(); overlay.remove(); });
            actions.insertBefore(disconnectBtn, cancelBtn);
        }).catch(err => {
            statusMsg.textContent = 'Error: ' + err.message;
        });
    }

    _stravaFmtSecs(secs) {
        if (!secs) return '–';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    _stravaFmtPace(speedMs) {
        if (!speedMs) return '–';
        const paceMinKm = 1000 / (speedMs * 60);
        const min = Math.floor(paceMinKm);
        const sec = Math.round((paceMinKm - min) * 60);
        if (sec === 60) return `${min + 1}:00/km`;
        return `${min}:${String(sec).padStart(2, '0')}/km`;
    }

    _buildStravaEntry(detail, laps) {
        const TYPE_MAP = {
            Run: 'Run', VirtualRun: 'Run', TrailRun: 'Run',
            Ride: 'Cycle', VirtualRide: 'Cycle', EBikeRide: 'Cycle',
            MountainBikeRide: 'Cycle', GravelRide: 'Cycle',
            Swim: 'Swim',
            Rowing: 'Row',
            Yoga: 'Yoga', Pilates: 'Yoga',
        };

        const sport = detail.sport_type || detail.type || 'Run';
        const type = TYPE_MAP[sport] || 'Run';
        const date = detail.start_date_local.substring(0, 10);

        const tags = [];

        if (detail.name) tags.push(new TagData('Focus', detail.name, ''));
        if (detail.perceived_exertion) tags.push(new TagData('RPE', String(Math.round(detail.perceived_exertion)), ''));
        if (detail.distance) tags.push(new TagData('Distance', (detail.distance / 1000).toFixed(2) + ' km', ''));
        if (detail.moving_time) tags.push(new TagData('Duration', this._stravaFmtSecs(detail.moving_time), ''));
        if (detail.device_watts && detail.average_watts) tags.push(new TagData('Power', String(Math.round(detail.average_watts)), ''));
        if (detail.average_heartrate) tags.push(new TagData('Avg HR', String(Math.round(detail.average_heartrate)), ''));
        if (detail.max_heartrate) tags.push(new TagData('Max HR', String(Math.round(detail.max_heartrate)), ''));

        const detailsStr = this._buildStravaDetails(detail.id, laps, detail.splits_metric);
        if (detailsStr) tags.push(new TagData('Details', detailsStr, ''));

        return new WorkoutEntry(date, type, tags);
    }

    _buildStravaDetails(activityId, laps, splits) {
        const useIntervals = Array.isArray(laps) && laps.length > 1;
        const rows = useIntervals ? laps : (splits || []);
        if (!rows.length) return '';

        const link = `[From Strava](https://www.strava.com/activities/${activityId})`;
        const header = '(Interval, Distance, Time, Pace, HR, Power)';

        const tuples = rows.map((r, i) => {
            const dist = Math.round(r.distance) + ' m';
            const time = this._stravaFmtSecs(r.moving_time || r.elapsed_time);
            const pace = this._stravaFmtPace(r.average_speed);
            const hr = r.average_heartrate ? Math.round(r.average_heartrate) + ' bpm' : '–';
            const pwr = r.average_watts ? Math.round(r.average_watts) + ' w' : '–';
            return `(${i + 1}, ${dist}, ${time}, ${pace}, ${hr}, ${pwr})`;
        }).join(', ');

        return `${link} | ${header} = ${tuples}`;
    }

    showCommentPopup(btn) {
        document.querySelectorAll('.comment-popup').forEach(p => p.remove());

        const popup = document.createElement('div');
        popup.className = 'comment-popup';

        const textarea = document.createElement('textarea');
        textarea.className = 'comment-popup-text';
        textarea.value = btn._comment || '';
        textarea.placeholder = 'Add a comment...';
        popup.appendChild(textarea);

        const actions = document.createElement('div');
        actions.className = 'comment-popup-actions';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'comment-popup-save';
        saveBtn.textContent = '✓';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'comment-popup-cancel';
        cancelBtn.textContent = '✗';

        const closePopup = () => {
            popup.remove();
            document.removeEventListener('mousedown', closeOnOutside);
        };

        saveBtn.addEventListener('click', () => {
            btn._comment = textarea.value.trim();
            btn.classList.toggle('has-comment', !!btn._comment);
            closePopup();
        });

        cancelBtn.addEventListener('click', closePopup);

        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);
        popup.appendChild(actions);

        document.body.appendChild(popup);
        textarea.focus();

        // Position near the button after appending so we know popup size
        const rect = btn.getBoundingClientRect();
        const popupRect = popup.getBoundingClientRect();
        const top = rect.bottom + 4 + popupRect.height > window.innerHeight
            ? rect.top - popupRect.height - 4
            : rect.bottom + 4;
        popup.style.top = Math.max(8, top) + 'px';
        popup.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';

        const closeOnOutside = (e) => {
            if (!popup.contains(e.target) && e.target !== btn) {
                closePopup();
            }
        };
        setTimeout(() => document.addEventListener('mousedown', closeOnOutside), 0);
    }

    async replaceAndSave(existingEntry, newContent, overlay) {
        try {
            const currentText = await this.persistence.loadWorkoutLog();
            const lines = currentText.split('\n');

            const matchDate = existingEntry.date;
            const matchType = existingEntry.shortcutName || existingEntry.type;

            // Auto-manage Tags: preserve Favorite; add/remove Tentative based on date
            const newDateMatch = newContent.match(/^(\d{4}-\d{2}-\d{2}):/);
            if (newDateMatch) {
                const now = new Date();
                const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const existingTagsVal = existingEntry.getTagValue('Tags') || '';
                const preserved = existingTagsVal.split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'tentative');
                if (newDateMatch[1] > today) preserved.unshift('Tentative');
                if (preserved.length > 0) newContent = newContent + '\nTags: ' + preserved.join(', ');
            }

            let startLine = -1;
            for (let i = 0; i < lines.length; i++) {
                const m = lines[i].match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)$/);
                if (m && m[1] === matchDate && m[2].trim().toLowerCase() === matchType.toLowerCase()) {
                    startLine = i;
                    break;
                }
            }

            if (startLine === -1) {
                return this.appendAndSave(newContent, overlay);
            }

            // Find end of entry block (next blank line or next date line)
            let endLine = startLine + 1;
            while (endLine < lines.length && lines[endLine].trim() !== '' && !lines[endLine].match(/^\d{4}-\d{2}-\d{2}:/)) {
                endLine++;
            }
            // Skip trailing blank lines
            while (endLine < lines.length && lines[endLine].trim() === '') {
                endLine++;
            }

            const before = lines.slice(0, startLine).join('\n').replace(/\n+$/, '');
            const after = lines.slice(endLine).join('\n');

            let newText;
            if (before && after) {
                newText = before + '\n\n' + newContent + '\n\n' + after;
            } else if (before) {
                newText = before + '\n\n' + newContent;
            } else if (after) {
                newText = newContent + '\n\n' + after;
            } else {
                newText = newContent;
            }

            this.editor.textarea.value = newText;
            await this.persistence.saveWorkoutLog(newText);
            this.editor.originalText = newText;
            overlay.remove();

            const startPos = before ? before.length + 2 : 0;
            this.editor.textarea.focus();
            this.editor.textarea.setSelectionRange(startPos, startPos + newContent.length);
            this.editor.textarea.scrollTop = this.editor.textarea.scrollHeight;

            showToast('Saved to Workout Log');
            if (this.onSaved) await this.onSaved();
        } catch (error) {
            console.error('Error updating entry:', error);
            alert('Error updating entry.');
        }
    }

    createModal(title) {
        const modal = document.createElement('div');
        modal.className = 'modal';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.textContent = title;
        modal.appendChild(header);

        return modal;
    }

    createDateInput() {
        const input = document.createElement('input');
        input.type = 'date';
        input.style.width = '100%';
        input.style.padding = 'var(--spacing-none) var(--spacing-none)';
        input.style.border = '2px solid var(--medium-gray)';
        input.style.borderRadius = 'var(--radius-md)';
        input.style.fontSize = '0.9rem';

        // Set default to today
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        input.value = `${year}-${month}-${day}`;

        return input;
    }

    createDatePicker() {
        const container = document.createElement('div');
        container.style.marginBottom = 'var(--spacing-lg)';

        const label = document.createElement('label');
        label.style.display = 'block';
        label.style.marginBottom = 'var(--spacing-sm)';
        label.style.fontWeight = '500';
        label.textContent = 'Date:';
        container.appendChild(label);

        const input = this.createDateInput();
        container.appendChild(input);

        return { container, input };
    }

    getStrengthExerciseTags() {
        const tags = new Set();
        this.workoutLog.entries.forEach(entry => {
            if (entry.type === 'Strength') {
                entry.getAllTags().forEach(tag => {
                    if (!['RPE', 'Focus', 'Pain'].includes(tag.tag)) {
                        tags.add(tag.tag);
                    }
                });
            }
        });
        return Array.from(tags).sort();
    }

    async appendAndSave(content, overlay) {
        try {
            const currentText = await this.persistence.loadWorkoutLog();

            const dateMatch = content.match(/^(\d{4}-\d{2}-\d{2}):\s*(\S+)/);
            const newDate = dateMatch ? dateMatch[1] : null;
            const newType = dateMatch ? dateMatch[2] : null;

            // Auto-manage Tentative tag: future entries are tentative, past/today are not
            if (newDate) {
                const now = new Date();
                const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                if (newDate > today) {
                    content = content + '\nTags: Tentative';
                }
            }

            let newText;
            let startPosition;
            let endPosition;

            if (!newDate) {
                newText = currentText + (currentText ? '\n\n' : '') + content;
                startPosition = currentText.length + (currentText ? 2 : 0);
                endPosition = newText.length;
            } else {
                const lines = currentText.split('\n');

                // Build ordered list of entry headers
                const entryHeaders = [];
                for (let i = 0; i < lines.length; i++) {
                    const m = lines[i].match(/^(\d{4}-\d{2}-\d{2}):\s*(\S+)/);
                    if (m) entryHeaders.push({ line: i, date: m[1], type: m[2] });
                }

                // Last entry header index with date strictly before newDate
                let lastBeforeIdx = -1;
                for (let i = entryHeaders.length - 1; i >= 0; i--) {
                    if (entryHeaders[i].date < newDate) { lastBeforeIdx = i; break; }
                }

                // Indices of same-date entries
                const sameDateIdxs = entryHeaders
                    .map((e, i) => ({ ...e, idx: i }))
                    .filter(e => e.date === newDate)
                    .map(e => e.idx);

                // Determine insertion point (index into entryHeaders, -1 = prepend)
                let insertAfterIdx;
                if (sameDateIdxs.length === 0) {
                    // No same-date entries: insert after last earlier entry
                    insertAfterIdx = lastBeforeIdx;
                } else if (newType === 'Daily') {
                    // Daily goes first on the day — before all same-date entries
                    insertAfterIdx = lastBeforeIdx;
                } else if (newType === 'Nutrition') {
                    // Nutrition goes last on the day
                    insertAfterIdx = sameDateIdxs[sameDateIdxs.length - 1];
                } else {
                    // Other workouts: after last non-Nutrition same-date entry
                    const lastNonNutritionIdx = [...sameDateIdxs]
                        .reverse()
                        .find(i => entryHeaders[i].type !== 'Nutrition');
                    insertAfterIdx = lastNonNutritionIdx !== undefined
                        ? lastNonNutritionIdx
                        : lastBeforeIdx; // only Nutrition exists: insert before it
                }

                let resultText;
                if (insertAfterIdx === undefined || insertAfterIdx === -1) {
                    // Prepend
                    resultText = content + (currentText ? '\n\n' + currentText : '');
                    startPosition = 0;
                } else {
                    const insertAtLine = entryHeaders[insertAfterIdx].line;
                    let endLine = insertAtLine + 1;
                    while (endLine < lines.length && lines[endLine].trim() !== '' && !lines[endLine].match(/^\d{4}-\d{2}-\d{2}/)) {
                        endLine++;
                    }
                    while (endLine < lines.length && lines[endLine].trim() === '') {
                        endLine++;
                    }
                    const beforeLines = lines.slice(0, endLine);
                    const afterLines = lines.slice(endLine);
                    resultText = beforeLines.join('\n') + (beforeLines.length > 0 ? '\n\n' : '') + content + (afterLines.length > 0 ? '\n\n' + afterLines.join('\n') : '');
                    startPosition = beforeLines.join('\n').length + (beforeLines.length > 0 ? 2 : 0);
                }

                newText = resultText;
                endPosition = startPosition + content.length;
            }

            this.editor.textarea.value = newText;
            await this.persistence.saveWorkoutLog(newText);
            this.editor.originalText = newText;

            overlay.remove();
            this.editor.textarea.focus();
            this.editor.textarea.setSelectionRange(startPosition, endPosition);
            this.editor.textarea.scrollTop = this.editor.textarea.scrollHeight;

            showToast('Saved to Workout Log');
            if (this.onSaved) await this.onSaved();
        } catch (error) {
            console.error('Error saving entry:', error);
            alert('Error saving entry.');
        }
    }
}
