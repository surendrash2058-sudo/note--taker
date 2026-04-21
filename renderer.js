window.addEventListener('DOMContentLoaded', async() => {
    const textarea = document.getElementById('note');
    const saveBtn = document.getElementById('save');
    const saveAsBtn = document.getElementById('saveAs');
    const newNoteBtn = document.getElementById('newNote');
    const openBtn = document.getElementById('openFile');
    const deleteBtn = document.getElementById('deleteBtn');
    const statusEl = document.getElementById('status');

    // Load saved note on startup
    const savedNote = await window.electronAPI.loadNote();
    textarea.value = savedNote;

    let lastSavedText = textarea.value;
    let currentFilePath = null;

    // =========================
    // AUTO SAVE FUNCTION
    // =========================
    async function autoSave() {
        const currentText = textarea.value;

        if (currentText === lastSavedText) {
            statusEl.textContent = 'No changes to save';
            return;
        }

        try {
            await window.electronAPI.smartSave(currentText, currentFilePath);
            lastSavedText = currentText;
            const now = new Date().toLocaleTimeString();
            statusEl.textContent = `
Auto - saved at $ { now }
`;
            statusEl.style.color = 'green';
        } catch (err) {
            console.error('Auto-save failed:', err);
            statusEl.textContent = 'Auto-save error!';
            statusEl.style.color = 'red';
        }
    }

    // =========================
    // DEBOUNCE LISTENER
    // =========================
    let debounceTimer;

    textarea.addEventListener('input', () => {
        statusEl.textContent = 'Changes detected — auto-saving in 5s...';
        statusEl.style.color = 'orange';

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(autoSave, 5000);
    });

    // =========================
    // SAVE BUTTON (SMART SAVE)
    // =========================
    saveBtn.addEventListener('click', async() => {
        try {
            await window.electronAPI.smartSave(textarea.value, currentFilePath);
            lastSavedText = textarea.value;
            statusEl.textContent = 'Saved!';
            statusEl.style.color = 'green';
        } catch (err) {
            console.error('Save failed:', err);
            statusEl.textContent = 'Save failed!';
            statusEl.style.color = 'red';
        }
    });

    // =========================
    // SAVE AS BUTTON
    // =========================
    saveAsBtn.addEventListener('click', async() => {
        try {
            const filePath = await window.electronAPI.saveAs(textarea.value);

            if (filePath) {
                currentFilePath = filePath;
                lastSavedText = textarea.value;
                statusEl.textContent = 'Saved with new name!';
                statusEl.style.color = 'green';
            }
        } catch (err) {
            console.error('Save As failed:', err);
            statusEl.textContent = 'Save As failed!';
            statusEl.style.color = 'red';
        }
    });

    // =========================
    // NEW NOTE BUTTON
    // =========================
    newNoteBtn.addEventListener('click', async() => {
        if (textarea.value === lastSavedText) {
            textarea.value = '';
            currentFilePath = null;
            return;
        }

        const confirmed = await window.electronAPI.newNote();

        if (confirmed) {
            textarea.value = '';
            currentFilePath = null;
            lastSavedText = '';
        }
    });

    // =========================
    // OPEN FILE BUTTON
    // =========================
    openBtn.addEventListener('click', async() => {
        try {
            const result = await window.electronAPI.openFile();

            if (result) {
                textarea.value = result.content;
                currentFilePath = result.filePath;
                lastSavedText = result.content;

                statusEl.textContent = 'File opened!';
                statusEl.style.color = 'green';
            }
        } catch (err) {
            console.error('Open file failed:', err);
            statusEl.textContent = 'Open failed!';
            statusEl.style.color = 'red';
        }
    });

    // =========================
    // DELETE BUTTON
    // =========================
    deleteBtn.addEventListener('click', async() => {
        if (confirm('Really delete ALL notes? This cannot be undone!')) {
            try {
                await window.electronAPI.deleteNote();
                textarea.value = '';
                lastSavedText = '';
                currentFilePath = null;
                statusEl.textContent = 'All notes deleted!';
                statusEl.style.color = 'red';
            } catch (err) {
                console.error('Delete failed:', err);
                statusEl.textContent = 'Delete failed!';
            }
        }
    });
});