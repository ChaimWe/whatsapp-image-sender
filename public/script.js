// DOM Elements
const statusContainer = document.getElementById('statusContainer');
const statusText = document.getElementById('statusText');
const qrCode = document.getElementById('qrCode');
const sendForm = document.getElementById('sendForm');
const chatId = document.getElementById('chatId');
const batchSize = document.getElementById('batchSize');
const delaySeconds = document.getElementById('delaySeconds');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const sendButton = document.getElementById('sendButton');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const currentStatus = document.getElementById('currentStatus');
const abortButton = document.getElementById('abortButton');

let selectedFiles = [];
let statusCheckInterval = null;
let lastQrCode = null;  // Add cache for last QR code

function startStatusChecks() {
    let checkInterval = 1000; // Start with 1 second for faster initial response

    function updateStatusWithInterval() {
        fetch('/status')
            .then(response => response.json())
            .then(data => {
                // If we have a QR code, slow down the checks
                if (data.qrCode) {
                    checkInterval = 3000; // Check every 3 seconds when showing QR
                } else if (data.isSyncing) {
                    checkInterval = 1000; // Check every second when syncing
                } else if (data.isReady) {
                    checkInterval = 2000; // Check every 2 seconds when ready
                } else {
                    checkInterval = 1000; // Keep checking every second while initializing
                }

                updateStatusDisplay(data);
                
                // Schedule next check
                setTimeout(updateStatusWithInterval, checkInterval);
            })
            .catch(error => {
                console.error('Error checking status:', error);
                setTimeout(updateStatusWithInterval, checkInterval);
            });
    }

    // Start the first check immediately
    updateStatusWithInterval();
}

function updateStatusDisplay(data) {
    console.log('Status update received:', data);
    
    const statusContainer = document.getElementById('statusContainer');
    const statusText = document.getElementById('statusText');
    const qrCode = document.getElementById('qrCode');
    const sendForm = document.getElementById('sendForm');
    const spinner = statusContainer.querySelector('.loading-spinner');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const currentStatus = document.getElementById('currentStatus');
    const abortButton = document.getElementById('abortButton');

    if (data.qrCode) {
        console.log('QR code detected, displaying...');
        // Only set QR code source if it's not already set
        if (!qrCode.src || qrCode.src.length < 100) { // Basic check for data URL
            qrCode.src = data.qrCode;
            console.log('QR code source set');
        }
        
        statusContainer.className = 'status-container not-ready';
        statusText.textContent = 'Scan QR Code with WhatsApp';
        qrCode.style.display = 'block';
        qrCode.style.width = '300px';
        qrCode.style.height = 'auto';
        qrCode.style.margin = '20px auto';
        sendForm.style.display = 'none';
        spinner.style.display = 'none';
        
        // Show reset button after 30 seconds of QR code display
        setTimeout(() => {
            if (data.qrCode && !data.isReady) {
                document.getElementById('resetButton').style.display = 'block';
            }
        }, 30000);
        
        // Add error handling for QR code loading
        qrCode.onerror = (error) => {
            console.error('Failed to load QR code image:', error);
            statusText.textContent = 'Error loading QR code. Please refresh the page.';
        };
        
        qrCode.onload = () => {
            console.log('QR code image loaded successfully');
        };
        
        // Force a redraw of the QR code
        qrCode.style.opacity = '0';
        setTimeout(() => {
            qrCode.style.opacity = '1';
        }, 100);
    } else if (data.isSyncing) {
        statusContainer.className = 'status-container syncing';
        statusText.textContent = 'Syncing with WhatsApp...';
        qrCode.style.display = 'none';
        sendForm.style.display = 'none';
        spinner.style.display = 'inline-block';
        statusText.style.animation = 'pulse 2s infinite';
    } else if (data.isReady) {
        statusContainer.className = 'status-container ready';
        statusText.textContent = 'WhatsApp Connected';
        statusText.style.animation = 'none';
        qrCode.style.display = 'none';
        sendForm.style.display = 'block';
        spinner.style.display = 'none';
    } else {
        statusContainer.className = 'status-container not-ready';
        statusText.textContent = 'Initializing WhatsApp...';
        statusText.style.animation = 'none';
        qrCode.style.display = 'none';
        sendForm.style.display = 'none';
        spinner.style.display = 'inline-block';
    }

    // Update progress if there's an active job
    if (data.currentJob) {
        progressContainer.style.display = 'block';
        const percent = Math.round((data.currentJob.progress / data.currentJob.total) * 100);
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${percent}% (${data.currentJob.progress}/${data.currentJob.total})`;
        currentStatus.textContent = data.currentJob.status;
        abortButton.disabled = false;
    } else {
        currentStatus.textContent = '';
        abortButton.disabled = true;
    }
}

async function abortCurrentJob() {
    try {
        const response = await fetch('/abort', {
            method: 'POST'
        });
        const result = await response.json();
        if (result.success) {
            addStatusUpdate('⚠️ Aborting current job...');
        }
    } catch (error) {
        console.error('Error aborting job:', error);
    }
}

function finishApplication() {
    // Check if we're running in Electron
    if (typeof window !== 'undefined' && window.electronAPI) {
        // Close the Electron window
        window.electronAPI.closeApp();
    } else {
        // Close the browser tab/window
        window.close();
        // If window.close() doesn't work (due to browser restrictions), show a message
        setTimeout(() => {
            alert('Please close this tab/window manually to exit the application.');
        }, 100);
    }
}

async function resetConnection() {
    try {
        const resetButton = document.getElementById('resetButton');
        resetButton.disabled = true;
        resetButton.textContent = 'Resetting...';
        
        const response = await fetch('/reset', {
            method: 'POST'
        });
        const result = await response.json();
        
        if (result.success) {
            addStatusUpdate('🔄 WhatsApp connection reset successfully');
            // Hide reset button and show loading
            resetButton.style.display = 'none';
            document.getElementById('statusText').textContent = 'Reconnecting to WhatsApp...';
        } else {
            addStatusUpdate('❌ Failed to reset connection');
            resetButton.disabled = false;
            resetButton.textContent = 'Reset Connection';
        }
    } catch (error) {
        console.error('Error resetting connection:', error);
        addStatusUpdate('❌ Error resetting connection');
        const resetButton = document.getElementById('resetButton');
        resetButton.disabled = false;
        resetButton.textContent = 'Reset Connection';
    }
}

function updateSendButtonState() {
    const sendButton = document.getElementById('sendButton');
    const chatId = document.getElementById('chatId').value;
    sendButton.disabled = !chatId || selectedFiles.length === 0;
}

function updateImagePreview() {
    const previewContainer = document.getElementById('imagePreview');
    previewContainer.innerHTML = '';
    
    // Group files by folder
    const filesByFolder = {};
    selectedFiles.forEach((file, index) => {
        const folderPath = file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(0, -1).join('/') : '';
        if (!filesByFolder[folderPath]) {
            filesByFolder[folderPath] = [];
        }
        filesByFolder[folderPath].push({ file, index });
    });

    // Create preview elements
    Object.entries(filesByFolder).forEach(([folder, files]) => {
        if (folder) {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'folder-group';
            folderDiv.innerHTML = `
                <div class="folder-header">
                    <span>📁 ${folder}</span>
                    <span class="file-count">${files.length} files</span>
                </div>
            `;
            previewContainer.appendChild(folderDiv);
        }

        const previewGrid = document.createElement('div');
        previewGrid.className = 'preview-grid';

        files.forEach(({ file, index }) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';

            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = (e) => {
                e.preventDefault();
                selectedFiles.splice(index, 1);
                updateImagePreview();
                updateSendButtonState();
            };

            previewItem.appendChild(img);
            previewItem.appendChild(removeBtn);
            previewGrid.appendChild(previewItem);
        });

        previewContainer.appendChild(previewGrid);
    });
}

function handleFiles(files, isFromFolder = false) {
    const imageFiles = Array.from(files).filter(file => {
        // Check if it's an image file
        if (!file.type.startsWith('image/')) {
            console.log(`Skipping non-image file: ${file.name}`);
            return false;
        }
        
        // Check for duplicate files
        const isDuplicate = selectedFiles.some(existing => 
            existing.name === file.name && 
            existing.size === file.size &&
            existing.lastModified === file.lastModified
        );
        
        if (isDuplicate) {
            console.log(`Skipping duplicate file: ${file.name}`);
            return false;
        }
        
        return true;
    });

    if (imageFiles.length === 0) {
        addStatusUpdate('⚠️ No new image files found in the selection');
        return;
    }

    selectedFiles = [...selectedFiles, ...imageFiles];
    updateImagePreview();
    updateSendButtonState();

    const totalFiles = imageFiles.length;
    const folderName = isFromFolder ? imageFiles[0].webkitRelativePath.split('/')[0] : 'selection';
    addStatusUpdate(`✓ Added ${totalFiles} images from ${folderName}`);
}

function addStatusUpdate(message) {
    const statusUpdates = document.getElementById('statusUpdates');
    const update = document.createElement('div');
    update.className = 'status-update';
    update.textContent = message;
    statusUpdates.insertBefore(update, statusUpdates.firstChild);
    statusUpdates.scrollTop = 0;
}

function updateBatchSettings() {
    const isRandom = document.getElementById('randomBatch').checked;
    const minBatchInput = document.getElementById('minBatchSize');
    const maxBatchInput = document.getElementById('maxBatchSize');

    if (!isRandom) {
        minBatchInput.value = maxBatchInput.value;
        minBatchInput.disabled = true;
    } else {
        minBatchInput.disabled = false;
    }
}

function updateDelaySettings() {
    const isRandom = document.getElementById('randomDelay').checked;
    const minDelayInput = document.getElementById('minDelay');
    const maxDelayInput = document.getElementById('maxDelay');

    if (!isRandom) {
        minDelayInput.value = maxDelayInput.value;
        minDelayInput.disabled = true;
    } else {
        minDelayInput.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const folderInput = document.getElementById('folderInput');
    const fileSelectBtn = document.getElementById('fileSelectBtn');
    const folderSelectBtn = document.getElementById('folderSelectBtn');
    const sendForm = document.getElementById('sendForm');
    const chatIdInput = document.getElementById('chatId');
    const abortButton = document.getElementById('abortButton');

    // Set up file selection buttons
    fileSelectBtn.addEventListener('click', () => fileInput.click());
    folderSelectBtn.addEventListener('click', () => folderInput.click());

    // Set up abort button
    abortButton.addEventListener('click', abortCurrentJob);
    abortButton.disabled = true;

    // Set up finish button
    const finishButton = document.getElementById('finishButton');
    finishButton.addEventListener('click', finishApplication);
    finishButton.disabled = true;

    // Set up reset button
    const resetButton = document.getElementById('resetButton');
    resetButton.addEventListener('click', resetConnection);

    // Set up mode change handlers
    document.getElementById('staticBatch').addEventListener('change', updateBatchSettings);
    document.getElementById('randomBatch').addEventListener('change', updateBatchSettings);
    document.getElementById('staticDelay').addEventListener('change', updateDelaySettings);
    document.getElementById('randomDelay').addEventListener('change', updateDelaySettings);

    // Initialize settings
    updateBatchSettings();
    updateDelaySettings();

    // Start status checks with variable interval
    startStatusChecks();
    
    // Remove the old interval
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
    }

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        // Handle both files and folders
        const items = e.dataTransfer.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry();
                    if (entry.isDirectory) {
                        // Handle folder
                        addStatusUpdate('ℹ️ Processing folder: ' + entry.name);
                        traverseDirectory(entry);
                    } else {
                        // Handle file
                        const file = item.getAsFile();
                        handleFiles([file]);
                    }
                }
            }
    } else {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
        fileInput.value = '';
    });

    folderInput.addEventListener('change', () => {
        handleFiles(folderInput.files, true);
        folderInput.value = '';
    });

    chatIdInput.addEventListener('input', updateSendButtonState);

    sendForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('chatId', document.getElementById('chatId').value);
        
        const isRandomBatch = document.getElementById('randomBatch').checked;
        const isRandomDelay = document.getElementById('randomDelay').checked;
        
        if (isRandomBatch) {
            formData.append('minBatchSize', document.getElementById('minBatchSize').value);
            formData.append('maxBatchSize', document.getElementById('maxBatchSize').value);
    } else {
            const batchSize = document.getElementById('maxBatchSize').value;
            formData.append('minBatchSize', batchSize);
            formData.append('maxBatchSize', batchSize);
        }

        if (isRandomDelay) {
            formData.append('minDelay', document.getElementById('minDelay').value);
            formData.append('maxDelay', document.getElementById('maxDelay').value);
        } else {
            const delay = document.getElementById('maxDelay').value;
            formData.append('minDelay', delay);
            formData.append('maxDelay', delay);
        }
    
    selectedFiles.forEach(file => {
        formData.append('images', file);
    });

        const sendButton = document.getElementById('sendButton');
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const currentStatus = document.getElementById('currentStatus');
        const statusUpdates = document.getElementById('statusUpdates');
        const abortButton = document.getElementById('abortButton');

        sendButton.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = 'Starting...';
        currentStatus.textContent = 'Preparing to send images...';
        statusUpdates.innerHTML = '';
        abortButton.disabled = false;
        
        // Hide finish button when starting new job
        const finishButton = document.getElementById('finishButton');
        finishButton.style.display = 'none';
        finishButton.disabled = true;

        try {
            const response = await fetch('/send', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }

            const successCount = result.results.filter(r => r.type === 'success' && r.success).length;
            progressBar.style.width = '100%';
            progressText.textContent = `${result.aborted ? 'Aborted: ' : ''}Sent ${successCount} of ${selectedFiles.length} images successfully`;

            result.results.forEach((r) => {
                switch (r.type) {
                    case 'info':
                        addStatusUpdate(`ℹ️ ${r.message}`);
                        break;
                    case 'success':
                        addStatusUpdate(`✅ ${r.message}`);
                        break;
                    case 'error':
                        addStatusUpdate(`❌ ${r.message}`);
                        break;
                    case 'warning':
                        addStatusUpdate(`⚠️ ${r.message}`);
                        break;
                }
            });

            // Clear selected files and preview
        selectedFiles = [];
        updateImagePreview();
        } catch (error) {
            console.error('Error sending images:', error);
            progressText.textContent = `Error: ${error.message}`;
            currentStatus.textContent = 'Failed to send images';
            addStatusUpdate(`❌ Error: ${error.message}`);
        } finally {
            sendButton.disabled = false;
            abortButton.disabled = true;
            
            // Show finish button when job is completed
            const finishButton = document.getElementById('finishButton');
            finishButton.style.display = 'block';
            finishButton.disabled = false;
        }
    });
});

// Function to traverse directories recursively
async function traverseDirectory(entry) {
    if (entry.isFile) {
        try {
            const file = await new Promise((resolve, reject) => {
                entry.file(resolve, reject);
            });
            if (file.type.startsWith('image/')) {
                handleFiles([file]);
            }
        } catch (error) {
            console.error('Error reading file:', error);
        }
    } else if (entry.isDirectory) {
        try {
            const reader = entry.createReader();
            const entries = await new Promise((resolve, reject) => {
                reader.readEntries(resolve, reject);
            });
            for (const childEntry of entries) {
                await traverseDirectory(childEntry);
            }
    } catch (error) {
            console.error('Error reading directory:', error);
        }
    }
}

// Add styles for folder groups and syncing state
const style = document.createElement('style');
style.textContent = `
    .folder-group {
        margin-bottom: 20px;
    }
    .folder-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        background: rgba(18, 140, 126, 0.1);
        border-radius: 4px;
        margin-bottom: 10px;
        font-size: 14px;
        color: #075E54;
    }
    .file-count {
        font-size: 12px;
        color: #666;
    }
    .preview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 10px;
        margin-bottom: 15px;
    }

    .status-container.syncing {
        background: linear-gradient(135deg, #34D399 0%, #3B82F6 100%);
        color: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        margin-bottom: 20px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.6; }
        100% { opacity: 1; }
    }

    .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s ease-in-out infinite;
        margin-left: 10px;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style); 