window.addEventListener('DOMContentLoaded', async() => {

    const noteList =
        document.getElementById('notes-list');

    const titleInput =
        document.getElementById('note-title');

    const textarea =
        document.getElementById('note');

    const saveBtn =
        document.getElementById('save');

    const saveAsBtn =
        document.getElementById('save-as');

    const openFileBtn =
        document.getElementById('open-file');

    const newNoteBtn =
        document.getElementById('new-note');

    const increaseFontBtn =
        document.getElementById('increase-font');

    const decreaseFontBtn =
        document.getElementById('decrease-font');

    const wordCountEl =
        document.getElementById('word-count');

    const statusEl =
        document.getElementById('status');

    let notes = [];

    let currentNoteId = null;

    let autoSaveTimer;

    let fontSize = 16;

    function updateWordCount() {

        const text = textarea.value.trim();

        const words = text === '' ?
            0 :
            text.split(/\s+/).length;

        const characters =
            textarea.value.length;

        wordCountEl.textContent =
            `Words: ${words} | Characters: ${characters}`;

    }

    function applyFontSize() {

        textarea.style.fontSize =
            `${fontSize}px`;

    }

    async function saveFontSize() {

        await window.electronAPI.saveSettings({
            fontSize: fontSize
        });

    }

    function renderNoteList() {

        noteList.innerHTML = '';

        notes.forEach(note => {

            const noteItem =
                document.createElement('div');

            noteItem.className = 'note-item';

            if (note.id === currentNoteId) {

                noteItem.classList.add('active');

            }

            const noteTitle =
                document.createElement('div');

            noteTitle.className = 'note-title';

            noteTitle.textContent = note.title;

            const noteDate =
                document.createElement('div');

            noteDate.className = 'note-date';

            noteDate.textContent =
                new Date(note.updatedAt)
                .toLocaleString();

            const deleteBtn =
                document.createElement('button');

            deleteBtn.className = 'delete-btn';

            deleteBtn.textContent = '✕';

            deleteBtn.addEventListener('click', async(e) => {

                e.stopPropagation();

                await deleteNote(note.id);

            });

            noteItem.appendChild(noteTitle);

            noteItem.appendChild(noteDate);

            noteItem.appendChild(deleteBtn);

            noteItem.addEventListener('click', () => {

                switchNote(note.id);

            });

            noteList.appendChild(noteItem);

        });

    }

    function switchNote(id) {

        const note =
            notes.find(n => n.id === id);

        if (!note) return;

        currentNoteId = id;

        titleInput.value = note.title;

        textarea.value = note.content;

        updateWordCount();

        renderNoteList();

    }

    async function saveCurrentNote() {

        if (!currentNoteId) return;

        const note = {

            id: currentNoteId,

            title: titleInput.value || 'Untitled Note',

            content: textarea.value,

            createdAt: new Date().toISOString(),

            updatedAt: new Date().toISOString()

        };

        await window.electronAPI.saveNote(note);

        const index =
            notes.findIndex(n => n.id === note.id);

        if (index >= 0) {

            notes[index] = note;

        } else {

            notes.unshift(note);

        }

        renderNoteList();

        statusEl.textContent =
            'Note saved successfully';

    }

    async function deleteNote(id) {

        const confirmDelete =
            confirm('Delete this note?');

        if (!confirmDelete) return;

        await window.electronAPI.deleteNote(id);

        notes =
            notes.filter(note => note.id !== id);

        if (notes.length > 0) {

            switchNote(notes[0].id);

        } else {

            createNewNote();

        }

        renderNoteList();

    }

    function createNewNote() {

        const id =
            Date.now().toString();

        const newNote = {

            id: id,

            title: 'Untitled Note',

            content: '',

            createdAt: new Date().toISOString(),

            updatedAt: new Date().toISOString()

        };

        notes.unshift(newNote);

        currentNoteId = id;

        titleInput.value = newNote.title;

        textarea.value = '';

        updateWordCount();

        renderNoteList();

    }

    const settings =
        await window.electronAPI.getSettings();

    if (settings.fontSize) {

        fontSize = settings.fontSize;

        applyFontSize();

    }

    notes =
        await window.electronAPI.getNotes();

    if (notes.length > 0) {

        const latestNote =
            notes.reduce((latest, note) => {

                return new Date(note.updatedAt) >
                    new Date(latest.updatedAt) ?
                    note :
                    latest;

            });

        switchNote(latestNote.id);

    } else {

        createNewNote();

    }

    saveBtn.addEventListener('click', async() => {

        await saveCurrentNote();

    });

    saveAsBtn.addEventListener('click', async() => {

        const result =
            await window.electronAPI.saveAs(
                textarea.value
            );

        if (result.success) {

            statusEl.textContent =
                `Saved to: ${result.filePath}`;

        }

    });

    openFileBtn.addEventListener('click', async() => {

        const result =
            await window.electronAPI.openFile();

        if (result.success) {

            textarea.value = result.text;

            updateWordCount();

            statusEl.textContent =
                `Opened: ${result.filePath}`;

        }

    });

    newNoteBtn.addEventListener('click', () => {

        createNewNote();

    });

    increaseFontBtn.addEventListener('click', async() => {

        fontSize = Math.min(32, fontSize + 2);

        applyFontSize();

        await saveFontSize();

    });

    decreaseFontBtn.addEventListener('click', async() => {

        fontSize = Math.max(10, fontSize - 2);

        applyFontSize();

        await saveFontSize();

    });

    textarea.addEventListener('input', () => {

        updateWordCount();

        clearTimeout(autoSaveTimer);

        autoSaveTimer = setTimeout(async() => {

            await saveCurrentNote();

            statusEl.textContent =
                'Auto-saved';

        }, 5000);

    });

    window.electronAPI.onMenuAction(
        'menu-save',
        () => {
            saveBtn.click();
        }
    );

    window.electronAPI.onMenuAction(
        'menu-save-as',
        () => {
            saveAsBtn.click();
        }
    );

    window.electronAPI.onMenuAction(
        'menu-open-file',
        () => {
            openFileBtn.click();
        }
    );

    window.electronAPI.onMenuAction(
        'menu-new-note',
        () => {
            newNoteBtn.click();
        }
    );

});