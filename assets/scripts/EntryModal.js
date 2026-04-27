/**
 * EntryModal - Handles entry creation modals
 */
export class EntryModal {
    constructor(workoutLog, editor, persistence) {
        this.workoutLog = workoutLog;
        this.editor = editor;
        this.persistence = persistence;
    }

    showDaily() {
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
            { label: 'Energy', type: 'select', options: ['1', '2', '3', '4', '5'], noComment: false },
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

        modal.appendChild(table);

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
            this.saveDailyEntry(formData, dateInput.value, overlay);
        });

        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    saveDailyEntry(formData, selectedDate, overlay) {
        const lines = [selectedDate + ': Daily'];

        // Weight and Waist on same line if both have values and neither has comment
        const weight = formData['Weight'].input.value;
        const waist = formData['Waist'].input.value;
        if (weight && waist) {
            lines.push('Weight: ' + weight + ' | Waist: ' + waist);
        } else {
            if (weight) lines.push('Weight: ' + weight);
            if (waist) lines.push('Waist: ' + waist);
        }

        // Sleep
        const sleep = formData['Sleep'].input.value;
        const sleepComment = formData['Sleep'].commentBtn?._comment || '';
        if (sleep) {
            lines.push('Sleep: ' + sleep + (sleepComment ? ' -- ' + sleepComment : ''));
        }

        // RHR and HRV on same line if both have values and neither has comment
        const rhr = formData['RHR'].input.value;
        const hrv = formData['HRV'].input.value;
        if (rhr && hrv) {
            lines.push('RHR: ' + rhr + ' | HRV: ' + hrv);
        } else {
            if (rhr) lines.push('RHR: ' + rhr);
            if (hrv) lines.push('HRV: ' + hrv);
        }

        // Energy
        const energy = formData['Energy'].input.value;
        const energyComment = formData['Energy'].commentBtn?._comment || '';
        if (energy) {
            lines.push('Energy: ' + energy + (energyComment ? ' -- ' + energyComment : ''));
        }

        // Pain
        const pain = formData['Pain'].input.value;
        const painComment = formData['Pain'].commentBtn?._comment || '';
        if (pain) {
            lines.push('Pain: ' + pain + (painComment ? ' -- ' + painComment : ''));
        }

        // Notes
        const notes = formData['Notes'].input.value;
        if (notes) {
            lines.push('Notes: ' + notes);
        }

        this.appendAndSave(lines.join('\n'), overlay);
    }

    showCardio() {
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

        modal.appendChild(table);

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

        const getActivityType = () => {
            const type = formData['Type'].input.value;
            if (['Run', 'Swim', 'Cycle', 'Row', 'Erg', 'Yoga'].includes(type)) {
                return type;
            }
            return 'Cardio';
        };

        saveBtn.addEventListener('click', () => {
            this.saveCardioEntry(formData, dateInput.value, getActivityType(), overlay);
        });

        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    saveCardioEntry(formData, selectedDate, activityType, overlay) {
        const lines = [selectedDate + ': ' + activityType];

        // Type field
        const type = formData['Type'].input.value;
        const typeComment = formData['Type'].commentBtn?._comment || '';
        if (type && type !== activityType) {
            lines.push('Type: ' + type + (typeComment ? ' -- ' + typeComment : ''));
        }

        // Focus
        const focus = formData['Focus'].input.value;
        const focusComment = formData['Focus'].commentBtn?._comment || '';
        if (focus) {
            lines.push('Focus: ' + focus + (focusComment ? ' -- ' + focusComment : ''));
        }

        // RPE, Distance, Duration, Power on same line if all have values and no comments
        const rpe = formData['RPE'].input.value;
        const distance = formData['Distance'].input.value;
        const duration = formData['Duration'].input.value;
        const power = formData['Power'].input.value;

        const rpeComment = formData['RPE'].commentBtn?._comment || '';
        const distanceComment = formData['Distance'].commentBtn?._comment || '';
        const durationComment = formData['Duration'].commentBtn?._comment || '';
        const powerComment = formData['Power'].commentBtn?._comment || '';

        if (rpe && distance && duration && power && !rpeComment && !distanceComment && !durationComment && !powerComment) {
            lines.push('RPE: ' + rpe + ' | Distance: ' + distance + ' | Duration: ' + duration + ' | Power: ' + power);
        } else {
            if (rpe) lines.push('RPE: ' + rpe + (rpeComment ? ' -- ' + rpeComment : ''));
            if (distance) lines.push('Distance: ' + distance + (distanceComment ? ' -- ' + distanceComment : ''));
            if (duration) lines.push('Duration: ' + duration + (durationComment ? ' -- ' + durationComment : ''));
            if (power) lines.push('Power: ' + power + (powerComment ? ' -- ' + powerComment : ''));
        }

        // Avg HR and Max HR on same line if both present and no comments
        const avgHR = formData['Avg HR'].input.value;
        const maxHR = formData['Max HR'].input.value;
        const avgHRComment = formData['Avg HR'].commentBtn?._comment || '';
        const maxHRComment = formData['Max HR'].commentBtn?._comment || '';

        if (avgHR && maxHR && !avgHRComment && !maxHRComment) {
            lines.push('Avg HR: ' + avgHR + ' | Max HR: ' + maxHR);
        } else {
            if (avgHR) lines.push('Avg HR: ' + avgHR + (avgHRComment ? ' -- ' + avgHRComment : ''));
            if (maxHR) lines.push('Max HR: ' + maxHR + (maxHRComment ? ' -- ' + maxHRComment : ''));
        }

        // Pain
        const pain = formData['Pain'].input.value;
        const painComment = formData['Pain'].commentBtn?._comment || '';
        if (pain) {
            lines.push('Pain: ' + pain + (painComment ? ' -- ' + painComment : ''));
        }

        // Notes
        const notes = formData['Notes'].input.value;
        if (notes) {
            lines.push('Notes: ' + notes);
        }

        this.appendAndSave(lines.join('\n'), overlay);
    }

    showStrength() {
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
            { label: 'Pain', type: 'select', options: ['1', '2', '3', '4', '5'] }
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

        modal.appendChild(table);

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
            this.saveStrengthEntry(topData, exerciseData, dateInput.value, overlay);
        });

        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    saveStrengthEntry(topData, exerciseData, selectedDate, overlay) {
        const lines = [selectedDate + ': Strength'];

        // RPE, Focus, Pain
        if (topData['RPE'].input.value) {
            lines.push('RPE: ' + topData['RPE'].input.value);
        }
        if (topData['Focus'].input.value) {
            lines.push('Focus: ' + topData['Focus'].input.value);
        }
        if (topData['Pain'].input.value) {
            lines.push('Pain: ' + topData['Pain'].input.value);
        }

        // Exercise rows
        exerciseData.forEach(row => {
            if (row.exercise.value) {
                const exercise = row.exercise.value;
                const value = row.value.value;
                const comment = row.commentBtn?._comment || '';
                if (value) {
                    lines.push(exercise + ': ' + value + (comment ? ' -- ' + comment : ''));
                }
            }
        });

        this.appendAndSave(lines.join('\n'), overlay);
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

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
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
            const currentText = this.editor.textarea.value;

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

            alert('Entry added successfully!');

            // Reload the log
            const logText = await this.persistence.loadWorkoutLog();
            this.workoutLog = (await import('./WorkoutLog.js')).WorkoutLog.parse(logText);
            this.editor.workoutLog = this.workoutLog;
            this.editor.populateTagSuggestions();
        } catch (error) {
            console.error('Error saving entry:', error);
            alert('Error saving entry.');
        }
    }
}
