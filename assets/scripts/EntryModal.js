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
                    option.textContent = opt;
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

    showCardio(existingEntry = null) {
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
            { label: 'RPE', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], noComment: false },
            { label: 'Distance', type: 'text', noComment: false, placeholder: 'km' },
            { label: 'Duration', type: 'text', noComment: false },
            { label: 'Power', type: 'text', noComment: false },
            { label: 'Avg HR', type: 'text', noComment: false, placeholder: 'bpm' },
            { label: 'Max HR', type: 'text', noComment: false, placeholder: 'bpm' },
            { label: 'Pain', type: 'select', options: ['1', '2', '3', '4', '5'], noComment: false },
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
                    option.textContent = opt;
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
            formData['Type'].input.value = existingEntry.type;
            ['Focus', 'RPE', 'Distance', 'Duration', 'Power', 'Avg HR', 'Max HR', 'Pain', 'Notes'].forEach(label => {
                const field = formData[label];
                if (!field) return;
                const val = existingEntry.getTagValue(label);
                const comment = existingEntry.getTagComment(label);
                if (val !== null && val !== undefined) field.input.value = val;
                if (comment && field.commentBtn) {
                    field.commentBtn._comment = comment;
                    field.commentBtn.classList.add('has-comment');
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
            { label: 'RPE', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
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
                    option.textContent = opt;
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
        const modal = this.createModal('Miscellaneous Entry');
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

        modal.appendChild(table);

        const label = document.createElement('label');
        label.style.display = 'block';
        label.style.marginBottom = 'var(--spacing-md)';
        label.style.marginTop = 'var(--spacing-lg)';
        label.style.fontWeight = '500';
        label.textContent = 'Entry Type:';
        modal.appendChild(label);

        const typeInput = document.createElement('input');
        typeInput.type = 'text';
        typeInput.placeholder = 'e.g., Nutrition, Measurements, Data, etc.';
        typeInput.style.width = '100%';
        typeInput.style.padding = 'var(--spacing-md) var(--spacing-lg)';
        typeInput.style.border = '2px solid var(--medium-gray)';
        typeInput.style.borderRadius = 'var(--radius-md)';
        typeInput.style.marginBottom = 'var(--spacing-lg)';
        modal.appendChild(typeInput);

        const contentLabel = document.createElement('label');
        contentLabel.style.display = 'block';
        contentLabel.style.marginBottom = 'var(--spacing-md)';
        contentLabel.style.fontWeight = '500';
        contentLabel.textContent = 'Content:';
        modal.appendChild(contentLabel);

        const contentTextarea = document.createElement('textarea');
        contentTextarea.placeholder = 'Enter entry content (tag: value format)';
        contentTextarea.style.width = '100%';
        contentTextarea.style.padding = 'var(--spacing-md) var(--spacing-lg)';
        contentTextarea.style.border = '2px solid var(--medium-gray)';
        contentTextarea.style.borderRadius = 'var(--radius-md)';
        contentTextarea.style.minHeight = '150px';
        contentTextarea.style.marginBottom = 'var(--spacing-lg)';
        contentTextarea.style.fontFamily = 'monospace';
        modal.appendChild(contentTextarea);

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
            if (typeInput.value.trim() && contentTextarea.value.trim()) {
                const lines = [dateInput.value + ': ' + typeInput.value.trim()];
                const content = contentTextarea.value.trim();
                lines.push(content);
                this.appendAndSave(lines.join('\n'), overlay);
            } else {
                alert('Please fill in both the entry type and content.');
            }
        });

        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

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

            // Extract date from content (format: YYYY-MM-DD: ...)
            const dateMatch = content.match(/^(\d{4}-\d{2}-\d{2})/);
            const newDate = dateMatch ? dateMatch[1] : null;

            let newText;
            let startPosition;
            let endPosition;

            if (!newDate) {
                // Fallback to appending if date parsing fails
                newText = currentText + (currentText ? '\n\n' : '') + content;
                startPosition = currentText.length + (currentText ? 2 : 0);
                endPosition = newText.length;
            } else {
                // Find the chronological position to insert
                const lines = currentText.split('\n');
                let insertIndex = -1;
                let emptyLineOffset = 0;

                // Find where this entry should go by date
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const lineDateMatch = line.match(/^(\d{4}-\d{2}-\d{2})/);

                    if (lineDateMatch) {
                        const lineDate = lineDateMatch[1];
                        if (newDate >= lineDate) {
                            // New entry is newer or same date, keep looking
                            insertIndex = i;
                        } else if (newDate < lineDate) {
                            // New entry is older, insert before this entry
                            break;
                        }
                    }
                }

                let resultText;
                if (insertIndex === -1) {
                    // Prepend at the beginning
                    resultText = content + (currentText ? '\n\n' + currentText : '');
                    startPosition = 0;
                } else {
                    // Insert after the entry at insertIndex
                    // Find the end of that entry (next empty line or entry)
                    let endOfEntry = insertIndex + 1;
                    while (endOfEntry < lines.length && lines[endOfEntry].trim() !== '' && !lines[endOfEntry].match(/^\d{4}-\d{2}-\d{2}/)) {
                        endOfEntry++;
                    }

                    // Skip empty lines between entries
                    while (endOfEntry < lines.length && lines[endOfEntry].trim() === '') {
                        endOfEntry++;
                    }

                    const beforeLines = lines.slice(0, endOfEntry);
                    const afterLines = lines.slice(endOfEntry);

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

            // Highlight the new entry
            this.editor.textarea.focus();
            this.editor.textarea.setSelectionRange(startPosition, endPosition);

            // Scroll textarea to show the new entry
            this.editor.textarea.scrollTop = this.editor.textarea.scrollHeight;

            showToast('Saved to Workout Log');
            if (this.onSaved) await this.onSaved();
        } catch (error) {
            console.error('Error saving entry:', error);
            alert('Error saving entry.');
        }
    }
}
