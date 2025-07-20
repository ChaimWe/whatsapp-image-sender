# WhatsApp Image Sender

A desktop application for sending multiple images to WhatsApp contacts with configurable batch sizes and delays.

## Features

- **Desktop Application**: Built with Electron for cross-platform compatibility
- **WhatsApp Integration**: Uses whatsapp-web.js for seamless WhatsApp connectivity
- **Batch Processing**: Send images in configurable batches with random or static sizes
- **Delay Management**: Add delays between batches to avoid rate limiting
- **Drag & Drop**: Easy file selection with drag and drop support
- **Folder Support**: Upload entire folders of images at once
- **Progress Tracking**: Real-time progress updates and status monitoring
- **Abort Functionality**: Cancel ongoing operations at any time

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ChaimWe/whatsapp-image-sender
cd whatsapp-image-sender
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Starting the Application

1. **Desktop App Mode** (Recommended):
```bash
npm start
```

2. **Server Mode Only**:
```bash
npm run server
```
Then open `http://localhost:4000` in your browser.

### Setup Process

1. **Launch the Application**: Start the app using one of the methods above
2. **Scan QR Code**: When the app starts, it will display a QR code
3. **Connect WhatsApp**: Scan the QR code with your WhatsApp mobile app
4. **Wait for Connection**: The app will show "WhatsApp Connected" when ready

### Sending Images

1. **Enter Phone Number**: Input the recipient's phone number with country code
2. **Configure Settings**:
   - **Batch Size**: Choose between static or random batch sizes
   - **Delay**: Set delays between batches (static or random)
3. **Select Images**: 
   - Drag and drop images or folders
   - Use the file/folder selection buttons
4. **Send**: Click "Send Images" to start the process

### Configuration Options

- **Batch Size Mode**:
  - **Static**: All batches have the same size
  - **Random**: Batch sizes vary between min and max values
- **Delay Mode**:
  - **Static**: Fixed delay between batches
  - **Random**: Variable delay between min and max values

## Security

- All vulnerabilities have been resolved using npm overrides
- Uses the latest versions of dependencies
- Secure file handling with proper cleanup

## Technical Details

### Dependencies

- **Electron**: Desktop application framework
- **whatsapp-web.js**: WhatsApp Web API integration
- **Puppeteer**: Browser automation for WhatsApp Web
- **Express**: Web server for the application
- **Multer**: File upload handling
- **QRCode**: QR code generation for authentication

### Architecture

- **Frontend**: HTML/CSS/JavaScript with modern UI
- **Backend**: Node.js with Express server
- **WhatsApp Client**: whatsapp-web.js with Puppeteer
- **Desktop**: Electron wrapper for cross-platform deployment

## Troubleshooting

### Common Issues

1. **Chrome Browser Not Found**:
   - Ensure Puppeteer is properly installed
   - The app now includes bundled Chromium

2. **QR Code Not Loading**:
   - Check your internet connection
   - Restart the application

3. **WhatsApp Connection Issues**:
   - Make sure your phone has internet
   - Try logging out and back into WhatsApp Web

4. **Image Upload Problems**:
   - Ensure images are in supported formats (JPEG, PNG, etc.)
   - Check file permissions

### Error Messages

- **"WhatsApp client not ready"**: Wait for the QR code to appear and scan it
- **"Another job is already in progress"**: Wait for the current operation to complete
- **"Chat ID is required"**: Enter a valid phone number with country code

## Development

### Building the Application

```bash
npm run build
```

This creates a distributable package for your platform.

### Project Structure

```
whatsapp-image-sender/
├── main.js              # Electron main process
├── server.js            # Express server
├── preload.js           # Electron preload script
├── package.json         # Dependencies and scripts
├── public/              # Frontend files
│   ├── index.html       # Main UI
│   └── script.js        # Frontend logic
└── whatsapp-session/    # WhatsApp session data
```

## License

ISC License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions, please check the troubleshooting section or create an issue in the repository. 