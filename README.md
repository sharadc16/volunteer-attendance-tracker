# Volunteer Attendance Tracker

A web-based application for recording and managing volunteer attendance using physical badge scanners.

## Features

- Badge scanner integration for quick attendance recording
- Real-time attendance dashboard
- Volunteer management system
- Google Sheets integration for data storage
- Offline capability with automatic sync
- Responsive design for Chromebook and mobile devices

## 🌐 Live Environments

### Production
**URL**: https://sharadc16.github.io/volunteer-attendance-tracker/
- Stable version for daily use
- Full volunteer database (20 sample volunteers)
- Production sync intervals
- No debug features

### Development  
**URL**: https://sharadc16.github.io/volunteer-attendance-tracker/dev/
- Latest features and testing
- Smaller volunteer database (5 sample volunteers)
- Faster sync intervals for testing
- Debug features enabled
- "DEV" badge visible

## 🚀 Development Workflow

### Making Changes
1. **Work on dev branch**:
   ```bash
   git checkout dev
   # Make your changes
   git add .
   git commit -m "Add new feature"
   git push origin dev
   ```

2. **Test on dev environment**:
   - Visit: https://sharadc16.github.io/volunteer-attendance-tracker/dev/
   - Test all functionality thoroughly
   - Check browser console for errors

3. **Deploy to production**:
   ```bash
   git checkout main
   git merge dev
   git push origin main
   ```

### Local Development

1. Clone this repository
2. Switch to dev branch: `git checkout dev`
3. Open `index.html` in your browser or use a local server:
   ```bash
   python3 -m http.server 8080
   ```
4. Navigate to `http://localhost:8080`

### Environment Detection

The app automatically detects the environment:
- **Development**: localhost, dev branch, or `?env=dev` parameter
- **Production**: GitHub Pages main branch

## Project Structure

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
└── assets/
    └── icons/              # Application icons and images
```

## Requirements

- Modern web browser with JavaScript enabled
- USB or Bluetooth badge scanner (optional for testing)
- Internet connection for Google Sheets integration

## License

MIT License