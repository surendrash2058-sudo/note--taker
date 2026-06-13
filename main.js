const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

app.disableHardwareAcceleration();

function createWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 600,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            spellcheck: true
        }
    });

    win.loadFile('index.html');
}

// Safe menu sender
function sendToFocusedWindow(channel) {
    const win = BrowserWindow.getFocusedWindow();
    if (win && !win.isDestroyed()) {
        win.webContents.send(channel);
    }
}

// Notes file helper
function getNotesFile() {
    return path.join(app.getPath('userData'), 'notes.json');
}

app.whenReady().then(() => {
    createWindow();

    app.on('web-contents-created', (event, contents) => {
        contents.on('context-menu', (event, params) => {
            const menu = new Menu();

            // Add each spelling suggestion
            for (const suggestion of params.dictionarySuggestions) {
                menu.append(new MenuItem({
                    label: suggestion,
                    click: () => contents.replaceMisspelling(suggestion)
                }));
            }

            // Allow users to add the misspelled word to the dictionary
            if (params.misspelledWord) {
                menu.append(
                    new MenuItem({
                        label: 'Add to dictionary',
                        click: () => contents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
                    })
                );
            }

            if (menu.items.length > 0) {
                menu.popup();
            }
        });
    });

    const menuTemplate = [{
        label: 'File',
        submenu: [{
                label: 'New Note',
                accelerator: 'CmdOrCtrl+N',
                click: () => sendToFocusedWindow('menu-new-note')
            },
            {
                label: 'Open File',
                accelerator: 'CmdOrCtrl+O',
                click: () => sendToFocusedWindow('menu-open-file')
            },
            {
                label: 'Save',
                accelerator: 'CmdOrCtrl+S',
                click: () => sendToFocusedWindow('menu-save')
            },
            {
                label: 'Save As',
                accelerator: 'CmdOrCtrl+Shift+S',
                click: () => sendToFocusedWindow('menu-save-as')
            },
            { type: 'separator' },
            {
                label: 'Quit',
                accelerator: 'CmdOrCtrl+Q',
                click: () => app.quit()
            }
        ]
    }];

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ---------------------------
// Notes Helpers
// ---------------------------

function getTrashFile() {
    return path.join(app.getPath('userData'), 'trash.json');
}

function loadTrash() {
    const trashFile = getTrashFile();
    if (!fs.existsSync(trashFile)) return [];
    try {
        return JSON.parse(fs.readFileSync(trashFile, 'utf8'));
    } catch {
        return [];
    }
}

function saveTrash(trash) {
    fs.writeFileSync(getTrashFile(), JSON.stringify(trash, null, 2), 'utf8');
}

function loadNotes() {
    const notesFile = getNotesFile();

    if (!fs.existsSync(notesFile)) {
        return [];
    }

    try {
        return JSON.parse(fs.readFileSync(notesFile, 'utf8'));
    } catch (err) {
        console.error('Failed to parse notes.json:', err);
        return [];
    }
}

function saveNotes(notes) {
    const notesFile = getNotesFile();

    fs.writeFileSync(
        notesFile,
        JSON.stringify(notes, null, 2),
        'utf8'
    );
}

// ---------------------------
// IPC Handlers
// ---------------------------

ipcMain.handle('get-notes', async() => {
    return loadNotes();
});

ipcMain.handle('save-note-json', async(event, note) => {
    try {
        const notes = loadNotes();

        const index = notes.findIndex(n => n.id === note.id);

        const updatedNote = {
            ...note,
            updatedAt: new Date().toISOString()
        };

        if (index >= 0) {
            notes[index] = updatedNote;
        } else {
            notes.push(updatedNote);
        }

        saveNotes(notes);

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('delete-note-json', async(event, id) => {
    try {
        const notes = loadNotes();
        const noteToDelete = notes.find(n => n.id === id);
        
        if (noteToDelete) {
            const trash = loadTrash();
            trash.push({ ...noteToDelete, deletedAt: new Date().toISOString() });
            saveTrash(trash);
            
            const newNotes = notes.filter(n => n.id !== id);
            saveNotes(newNotes);
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('get-trash', async() => {
    return loadTrash();
});

ipcMain.handle('restore-note', async(event, id) => {
    try {
        const trash = loadTrash();
        const noteToRestore = trash.find(n => n.id === id);
        
        if (noteToRestore) {
            delete noteToRestore.deletedAt;
            const notes = loadNotes();
            notes.push(noteToRestore);
            saveNotes(notes);
            
            const newTrash = trash.filter(n => n.id !== id);
            saveTrash(newTrash);
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('delete-forever', async(event, id) => {
    try {
        const trash = loadTrash();
        const newTrash = trash.filter(n => n.id !== id);
        saveTrash(newTrash);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('export-pdf', async(event, noteData) => {
    try {
        const pdfPath = await dialog.showSaveDialog({
            title: 'Export PDF',
            defaultPath: `${noteData.title || 'Note'}.pdf`,
            filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });

        if (pdfPath.canceled || !pdfPath.filePath) {
            return { success: false, canceled: true };
        }

        const win = new BrowserWindow({ show: false });
        await win.loadURL(`data:text/html;charset=utf-8,
            <html>
            <head><style>body{font-family:sans-serif;padding:20px;} h1{margin-top:0;}</style></head>
            <body>
                <h1>${noteData.title}</h1>
                <p style="white-space: pre-wrap;">${noteData.content}</p>
            </body>
            </html>`);
        
        const pdfData = await win.webContents.printToPDF({});
        fs.writeFileSync(pdfPath.filePath, pdfData);
        win.destroy();

        return { success: true, filePath: pdfPath.filePath };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('print-note', async(event, noteData) => {
    try {
        const win = new BrowserWindow({ show: false });
        await win.loadURL(`data:text/html;charset=utf-8,
            <html>
            <head><style>body{font-family:sans-serif;padding:20px;} h1{margin-top:0;}</style></head>
            <body>
                <h1>${noteData.title}</h1>
                <p style="white-space: pre-wrap;">${noteData.content}</p>
            </body>
            </html>`);
        
        win.webContents.on('did-finish-load', () => {
            win.webContents.print({}, (success, errorType) => {
                win.destroy();
            });
        });
        
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('save-note', async(event, text) => {
    try {
        const filePath = path.join(
            app.getPath('userData'),
            'quicknote.txt'
        );

        fs.writeFileSync(filePath, text, 'utf8');

        return {
            success: true,
            filePath
        };
    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
});

ipcMain.handle('load-note', async() => {
    try {
        const filePath = path.join(
            app.getPath('userData'),
            'quicknote.txt'
        );

        if (!fs.existsSync(filePath)) {
            return '';
        }

        return fs.readFileSync(filePath, 'utf8');
    } catch {
        return '';
    }
});

ipcMain.handle('save-as', async(event, text) => {
    try {
        const win = BrowserWindow.fromWebContents(event.sender);

        const result = await dialog.showSaveDialog(win, {
            defaultPath: 'mynote.txt',
            filters: [{
                name: 'Text Files',
                extensions: ['txt']
            }]
        });

        if (result.canceled || !result.filePath) {
            return {
                success: false,
                canceled: true
            };
        }

        fs.writeFileSync(result.filePath, text, 'utf8');

        return {
            success: true,
            filePath: result.filePath
        };
    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
});

ipcMain.handle('new-note', async() => {
    const result = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Discard changes', 'Cancel'],
        defaultId: 1,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Start a new note anyway?'
    });

    return {
        confirmed: result.response === 0
    };
});

ipcMain.handle('open-file', async() => {
    try {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{
                name: 'Text Files',
                extensions: ['txt']
            }]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return {
                success: false,
                canceled: true
            };
        }

        const filePath = result.filePaths[0];
        const content = fs.readFileSync(filePath, 'utf8');

        return {
            success: true,
            filePath,
            content
        };
    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
});

ipcMain.handle('delete-note', async() => {
    try {
        const filePath = path.join(
            app.getPath('userData'),
            'quicknote.txt'
        );

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return { success: true };
    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
});

ipcMain.handle('smart-save', async(event, text, filePath) => {
    try {
        const targetPath =
            filePath ||
            path.join(
                app.getPath('userData'),
                'quicknote.txt'
            );

        fs.writeFileSync(targetPath, text, 'utf8');

        return {
            success: true,
            filePath: targetPath
        };
    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
});