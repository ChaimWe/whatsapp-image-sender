require('dotenv').config();
const express = require('express');
const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const port = process.env.PORT || 4000;

// WhatsApp client setup
let client = null;
let qrCodeData = null;
let isReady = false;
let currentJob = null;
let isSyncing = false;

// Function to add status updates (for logging)
function addStatusUpdate(message) {
    console.log(`[STATUS] ${message}`);
}

// Configure multer for handling file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Initialize WhatsApp client
async function initializeWhatsApp() {
    try {
        // Create and clean session directory
        const sessionDir = path.join(__dirname, 'whatsapp-session');
        
        // Delete existing session directory if it exists
        if (fs.existsSync(sessionDir)) {
            console.log('Cleaning up previous session data...');
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
        
        // Create fresh session directory
        fs.mkdirSync(sessionDir);

        client = new Client({
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--ignore-certificate-errors',
                    '--disable-features=IsolateOrigins,site-per-process',
                    `--user-data-dir=${sessionDir}`,
                    '--disable-blink-features=AutomationControlled',
                    '--disable-extensions-except',
                    '--disable-plugins-discovery'
                ]
            },
            restartOnAuthFail: true,
            qrMaxRetries: 3,
            authStrategy: new LocalAuth({
                clientId: 'whatsapp-image-sender',
                dataPath: sessionDir
            })
        });

        client.on('qr', async (qr) => {
            console.log('Generating new QR code');
            try {
                qrCodeData = await qrcode.toDataURL(qr);
                isReady = false;
                isSyncing = false;
                
                // Add a timeout to prevent infinite QR generation
                setTimeout(() => {
                    if (!isReady && !client.info) {
                        console.log('QR code timeout - user needs to scan within 60 seconds');
                        addStatusUpdate('⚠️ Please scan the QR code within 60 seconds');
                    }
                }, 60000);
            } catch (error) {
                console.error('Error generating QR code:', error);
            }
        });

        client.on('loading_screen', (percent, message) => {
            console.log('LOADING SCREEN', percent, message);
            isSyncing = true;
        });

        client.on('ready', () => {
            console.log('WhatsApp client is ready!');
            qrCodeData = null;
            isReady = true;
            isSyncing = false;
        });

        client.on('authenticated', () => {
            console.log('WhatsApp client authenticated');
            qrCodeData = null;
            isSyncing = true;
            
            // Save session data (only if available)
            try {
                if (client.pupPage && client.pupPage.target()) {
                    const sessionFile = path.join(sessionDir, 'session.json');
                    const targetInfo = client.pupPage.target()._targetInfo;
                    if (targetInfo) {
                        fs.writeFileSync(sessionFile, JSON.stringify(targetInfo));
                        console.log('Session data saved successfully');
                    } else {
                        console.log('No target info available for session saving');
                    }
                } else {
                    console.log('Puppeteer page not available for session saving');
                }
            } catch (error) {
                console.error('Failed to save session data:', error);
            }
        });

        client.on('auth_failure', async () => {
            console.log('Auth failure, attempting to reconnect...');
            qrCodeData = null;
            isReady = false;
            
            try {
                await client.initialize();
            } catch (error) {
                console.error('Failed to reconnect after auth failure:', error);
                await cleanupAndRestart();
            }
        });

        client.on('disconnected', async () => {
            console.log('Client disconnected, attempting to reconnect...');
            qrCodeData = null;
            isReady = false;
            
            try {
                // Wait a bit before trying to reconnect
                await new Promise(resolve => setTimeout(resolve, 5000));
                await client.initialize();
            } catch (error) {
                console.error('Failed to reconnect after disconnection:', error);
                await cleanupAndRestart();
            }
        });

        console.log('Initializing WhatsApp client...');
        await client.initialize();

        // Clean up on process exit
        process.on('SIGINT', async () => {
            console.log('Received SIGINT. Cleaning up...');
            await cleanupAndRestart();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            console.log('Received SIGTERM. Cleaning up...');
            await cleanupAndRestart();
            process.exit(0);
        });

    } catch (error) {
        console.error('Failed to initialize WhatsApp:', error);
        // Wait before retrying initialization
        setTimeout(initializeWhatsApp, 5000);
    }
}

// Function to clean up and restart the client
async function cleanupAndRestart() {
    try {
        if (client) {
            await client.destroy();
            client = null;
        }

        // Clean up all session data
        const sessionDir = path.join(__dirname, 'whatsapp-session');
        if (fs.existsSync(sessionDir)) {
            console.log('Cleaning up session directory...');
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }

        // Clean up any temporary session files
        const tempDir = os.tmpdir();
        const sessionDirs = fs.readdirSync(tempDir).filter(dir => dir.startsWith('whatsapp-session-'));
        for (const dir of sessionDirs) {
            console.log(`Cleaning up temporary session: ${dir}`);
            fs.rmSync(path.join(tempDir, dir), { recursive: true, force: true });
        }

        // Restart the client after a short delay
        setTimeout(initializeWhatsApp, 5000);
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

// API endpoints
app.get('/status', (req, res) => {
    console.log('Status requested. QR Code available:', !!qrCodeData);
    res.json({
        isReady,
        qrCode: qrCodeData,
        isSyncing,
        authenticated: client ? Boolean(client.info) : false,
        currentJob: currentJob ? {
            status: currentJob.status,
            progress: currentJob.progress,
            total: currentJob.total
        } : null
    });
});

app.post('/abort', (req, res) => {
    if (currentJob) {
        currentJob.aborted = true;
        res.json({ success: true, message: 'Job aborted' });
    } else {
        res.json({ success: false, message: 'No active job to abort' });
    }
});

app.post('/reset', async (req, res) => {
    try {
        console.log('Manual reset requested by user');
        await cleanupAndRestart();
        res.json({ success: true, message: 'WhatsApp client reset successfully' });
    } catch (error) {
        console.error('Error during manual reset:', error);
        res.status(500).json({ success: false, message: 'Failed to reset WhatsApp client' });
    }
});

app.post('/send', upload.array('images'), async (req, res) => {
    try {
        if (!isReady) {
            return res.status(400).json({ error: 'WhatsApp client not ready' });
        }

        if (currentJob) {
            return res.status(400).json({ error: 'Another job is already in progress' });
        }

        const { 
            chatId, 
            minBatchSize = 5, 
            maxBatchSize = 30, 
            minDelay = 2, 
            maxDelay = 50 
        } = req.body;
        const images = req.files;

        if (!chatId) {
            return res.status(400).json({ error: 'Chat ID is required' });
        }

        if (!images || images.length === 0) {
            return res.status(400).json({ error: 'No images provided' });
        }

        // Format phone number
        let formattedChatId = chatId.replace(/[^0-9]/g, '');
        if (formattedChatId.startsWith('380')) {
            formattedChatId = formattedChatId;
        } else if (formattedChatId.startsWith('80')) {
            formattedChatId = '3' + formattedChatId;
        } else if (formattedChatId.startsWith('0')) {
            formattedChatId = '38' + formattedChatId;
        }
        formattedChatId += '@c.us';

        // Initialize job status
        currentJob = {
            status: 'preparing',
            progress: 0,
            total: images.length,
            aborted: false
        };

        const results = [];
        let currentIndex = 0;
        let batchNumber = 1;

        while (currentIndex < images.length && !currentJob.aborted) {
            // Generate random batch size for this iteration
            const randomBatchSize = Math.floor(Math.random() * (maxBatchSize - minBatchSize + 1)) + parseInt(minBatchSize);
            const batch = images.slice(currentIndex, currentIndex + randomBatchSize);
            
            currentJob.status = `Processing batch ${batchNumber}`;
            results.push({
                type: 'info',
                message: `Starting batch ${batchNumber} with size ${batch.length}`
            });
            
            // Send all images in the batch without delays between them
            for (const [index, image] of batch.entries()) {
                if (currentJob.aborted) {
                    results.push({
                        type: 'warning',
                        message: 'Job aborted by user'
                    });
                    break;
                }

                try {
                    currentJob.status = `Sending image ${currentIndex + index + 1} of ${images.length}`;
                    const media = MessageMedia.fromFilePath(image.path);
                    await client.sendMessage(formattedChatId, media);
                    
                    results.push({
                        type: 'success',
                        file: image.originalname,
                        success: true
                    });
                    
                    currentJob.progress = currentIndex + index + 1;
                } catch (error) {
                    console.error(`Error sending image ${image.originalname}:`, error);
                    results.push({
                        type: 'error',
                        file: image.originalname,
                        success: false,
                        error: error.message
                    });
                }
            }

            if (currentJob.aborted) break;            
            
            currentIndex += batch.length;

            // Add delay between batches (if not the last batch)
            if (currentIndex < images.length) {
                // Send a batch marker message
                await client.sendMessage(formattedChatId, `🔄 Batch ${batchNumber} completed. Starting next batch soon...`);
                
                // Random delay between batches (minDelay to maxDelay seconds)
                const batchDelay = Math.floor(Math.random() * ((maxDelay - minDelay) * 1000)) + (minDelay * 1000);
                currentJob.status = `Batch ${batchNumber} completed. Waiting ${batchDelay / 1000} seconds before next batch...`;
                results.push({
                    type: 'info',
                    message: `Batch ${batchNumber} completed. Waiting ${batchDelay / 1000} seconds before next batch...`,
                    delay: batchDelay / 1000
                });
                await new Promise(resolve => setTimeout(resolve, batchDelay));
                batchNumber++;
            }
        }

        // Clean up uploaded files
        for (const image of images) {
            fs.unlink(image.path, (err) => {
                if (err) console.error(`Error deleting file ${image.path}:`, err);
            });
        }

        currentJob = null;
        res.json({ success: true, results, aborted: currentJob?.aborted });
    } catch (error) {
        console.error('Error in send endpoint:', error);
        currentJob = null;
        res.status(500).json({ error: 'Failed to send images', details: error.message });
    }
});

// Start server and initialize WhatsApp
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    initializeWhatsApp();
}); 