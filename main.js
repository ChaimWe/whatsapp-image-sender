const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
let mainWindow;
let serverProcess;

// Get the correct base path for resources
const getResourcePath = (relativePath) => {
    return app.isPackaged 
        ? path.join(process.resourcesPath, relativePath)
        : path.join(__dirname, relativePath);
};

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
            allowRunningInsecureContent: false
        }
    });

    // Wait for server to start before loading the page
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:4000');
    }, 2000);
    
    // Error handling for page load
    mainWindow.webContents.on('did-fail-load', () => {
        console.error('Failed to load application window');
        // Attempt to reload after a brief delay
        setTimeout(() => mainWindow.reload(), 1000);
    });
}

function startServer() {
    const serverScript = app.isPackaged 
        ? path.join(process.resourcesPath, 'server.js')
        : path.join(__dirname, 'server.js');

    serverProcess = spawn('node', [serverScript], {
        stdio: 'pipe',
        env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '1',
            APP_PATH: app.getPath('userData')
        }
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`Server stdout: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`Server stderr: ${data}`);
    });

    serverProcess.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
        // Attempt to restart server if it crashes
        if (code !== 0) {
            console.log('Attempting to restart server...');
            setTimeout(startServer, 5000);
        }
    });
}

app.whenReady().then(() => {
    startServer();
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

// Handle close app request from renderer
ipcMain.on('close-app', () => {
    app.quit();
}); 