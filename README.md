# Volunteer Attendance Tracker

A high-performance web application for tracking volunteer attendance at events with optimized Google Sheets integration.

## 🎉 **Latest Update - Version 2.1.0**
- ✅ **Fixed volunteer form submission issues**
- ✅ **Made email optional for volunteers**  
- ✅ **Added ID uniqueness validation**
- ✅ **Optimized sync system (5-minute intervals)**
- ✅ **Consolidated configuration settings**
- ✅ **Improved performance and reliability**

[📋 View Complete Release Notes](RELEASE_NOTES.md)

## ✨ Features

- **⚡ Fast Performance**: 74% faster sync with parallel processing
- **📱 QR Code Scanning**: Quick volunteer check-in using QR codes  
- **☁️ Google Sheets Integration**: Real-time synchronization with Google Sheets
- **📅 Event Management**: Create and manage events with date/time tracking
- **👥 Volunteer Management**: Add, edit, and track volunteer information
- **📊 Attendance Reports**: Generate detailed attendance reports
- **📱 Mobile Responsive**: Works seamlessly on desktop and mobile devices
- **🔄 Offline Support**: Works without internet connection

## 🌐 Live Environments

### Production
**URL**: https://sharadc16.github.io/volunteer-attendance-tracker/
- Optimized version for daily use
- Full volunteer database
- Production sync intervals
- High-performance sync engine

### Development  
**URL**: https://sharadc16.github.io/volunteer-attendance-tracker/dev/
- Latest features and testing
- Debug features enabled
- "DEV" badge visible

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd volunteer-attendance-tracker
   ```

2. **Set up Google Sheets API**
   - Follow the [Google Sheets Setup Guide](GOOGLE_SHEETS_SETUP_GUIDE.md)
   - Get your API key and Client ID
   - Configure the credentials in the app

3. **Deploy**
   - **Netlify**: Use the included `netlify.toml` configuration
   - **Local**: Serve the files using any web server
   - **GitHub Pages**: Enable GitHub Pages in repository settings

4. **Configure**
   - Open the app and go to Settings
   - Enter your Google Sheets API credentials
   - Set up your spreadsheet ID

## 📚 Documentation

- [📖 User Manual](USER_MANUAL.md) - Complete user guide
- [🔧 Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions
- [☁️ Google Sheets Setup](GOOGLE_SHEETS_SETUP_GUIDE.md) - API configuration guide
- [🚀 Deployment Guide](DEPLOYMENT_REFERENCE.md) - Deployment options
- [⚙️ Development Docs](docs/) - Technical documentation and performance optimizations

## 📁 Project Structure

```
volunteer-attendance-tracker/
├── index.html              # Main application (optimized)
├── settings.html           # Settings page
├── js/                     # Optimized JavaScript modules
│   ├── core/              # Core functionality
│   ├── components/        # UI components
│   ├── services/          # API and sync services
│   └── tests/             # Test suites
├── css/                   # Optimized stylesheets
├── assets/                # Images and icons
├── docs/                  # Development documentation
└── .github/               # CI/CD workflows
```

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **APIs**: Google Sheets API, Google Identity Services
- **Storage**: LocalStorage for offline capability
- **Deployment**: Netlify, GitHub Pages, or any static host
- **Performance**: Parallel processing, optimized sync algorithms

## ⚡ Performance Optimizations

The application has been extensively optimized:
- **🚀 74% faster sync** - From 76+ seconds to ~20 seconds
- **⚡ 100x faster updates** - Individual updates in ~200ms
- **🔄 Parallel processing** - Updates and downloads run concurrently
- **📱 Mobile optimized** - Responsive design for all devices
- **🔧 Error resilience** - Robust error handling and recovery

## 📊 Performance Metrics

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| **Total Sync** | 76+ seconds | ~20 seconds | **74% faster** |
| **Individual Updates** | 20+ seconds | ~200ms | **100x faster** |
| **Data Downloads** | 56+ seconds | ~20 seconds | **65% faster** |

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

## 🆘 Support

- Check the [🔧 Troubleshooting Guide](TROUBLESHOOTING.md) for common issues
- Review the [📖 User Manual](USER_MANUAL.md) for detailed instructions
- See [⚙️ Development Documentation](docs/) for technical details

## 📄 License

This project is licensed under the MIT License.