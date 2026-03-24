window.addEventListener('DOMContentLoaded', async () => {
    const textarea = document.getElementById('note');
    const saveBtn = document.getElementById('save');
    const deleteBtn = document.getElementById('deleteBtn');
    const statusEl = document.getElementById('status');

    // Load saved note on startup
    const savedNote = await window.electronAPI.loadNote();
    textarea.value = savedNote;

    // Save note on button click
    saveBtn.addEventListener('click', async () => {
        await window.electronAPI.saveNote(textarea.value);
        
        // Show popup alert
        alert('Note saved successfully! 💾');
        
        // Update persistent status message
        statusEl.textContent = 'Note saved! 💾';
        statusEl.style.color = 'green';
    });

    // Delete note on button click
    deleteBtn.addEventListener('click', async () => {
        if (confirm('Really delete ALL notes? This cannot be undone!')) {
            try {
                await window.electronAPI.deleteNote();
                textarea.value = '';
                
                // Popup alert for delete
                alert('All notes deleted! ❌');

                // Update persistent status message
                statusEl.textContent = 'All notes deleted! ❌';
                statusEl.style.color = 'red';
            } catch {
                statusEl.textContent = 'Delete failed!';
                statusEl.style.color = 'orange';
            }
        }
    });
});