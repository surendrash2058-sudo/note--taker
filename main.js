const { app, BrowserWindow, ipcMain, dialog } = require('electron');

app.disableHardwareAcceleration();

const path = require('node:path');
const fs = require('node:fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// =========================
// EXISTING FEATURES
// =========================
ipcMain.handle('save-note', async(event, text) => {
    const filePath = path.join(app.getPath('documents'), 'quicknote.txt');
    fs.writeFileSync(filePath, text, 'utf-8');
    return { success: true };
});

ipcMain.handle('load-note', async() => {
    const filePath = path.join(app.getPath('documents'), 'quicknote.txt');
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
    }
    return '';
});

ipcMain.handle('delete-note', async() => {
    const filePath = path.join(app.getPath('documents'), 'quicknote.txt');

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    return { success: true };
});

// =========================
// SAVE AS (NEW)
// =========================
ipcMain.handle('save-as', async(event, text) => {
    const result = await dialog.showSaveDialog({
        title: 'Save Note As',
        defaultPath: 'mynote.txt',
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });

    if (result.canceled) return null;

    fs.writeFileSync(result.filePath, text, 'utf-8');
    return result.filePath;
});

// =========================
// OPEN FILE (NEW)
// =========================
ipcMain.handle('open-file', async() => {
    const result = await dialog.showOpenDialog({
        title: 'Open File',
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
        properties: ['openFile']
    });

    if (result.canceled) return null;

    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');

    return { filePath, content };
});

// =========================
// NEW NOTE (CONFIRMATION)
// =========================
ipcMain.handle('new-note', async() => {
    const result = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Yes', 'Cancel'],
        defaultId: 1,
        message: 'You have unsaved changes. Are you sure you want to start a new note?'
    });

    return result.response === 0; // true if "Yes"
});

// =========================
// SMART SAVE (IMPORTANT FIX)
// =========================
ipcMain.handle('smart-save', async(event, text, filePath) => {
    const finalPath =
        filePath || path.join(app.getPath('documents'), 'quicknote.txt');

    fs.writeFileSync(finalPath, text, 'utf-8');

    return finalPath;
});