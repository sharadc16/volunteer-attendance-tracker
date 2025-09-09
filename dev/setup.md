# Development Setup Guide

## Local Development Environment

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.x (for local server)
- Git (for version control)

### Quick Start

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd volunteer-attendance-tracker
   ```

2. **Start local development server**
   ```bash
   # Using Python (recommended)
   python3 -m http.server 8080
   
   # Or using npm (if you have Node.js)
   npm start
   ```

3. **Open in browser**
   Navigate to `http://localhost:8080`

### Alternative Local Servers

If you don't have Python, you can use any of these alternatives:

**Node.js (if installed):**
```bash
npx http-server -p 8080
```

**PHP (if installed):**
```bash
php -S localhost:8080
```

**Live Server (VS Code Extension):**
- Install "Live Server" extension in VS Code
- Right-click on `index.html` and select "Open with Live Server"

## GitHub Repository Setup

### 1. Create GitHub Repository

1. Go to GitHub and create a new repository
2. Name it `volunteer-attendance-tracker`
3. Make it public (required for free GitHub Pages)
4. Don't initialize with README (we already have files)

### 2. Initialize Git and Push

```bash
# Initialize git repository
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit: Basic project structure and development environment"

# Add remote origin (replace with your GitHub URL)
git remote add origin https://github.com/yourusername/volunteer-attendance-tracker.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on "Settings" tab
3. Scroll down to "Pages" section
4. Under "Source", select "Deploy from a branch"
5. Select "main" branch and "/ (root)" folder
6. Click "Save"

Your app will be available at: `https://yourusername.github.io/volunteer-attendance-tracker/`

## Development Workflow

### File Structure
```
volunteer-attendance-tracker/
├── index.html              # Main application entry point
├── css/
│   └── styles.css          # Application styles
├── js/
│   ├── app.js              # Main application logic
│   ├── scanner.js          # Scanner input handling
│   ├── storage.js          # Data storage and sync
│   └── utils.js            # Utility functions
├── data/
│   └── volunteers.csv      # Sample volunteer data
├── assets/
│   └── icons/              # Application icons
├── package.json            # Project configuration
├── README.md               # Project documentation
└── .gitignore              # Git ignore rules
```

### Making Changes

1. **Edit files** using your preferred code editor
2. **Test locally** using the development server
3. **Commit changes**:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
4. **Deploy automatically** - GitHub Pages will update automatically

### Browser Developer Tools

Use browser developer tools for debugging:
- **Console**: View JavaScript logs and errors
- **Application/Storage**: Inspect IndexedDB data
- **Network**: Monitor API calls (when implemented)
- **Device Toolbar**: Test responsive design

## Testing Scanner Hardware

### USB Barcode Scanners

Most USB barcode scanners work as "keyboard wedge" devices:

1. Connect scanner to computer
2. Open the application
3. Scanner input should automatically focus
4. Scan any barcode - it should appear in the input field
5. Press Enter or wait for automatic processing

### Testing Without Scanner

You can test the application without a physical scanner:

1. Click in the scanner input field
2. Type a volunteer ID (e.g., "V001")
3. Press Enter
4. The system should process it as a scan

### Bluetooth Scanners

For Bluetooth scanners:
1. Pair the scanner with your device
2. Configure it to work in "keyboard mode"
3. Test as described above

## Troubleshooting

### Common Issues

**Application won't load:**
- Check browser console for JavaScript errors
- Ensure you're using a local server (not file:// protocol)
- Try a different browser

**Scanner not working:**
- Verify scanner is connected and recognized by OS
- Test scanner in a text editor first
- Check scanner configuration (should be in keyboard wedge mode)

**Data not saving:**
- Check browser console for IndexedDB errors
- Ensure you're not in private/incognito mode
- Try clearing browser data and reloading

**Styling issues:**
- Hard refresh (Ctrl+F5 or Cmd+Shift+R)
- Check for CSS syntax errors
- Verify file paths are correct

### Browser Compatibility

Minimum browser versions:
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

Required features:
- IndexedDB
- ES6 JavaScript
- CSS Grid
- Fetch API

## Next Steps

After completing this setup:

1. **Test the basic functionality**
2. **Customize volunteer data** in `data/volunteers.csv`
3. **Configure for your organization** (colors, branding, etc.)
4. **Set up cloud synchronization** (Google Sheets API, Firebase, etc.)
5. **Add additional features** as needed

## Support

For issues or questions:
1. Check the browser console for error messages
2. Review this setup guide
3. Check the main README.md for additional documentation
4. Create an issue on GitHub if problems persist