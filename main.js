// main.js

const { app, BrowserWindow, ipcMain, dialog, Menu, Tray } = require('electron');
const path = require('path');
const fs = require('fs');

// NEW: Path for the notes JSON file
const notesFilePath = path.join(app.getPath('userData'), 'notes.json');

// ─────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────

// NEW: Helper – read all notes from the JSON file
function readNotes() {
    if (!fs.existsSync(notesFilePath)) {
        return []; // return empty array if file does not exist yet
    }
    const raw = fs.readFileSync(notesFilePath, 'utf-8');
    return JSON.parse(raw);
}

// NEW: Helper – write all notes to the JSON file
function writeNotes(notes) {
    fs.writeFileSync(notesFilePath, JSON.stringify(notes, null, 2), 'utf-8');
}

// ─────────────────────────────────────────
// Create Window
// ─────────────────────────────────────────

function createWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 650,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile('index.html');

    // NEW: Hide window instead of closing
    win.on('close', (event) => {
        event.preventDefault(); // stop the window from actually closing
        win.hide();             // hide it instead
    });
}

// ─────────────────────────────────────────
// App Ready
// ─────────────────────────────────────────

let tray = null;

app.whenReady().then(() => {
    createWindow();

    // ── App Menu ──────────────────────────────
    const menuTemplate = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Note',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        BrowserWindow.getFocusedWindow().webContents.send('menu-new-note');
                    }
                },
                {
                    label: 'Open File',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        BrowserWindow.getFocusedWindow().webContents.send('menu-open-file');
                    }
                },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        BrowserWindow.getFocusedWindow().webContents.send('menu-save');
                    }
                },
                {
                    label: 'Save As',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => {
                        BrowserWindow.getFocusedWindow().webContents.send('menu-save-as');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => app.quit()
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    // ── System Tray ───────────────────────────
    tray = new Tray(path.join(__dirname, 'icon.png'));

    const trayMenu = Menu.buildFromTemplate([
        {
            label: 'Show App',
            click: () => {
                BrowserWindow.getAllWindows()[0].show();
            }
        },
        {
            label: 'Quit',
            click: () => app.quit()
        }
    ]);

    tray.setToolTip('Quick Note Taker');
    tray.setContextMenu(trayMenu);

    // NEW: Double-click tray icon to show/hide window
    tray.on('double-click', () => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win.isVisible()) {
            win.hide();
        } else {
            win.show();
        }
    });
});

// ─────────────────────────────────────────
// IPC Handlers – File-based (existing)
// ─────────────────────────────────────────

ipcMain.handle('save-note', async (event, text) => {
    const filePath = path.join(app.getPath('documents'), 'quicknote.txt');
    fs.writeFileSync(filePath, text, 'utf-8');
    return { success: true };
});

ipcMain.handle('load-note', async () => {
    const filePath = path.join(app.getPath('documents'), 'quicknote.txt');
    if (!fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath, 'utf-8');
});

ipcMain.handle('save-as', async (event, text) => {
    const win = BrowserWindow.getFocusedWindow();
    const { filePath } = await dialog.showSaveDialog(win, {
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });
    if (filePath) {
        fs.writeFileSync(filePath, text, 'utf-8');
        return { success: true, filePath };
    }
    return { success: false };
});

ipcMain.handle('new-note', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const { response } = await dialog.showMessageBox(win, {
        type: 'warning',
        buttons: ['Delete', 'Cancel'],
        defaultId: 1,
        message: 'Do you want to delete this note?'
    });
    return { confirmed: response === 0 };
});

ipcMain.handle('open-file', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const { filePaths } = await dialog.showOpenDialog(win, {
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
        properties: ['openFile']
    });
    if (filePaths && filePaths[0]) {
        const content = fs.readFileSync(filePaths[0], 'utf-8');
        return { success: true, content, filePath: filePaths[0] };
    }
    return { success: false };
});

ipcMain.handle('smart-save', async (event, text, filePath) => {
    if (filePath) {
        fs.writeFileSync(filePath, text, 'utf-8');
        return { success: true, filePath };
    }
    // Fall back to save-as
    const win = BrowserWindow.getFocusedWindow();
    const { filePath: newPath } = await dialog.showSaveDialog(win, {
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });
    if (newPath) {
        fs.writeFileSync(newPath, text, 'utf-8');
        return { success: true, filePath: newPath };
    }
    return { success: false };
});

// ─────────────────────────────────────────
// IPC Handlers – JSON Notes (NEW)
// ─────────────────────────────────────────

// NEW: Get all notes
ipcMain.handle('get-notes', async () => {
    return readNotes();
});

// NEW: Delete a note
ipcMain.handle('delete-note', async (event, id) => {
    const notes = readNotes();
    const filtered = notes.filter(n => n.id !== id);
    writeNotes(filtered);
    return { success: true };
});

// NEW: Save a note (create or update)
ipcMain.handle('save-note-json', async (event, note) => {
    const notes = readNotes();
    const index = notes.findIndex(n => n.id === note.id);
    const now = new Date().toISOString();

    if (index === -1) {
        // Note does not exist yet – create it
        notes.push({ ...note, createdAt: now, updatedAt: now });
    } else {
        // Note already exists – update it
        notes[index] = { ...notes[index], ...note, updatedAt: now };
    }

    writeNotes(notes);
    return { success: true };
});
