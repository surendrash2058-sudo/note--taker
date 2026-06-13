window.addEventListener('DOMContentLoaded', async() => {
    const textarea = document.getElementById('note');

    function updateWordCount() {
        const text = textarea.value;
        const characters = text.length;
        const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        const wordCountEl = document.getElementById('word-count');
        wordCountEl.textContent = `Words: ${words} | Characters: ${characters}`;
    }
    const titleInput = document.getElementById('note-title');
    const saveBtn = document.getElementById('save');
    const statusEl = document.getElementById('save_status');
    const saveAsBtn = document.getElementById('save-as');
    const newNoteBtn = document.querySelectorAll('#new-note')[0]; // first "New Note" in sidebar
    const deleteBtn = document.getElementById('delete-note'); // single note delete
    const deleteAllBtn = document.getElementById('delete-all'); // delete all notes
    const openFileBtn = document.getElementById('open-file');
    const toggleTrashBtn = document.getElementById('toggle-trash');
    const exportPdfBtn = document.getElementById('export-pdf');
    const printNoteBtn = document.getElementById('print-note');
    const noteList = document.getElementById('notes-list');

    // state
    let notes = [];
    let trashNotes = [];
    let showingTrash = false;
    let currentNoteId = null;
    let lastSavedContent = '';
    let debounceTimer = null;
    let currentFilePath = null;

    // Load all notes at startup
    notes = await window.electronAPI.getNotes();
    trashNotes = await window.electronAPI.getTrash();
    if (notes.length > 0) {
        const mostRecent = notes.reduce((a, b) =>
            new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b
        );
        await switchNote(mostRecent.id);
    } else {
        newNoteBtn.click();
    }
    renderNoteList();

    // Manual Save
    saveBtn.addEventListener('click', async() => {
        await saveCurrentNote();
    });

    saveAsBtn.addEventListener('click', async() => {
        const result = await window.electronAPI.saveAs(textarea.value);
        if (result.success) {
            lastSavedContent = textarea.value;
            currentFilePath = result.filePath;
            statusEl.textContent = 'Saved to: ${ result.filePath }';
        } else {
            statusEl.textContent = 'Save As cancelled';
        }
    });

    newNoteBtn.addEventListener('click', async() => {
        if (textarea.value !== lastSavedContent) {
            const result = await window.electronAPI.newNote();
            if (!result.confirmed) return;
        }
        const newNote = {
            id: Date.now().toString(),
            title: 'Untitled',
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await window.electronAPI.saveNoteJson(newNote);
        notes.unshift(newNote);
        currentNoteId = newNote.id;
        titleInput.value = '';
        textarea.value = '';
        lastSavedContent = '';
        renderNoteList();
        statusEl.textContent = 'New note created.';
        titleInput.focus();
    });

    deleteBtn.addEventListener('click', async() => {
        if (!currentNoteId) return;
        await deleteNote(currentNoteId);
    });

    deleteAllBtn.addEventListener('click', async() => {
        notes = [];
        currentNoteId = null;
        textarea.value = '';
        titleInput.value = '';
        lastSavedContent = '';
        statusEl.textContent = 'All notes deleted.';
        renderNoteList();
    });

    openFileBtn.addEventListener('click', async() => {
        const result = await window.electronAPI.openFile();
        if (result.success) {
            textarea.value = result.content;
            lastSavedContent = result.content;
            currentFilePath = result.filePath;
            statusEl.textContent = 'Opened: ${ result.filePath }';
        } else {
            statusEl.textContent = 'Open canceled';
        }
    });

    toggleTrashBtn.addEventListener('click', () => {
        showingTrash = !showingTrash;
        toggleTrashBtn.textContent = showingTrash ? '🔙 View Notes' : '🗑️ View Trash';
        document.querySelector('#sidebar h2').textContent = showingTrash ? '🗑️ Trash' : '📝 Notes';
        renderNoteList();
    });

    exportPdfBtn.addEventListener('click', async() => {
        statusEl.textContent = 'Exporting PDF...';
        const result = await window.electronAPI.exportPdf({
            title: titleInput.value || 'Untitled',
            content: textarea.value
        });
        if (result.success) {
            statusEl.textContent = `PDF saved to: ${result.filePath}`;
        } else {
            statusEl.textContent = 'PDF export canceled or failed';
        }
    });

    printNoteBtn.addEventListener('click', async() => {
        statusEl.textContent = 'Preparing to print...';
        const result = await window.electronAPI.printNote({
            title: titleInput.value || 'Untitled',
            content: textarea.value
        });
        if (result.success) {
            statusEl.textContent = 'Sent to printer';
        } else {
            statusEl.textContent = 'Print failed';
        }
    });

    // Auto Save function
    async function autoSave() {
        const currentText = textarea.value;
        if (currentText === lastSavedContent) {
            if (statusEl) statusEl.textContent = 'No changes - already saved';
            return;
        }
        try {
            await window.electronAPI.saveNote(currentText);
            lastSavedContent = currentText;
            const now = new Date().toLocaleTimeString();
            if (statusEl) statusEl.textContent = `Auto - saved at ${ now }`;
        } catch (err) {
            console.error('Auto-save FAILED:', err);
            if (statusEl) statusEl.textContent = 'Auto-save error - check console';
        }
    }
    // Call when user types
    textarea.addEventListener('input', () => {
        updateWordCount(); // NEW - add this line
        statusEl.textContent = 'Unsaved changes...';
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(saveCurrentNote, 5000);
    });

    // Call when a note is loaded
    async function switchNote(id) {
        // ... existing code ...
        textarea.value = note.content || '';
        // NEW - add this line after setting textarea value
        updateWordCount();
    }

    titleInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(autoSave, 5000);
    });

    function renderNoteList() {
        noteList.innerHTML = '';
        const listToRender = showingTrash ? trashNotes : notes;
        
        listToRender.forEach(note => {
            const item = document.createElement('div');
            item.className = 'note-item' + (note.id === currentNoteId ? ' active' : '');
            
            if (showingTrash) {
                item.innerHTML = `
                    <div style="display:flex; justify-content:flex-end; gap:5px; margin-bottom:5px;">
                        <button class="restore-note" data-id="${note.id}" style="background:#27ae60; color:white; border:none; padding:3px 6px; border-radius:3px; cursor:pointer; font-size:11px;">Restore</button>
                        <button class="delete-forever" data-id="${note.id}" style="background:#e74c3c; color:white; border:none; padding:3px 6px; border-radius:3px; cursor:pointer; font-size:11px;">Delete</button>
                    </div>
                    <div class="note-title">${note.title || 'Untitled'}</div>
                    <div class="note-date">Deleted: ${new Date(note.deletedAt).toLocaleString()}</div>
                `;
                
                item.querySelector('.restore-note').addEventListener('click', async(e) => {
                    e.stopPropagation();
                    await window.electronAPI.restoreNote(note.id);
                    notes.push(note);
                    trashNotes = trashNotes.filter(n => n.id !== note.id);
                    renderNoteList();
                    statusEl.textContent = 'Note restored';
                });
                
                item.querySelector('.delete-forever').addEventListener('click', async(e) => {
                    e.stopPropagation();
                    await window.electronAPI.deleteForever(note.id);
                    trashNotes = trashNotes.filter(n => n.id !== note.id);
                    renderNoteList();
                    statusEl.textContent = 'Note permanently deleted';
                });
            } else {
                item.innerHTML = `
                    <button class="delete-note" data-id="${note.id}">X</button>
                    <div class="note-title">${note.title || 'Untitled'}</div>
                    <div class="note-date">${new Date(note.updatedAt).toLocaleString()}</div>
                `;
                item.addEventListener('click', async(e) => {
                    if (e.target.classList.contains('delete-note')) return;
                    await switchNote(note.id);
                });
                item.querySelector('.delete-note').addEventListener('click', async(e) => {
                    e.stopPropagation();
                    await deleteNote(note.id);
                });
            }
            noteList.appendChild(item);
        });
    }

    async function switchNote(id) {
        if (textarea.value !== lastSavedContent) {
            const result = await window.electronAPI.newNote();
            if (!result.confirmed) return;
        }
        const note = notes.find(n => n.id === id);
        if (!note) return;
        currentNoteId = note.id;
        titleInput.value = note.title || '';
        textarea.value = note.content || '';
        lastSavedContent = note.content || '';
        statusEl.textContent = '';
        renderNoteList();
    }

    async function saveCurrentNote() {
        if (!currentNoteId) return;
        const note = {
            id: currentNoteId,
            title: titleInput.value || 'Untitled',
            content: textarea.value
        };
        await window.electronAPI.saveNoteJson(note);
        lastSavedContent = textarea.value;
        const index = notes.findIndex(n => n.id === currentNoteId);
        if (index !== -1) {
            notes[index] = {...note, updatedAt: new Date().toISOString() };
        }
        renderNoteList();
        statusEl.textContent = `Note saved at ${ new Date().toLocaleTimeString() }`;
    }

    async function deleteNote(id) {
        const result = await window.electronAPI.deleteNoteJson(id);
        if (!result.success) return;
        
        const noteToDelete = notes.find(n => n.id === id);
        if (noteToDelete) {
            trashNotes.push({ ...noteToDelete, deletedAt: new Date().toISOString() });
        }
        
        notes = notes.filter(n => n.id !== id);
        if (currentNoteId === id) {
            currentNoteId = null;
            titleInput.value = '';
            textarea.value = '';
            lastSavedContent = '';
            statusEl.textContent = 'Note moved to trash.';
        }
        renderNoteList();
    }

    // Menu action listeners
    window.electronAPI.onMenuAction('menu-new-note', () => newNoteBtn.click());
    window.electronAPI.onMenuAction('menu-open-file', () => openFileBtn.click());
    window.electronAPI.onMenuAction('menu-save', () => saveBtn.click());
    window.electronAPI.onMenuAction('menu-save-as', () => saveAsBtn.click());
});