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
            { label: 'Weight', type: 'text', noComment: true },
            { label: 'Waist', type: 'text', noComment: true },
            { label: 'Sleep', type: 'text', noComment: false },
            { label: 'RHR', type: 'text', noComment: true },
            { label: 'HRV', type: 'text', noComment: true },
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
                }
            } else {
                input = document.createElement('input');
                input.type = field.type;
            }

            input.name = field.label;
            inputCell.appendChild(input);
            tr.appendChild(inputCell);

            const dashCell = document.createElement('td');
            dashCell.className = 'separator';
            dashCell.textContent = field.noComment ? '' : '-';
            tr.appendChild(dashCell);

            const commentCell = document.createElement('td');
            if (!field.noComment) {
                const commentInput = document.createElement('textarea');
                commentInput.className = 'comment-input';
                commentInput.name = field.label + '_comment';
                commentCell.appendChild(commentInput);
            } else {
                commentCell.className = 'empty-cell';
            }
            tr.appendChild(commentCell);

            table.appendChild(tr);
            formData[field.label] = { input, comment: !field.noComment };
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
        const sleepComment = formData['Sleep'].comment ? document.querySelector('textarea[name="Sleep_comment"]').value : '';
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
        const energyComment = document.querySelector('textarea[name="Energy_comment"]').value;
        if (energy) {
            lines.push('Energy: ' + energy + (energyComment ? ' -- ' + energyComment : ''));
        }

        // Pain
        const pain = formData['Pain'].input.value;
        const painComment = document.querySelector('textarea[name="Pain_comment"]').value;
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
            { label: 'RPE', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], noComment: false },
            { label: 'Distance', type: 'text', noComment: false },
            { label: 'Duration', type: 'text', noComment: false },
            { label: 'Power', type: 'text', noComment: false },
            { label: 'Avg HR', type: 'text', noComment: false },
            { label: 'Max HR', type: 'text', noComment: false },
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
                }
            } else {
                input = document.createElement('input');
                input.type = field.type;
            }

            input.name = field.label;
            inputCell.appendChild(input);
            tr.appendChild(inputCell);

            const dashCell = document.createElement('td');
            dashCell.className = 'separator';
            dashCell.textContent = !field.noComment ? '-' : '';
            tr.appendChild(dashCell);

            const commentCell = document.createElement('td');
            if (!field.noComment) {
                const commentInput = document.createElement('textarea');
                commentInput.className = 'comment-input';
                commentInput.name = field.label + '_comment';
                commentCell.appendChild(commentInput);
            } else {
                commentCell.className = 'empty-cell';
            }
            tr.appendChild(commentCell);

            table.appendChild(tr);
            formData[field.label] = input;
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
            const type = formData['Type'].value;
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
        const type = formData['Type'].value;
        const typeComment = document.querySelector('textarea[name="Type_comment"]').value;
        if (type && type !== activityType) {
            lines.push('Type: ' + type + (typeComment ? ' -- ' + typeComment : ''));
        }

        // RPE, Distance, Duration, Power on same line if all have values and no comments
        const rpe = formData['RPE'].value;
        const distance = formData['Distance'].value;
        const duration = formData['Duration'].value;
        const power = formData['Power'].value;

        const rpeComment = document.querySelector('textarea[name="RPE_comment"]').value;
        const distanceComment = document.querySelector('textarea[name="Distance_comment"]').value;
        const durationComment = document.querySelector('textarea[name="Duration_comment"]').value;
        const powerComment = document.querySelector('textarea[name="Power_comment"]').value;

        if (rpe && distance && duration && power && !rpeComment && !distanceComment && !durationComment && !powerComment) {
            lines.push('RPE: ' + rpe + ' | Distance: ' + distance + ' | Duration: ' + duration + ' | Power: ' + power);
        } else {
            if (rpe) lines.push('RPE: ' + rpe + (rpeComment ? ' -- ' + rpeComment : ''));
            if (distance) lines.push('Distance: ' + distance + (distanceComment ? ' -- ' + distanceComment : ''));
            if (duration) lines.push('Duration: ' + duration + (durationComment ? ' -- ' + durationComment : ''));
            if (power) lines.push('Power: ' + power + (powerComment ? ' -- ' + powerComment : ''));
        }

        // Avg HR and Max HR on same line if both present and no comments
        const avgHR = formData['Avg HR'].value;
        const maxHR = formData['Max HR'].value;
        const avgHRComment = document.querySelector('textarea[name="Avg HR_comment"]').value;
        const maxHRComment = document.querySelector('textarea[name="Max HR_comment"]').value;

        if (avgHR && maxHR && !avgHRComment && !maxHRComment) {
            lines.push('Avg HR: ' + avgHR + ' | Max HR: ' + maxHR);
        } else {
            if (avgHR) lines.push('Avg HR: ' + avgHR + (avgHRComment ? ' -- ' + avgHRComment : ''));
            if (maxHR) lines.push('Max HR: ' + maxHR + (maxHRComment ? ' -- ' + maxHRComment : ''));
        }

        // Pain
        const pain = formData['Pain'].value;
        const painComment = document.querySelector('textarea[name="Pain_comment"]').value;
        if (pain) {
            lines.push('Pain: ' + pain + (painComment ? ' -- ' + painComment : ''));
        }

        // Notes
        const notes = formData['Notes'].value;
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
            { label: 'RPE', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
            { label: 'Focus', type: 'text' },
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

            const dashCell = document.createElement('td');
            dashCell.className = 'separator empty-cell';
            tr.appendChild(dashCell);

            const commentCell = document.createElement('td');
            commentCell.className = 'empty-cell';
            tr.appendChild(commentCell);

            table.appendChild(tr);
            topData[field.label] = input;
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

            const dashCell = document.createElement('td');
            dashCell.className = 'separator';
            dashCell.textContent = '-';
            tr.appendChild(dashCell);

            const commentCell = document.createElement('td');
            const commentInput = document.createElement('textarea');
            commentInput.className = 'comment-input';
            commentInput.name = 'exercise_comment_' + i;
            commentCell.appendChild(commentInput);
            tr.appendChild(commentCell);

            table.appendChild(tr);
            exerciseData.push({
                exercise: exerciseCombo,
                value: valueInput,
                comment: commentInput
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
        if (topData['RPE'].value) {
            lines.push('RPE: ' + topData['RPE'].value);
        }
        if (topData['Focus'].value) {
            lines.push('Focus: ' + topData['Focus'].value);
        }
        if (topData['Pain'].value) {
            lines.push('Pain: ' + topData['Pain'].value);
        }

        // Exercise rows
        exerciseData.forEach(row => {
            if (row.exercise.value) {
                const exercise = row.exercise.value;
                const value = row.value.value;
                const comment = row.comment.value;
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
            const newText = currentText + (currentText ? '\n' : '') + content;

            // Calculate positions for highlighting
            const startPosition = currentText.length + (currentText ? 1 : 0);
            const endPosition = newText.length;

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
