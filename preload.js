const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Add any IPC methods here if needed in the future
}); 