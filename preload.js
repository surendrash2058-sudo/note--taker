// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ── Existing file-based methods ──────────────
    saveNote:   (text) => ipcRenderer.invoke('save-note', text),
    loadNote:   () => ipcRenderer.invoke('load-note'),
    saveAs:     (text) => ipcRenderer.invoke('save-as', text),
    newNote:    () => ipcRenderer.invoke('new-note'),
    openFile:   () => ipcRenderer.invoke('open-file'),
    smartSave:  (text, filePath) => ipcRenderer.invoke('smart-save', text, filePath),

    // ── NEW: Menu listener (main → renderer) ─────
    // channel: e.g. 'menu-save', callback: function to run
    onMenuAction: (channel, callback) => ipcRenderer.on(channel, callback),

    // ── NEW: JSON notes methods ──────────────────
    getNotes:     () => ipcRenderer.invoke('get-notes'),
    saveNoteJson: (note) => ipcRenderer.invoke('save-note-json', note),
    deleteNote:   (id) => ipcRenderer.invoke('delete-note', id)
});
