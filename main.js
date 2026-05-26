const {
    app,
    BrowserWindow,
    ipcMain,
    dialog,
    Menu,
    Tray
} = require('electron');

const path = require('path');
const fs = require('fs');

let tray;
let notesPath;

function getNotes() {

    if (!fs.existsSync(notesPath)) {
        return [];
    }

    const data = fs.readFileSync(notesPath, 'utf-8');

    return JSON.parse(data);
}

function saveNotes(notes) {

    fs.writeFileSync(
        notesPath,
        JSON.stringify(notes, null, 2),
        'utf-8'
    );
}

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

    return win;
}

app.whenReady().then(() => {

    notesPath = path.join(
        app.getPath('userData'),
        'notes.json'
    );

    const win = createWindow();

    const menuTemplate = [

        {
            label: 'File',

            submenu: [

                {
                    label: 'New Note',
                    accelerator: 'CmdOrCtrl+N',

                    click: () => {
                        win.webContents.send('menu-new-note');
                    }
                },

                {
                    label: 'Open File',
                    accelerator: 'CmdOrCtrl+O',

                    click: () => {
                        win.webContents.send('menu-open-file');
                    }
                },

                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',

                    click: () => {
                        win.webContents.send('menu-save');
                    }
                },

                {
                    label: 'Save As',
                    accelerator: 'CmdOrCtrl+Shift+S',

                    click: () => {
                        win.webContents.send('menu-save-as');
                    }
                },

                {
                    type: 'separator'
                },

                {
                    label: 'Quit',

                    click: () => {
                        app.quit();
                    }
                }

            ]
        }

    ];

    const menu = Menu.buildFromTemplate(menuTemplate);

    Menu.setApplicationMenu(menu);

    tray = new Tray(
        path.join(__dirname, 'icon.png')
    );

    tray.setToolTip('Quick Note Taker');

    tray.on('click', () => {

        if (win.isVisible()) {
            win.hide();
        } else {
            win.show();
        }

    });

});

app.on('window-all-closed', () => {

    if (process.platform !== 'darwin') {
        app.quit();
    }

});

ipcMain.handle('get-notes', async() => {

    return getNotes();

});

ipcMain.handle('save-note', async(event, note) => {

    const notes = getNotes();

    const existingIndex =
        notes.findIndex(n => n.id === note.id);

    if (existingIndex >= 0) {
        notes[existingIndex] = note;
    } else {
        notes.unshift(note);
    }

    saveNotes(notes);

    return {
        success: true
    };

});

ipcMain.handle('delete-note', async(event, id) => {

    const notes =
        getNotes().filter(
            note => note.id !== id
        );

    saveNotes(notes);

    return {
        success: true
    };

});

ipcMain.handle('save-as', async(event, text) => {

    const result =
        await dialog.showSaveDialog({

            defaultPath: 'mynote.txt',

            filters: [{
                name: 'Text Files',
                extensions: ['txt']
            }]

        });

    if (result.canceled) {

        return {
            success: false
        };
    }

    fs.writeFileSync(
        result.filePath,
        text,
        'utf-8'
    );

    return {
        success: true,
        filePath: result.filePath
    };

});

ipcMain.handle('open-file', async() => {

    const result =
        await dialog.showOpenDialog({

            properties: ['openFile'],

            filters: [{
                name: 'Text Files',
                extensions: ['txt']
            }]

        });

    if (result.canceled) {

        return {
            success: false
        };
    }

    const filePath = result.filePaths[0];

    const text =
        fs.readFileSync(
            filePath,
            'utf-8'
        );

    return {
        success: true,
        text: text,
        filePath: filePath
    };

});

ipcMain.handle('save-settings', async(event, settings) => {

    const settingsPath = path.join(
        app.getPath('userData'),
        'settings.json'
    );

    fs.writeFileSync(
        settingsPath,
        JSON.stringify(settings, null, 2),
        'utf-8'
    );

    return { success: true };

});

ipcMain.handle('get-settings', async() => {

    const settingsPath = path.join(
        app.getPath('userData'),
        'settings.json'
    );

    if (!fs.existsSync(settingsPath)) {

        return {
            fontSize: 16
        };

    }

    return JSON.parse(
        fs.readFileSync(settingsPath, 'utf-8')
    );

});