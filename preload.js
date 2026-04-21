const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Basic features
    saveNote: (text) => ipcRenderer.invoke('save-note', text),
    loadNote: () => ipcRenderer.invoke('load-note'),
    deleteNote: () => ipcRenderer.invoke('delete-note'),

    // New features (from your PDF)
    saveAs: (text) => ipcRenderer.invoke('save-as', text),
    openFile: () => ipcRenderer.invoke('open-file'),
    newNote: () => ipcRenderer.invoke('new-note'),

    // Smart save (fixes Save button behavior)
    smartSave: (text, filePath) => ipcRenderer.invoke('smart-save', text, filePath)
});