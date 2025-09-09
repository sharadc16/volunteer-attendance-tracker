# Volunteer Attendance Tracker

A web-based application for recording and managing volunteer attendance using physical badge scanners.

## Features

- Badge scanner integration for quick attendance recording
- Real-time attendance dashboard
- Volunteer management system
- Google Sheets integration for data storage
- Offline capability with automatic sync
- Responsive design for Chromebook and mobile devices

## Getting Started

### Local Development

1. Clone this repository
2. Open `index.html` in your browser or use a local server
3. For development with live reload, use Python's built-in server:
   ```bash
   python3 -m http.server 8080
   ```
4. Navigate to `http://localhost:8080`

### Deployment

This application is designed to be deployed to GitHub Pages for easy hosting and access.

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