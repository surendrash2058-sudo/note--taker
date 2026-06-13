const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Basic features
    saveNote: (text) => ipcRenderer.invoke('save-note', note),
    loadNote: () => ipcRenderer.invoke('load-note'),
    deleteNote: () => ipcRenderer.invoke('delete-note'),

    // New features (from your PDF)
    saveAs: (text) => ipcRenderer.invoke('save-as', text),
    openFile: () => ipcRenderer.invoke('open-file'),
    newNote: () => ipcRenderer.invoke('new-note'),
    smartSave: (text, filePath) => ipcRenderer.invoke('smart-save', text, filePath),
    onMenuAction: (channel, callback) => ipcRenderer.on(channel, callback),
    getNotes: () => ipcRenderer.invoke('get-notes'),
    saveNoteJson: (note) => ipcRenderer.invoke('save-note-json', note),
    deleteNoteJson: (id) => ipcRenderer.invoke('delete-note-json', id),
    getTrash: () => ipcRenderer.invoke('get-trash'),
    restoreNote: (id) => ipcRenderer.invoke('restore-note', id),
    deleteForever: (id) => ipcRenderer.invoke('delete-forever', id),
    exportPdf: (noteData) => ipcRenderer.invoke('export-pdf', noteData),
    printNote: (noteData) => ipcRenderer.invoke('print-note', noteData)
});