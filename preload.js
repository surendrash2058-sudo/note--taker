const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

    getNotes: () =>
        ipcRenderer.invoke('get-notes'),

    saveNote: (note) =>
        ipcRenderer.invoke('save-note', note),

    deleteNote: (id) =>
        ipcRenderer.invoke('delete-note', id),

    saveAs: (text) =>
        ipcRenderer.invoke('save-as', text),

    openFile: () =>
        ipcRenderer.invoke('open-file'),

    getSettings: () =>
        ipcRenderer.invoke('get-settings'),

    saveSettings: (settings) =>
        ipcRenderer.invoke('save-settings', settings),

    onMenuAction: (channel, callback) =>
        ipcRenderer.on(channel, callback)

});