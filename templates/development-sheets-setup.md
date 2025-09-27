# Development Google Sheets Setup Guide

## Overview
This guide helps you set up the development Google Sheets for the Volunteer Attendance Tracker. The development environment is configured for rapid iteration, debugging, and feature development.

## Environment Configuration
- **Environment**: DEVELOPMENT
- **Spreadsheet Name**: `Gurukul Attendance Tracker - DEVELOPMENT`
- **Sync Interval**: 1 minute (60,000ms)
- **Validation Mode**: No-validation (accepts any ID)
- **Backup**: Enabled
- **Debug Features**: Fully enabled

## Step 1: Create Development Spreadsheet

1. **Open Google Sheets**: Go to [sheets.google.com](https://sheets.google.com)
2. **Create New Spreadsheet**: Click "Blank" to create a new spreadsheet
3. **Rename Spreadsheet**: Change the title to `Gurukul Attendance Tracker - DEVELOPMENT`
4. **Share Settings**: Set development team permissions (more permissive)

## Step 2: Set Up Required Sheets

### Sheet 1: Volunteers
Create a sheet named "Volunteers" with the following structure:

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | ID | Unique volunteer identifier | D001 |
| B | Name | Full name of volunteer | Dev Volunteer 1 |
| C | Committee | Committee/department | Development |
| D | Status | Active/Inactive status | Active |
| E | Email | Contact email (optional) | dev1@example.com |
| F | DateAdded | Date volunteer was added | 2024-01-01 |

**Sample Development Data:**
```
ID      Name                Committee       Status  Email                   DateAdded
D001    Dev Volunteer 1     Development     Active  dev1@example.com        2024-01-01
D002    Dev Volunteer 2     Testing         Active  dev2@example.com        2024-01-01
D003    Scanner Test User   Events          Active  scanner@example.com     2024-01-01
D004    Debug User          Development     Active  debug@example.com       2024-01-01
D005    API Test User       Integration     Active  api@example.com         2024-01-01
D006    Mobile Test User    Mobile          Active  mobile@example.com      2024-01-01
D007    Performance User    Performance     Active  perf@example.com        2024-01-01
D008    Edge Case User      EdgeCases       Active  edge@example.com        2024-01-01
```

### Sheet 2: Events
Create a sheet named "Events" with the following structure:

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | EventID | Unique event identifier | D240101 |
| B | EventName | Name of the event | Dev Test Event |
| C | Date | Event date | 2024-01-01 |
| D | Type | Event type | Special |
| E | Status | Active/Inactive status | Active |
| F | Description | Event description | Development testing event |

**Sample Development Data:**
```
EventID EventName               Date        Type        Status  Description
D240101 Dev Test Event          2024-01-01  Special     Active  Development testing event
D240102 Scanner Test            2024-01-02  Testing     Active  QR scanner validation test
D240103 Sync Test Event         2024-01-03  Recurring   Active  Sync functionality test
D240104 API Integration Test    2024-01-04  Integration Active  API testing event
D240105 Mobile Test Event       2024-01-05  Mobile      Active  Mobile interface testing
D240106 Performance Test        2024-01-06  Performance Active  Load and performance testing
D240107 Debug Session          2024-01-07  Debug       Active  Debugging and troubleshooting
D240108 Feature Demo           2024-01-08  Demo        Active  New feature demonstration
```

### Sheet 3: Attendance
Create a sheet named "Attendance" with the following structure:

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | VolunteerID | ID of volunteer | D001 |
| B | EventID | ID of event | D240101 |
| C | DateTime | Check-in timestamp | 2024-01-01T10:00:00Z |
| D | EventName | Name of event | Dev Test Event |
| E | Committee | Volunteer's committee | Development |
| F | ValidationStatus | Validation result | Valid |

**Sample Development Data:**
```
VolunteerID EventID DateTime                EventName               Committee       ValidationStatus
D001        D240101 2024-01-01T10:00:00Z   Dev Test Event          Development     Valid
D002        D240102 2024-01-02T11:00:00Z   Scanner Test            Testing         Valid
D003        D240103 2024-01-03T12:00:00Z   Sync Test Event         Events          Valid
D004        D240104 2024-01-04T13:00:00Z   API Integration Test    Development     Valid
D005        D240105 2024-01-05T14:00:00Z   Mobile Test Event       Integration     Valid
D006        D240106 2024-01-06T15:00:00Z   Performance Test        Mobile          Valid
D007        D240107 2024-01-07T16:00:00Z   Debug Session           Performance     Valid
D008        D240108 2024-01-08T17:00:00Z   Feature Demo            EdgeCases       Created
```

## Step 3: Set Up Development-Specific Sheets

### Sheet 4: Debug_Log
For tracking development issues and debugging information:

```
Timestamp               Level   Component       Message                         Details
2024-01-01T10:00:00Z   INFO    Scanner         QR code scanned successfully    ID: D001
2024-01-01T10:01:00Z   DEBUG   Sync            Starting sync process           Interval: 60s
2024-01-01T10:02:00Z   WARN    Validation      Unknown volunteer ID            ID: UNKNOWN123
2024-01-01T10:03:00Z   ERROR   API             Google Sheets API error         Rate limit exceeded
```

### Sheet 5: Feature_Flags
For managing development features:

```
FeatureName             Status      Description                     LastModified
NewScannerUI           Enabled     Updated scanner interface       2024-01-01
AdvancedReporting      Disabled    Enhanced reporting features     2024-01-01
OfflineMode            Testing     Offline functionality           2024-01-01
MobileOptimization     Enabled     Mobile-specific improvements    2024-01-01
```

### Sheet 6: Performance_Metrics
For tracking development performance:

```
Timestamp               Operation       Duration_ms     Memory_MB       Notes
2024-01-01T10:00:00Z   Sync_Download   1250           45              Normal operation
2024-01-01T10:01:00Z   Volunteer_Add   150            47              Quick response
2024-01-01T10:02:00Z   QR_Scan         75             46              Fast scan
2024-01-01T10:03:00Z   Data_Export     3200           52              Large dataset
```

## Step 4: Configure Development Environment

### In the Volunteer Attendance Tracker:
1. Open **Settings** → **Google Sheets Integration**
2. Enter your **Development API Key** (separate from production/testing)
3. Enter your **Development OAuth Client ID**
4. Copy the **Development Spreadsheet ID** from the URL
5. Paste it in the **Spreadsheet ID** field
6. Set **Environment** to **Development**
7. Enable **All Debug Features**
8. Set **Validation Mode** to **No-validation**
9. Set **Sync Interval** to **1 minute**
10. **Save Settings**

### Development Configuration:
- **Sync Interval**: 1 minute (fastest for development)
- **Validation Mode**: No-validation (accepts any input)
- **Debug Logging**: Maximum verbosity
- **Performance Monitoring**: Detailed metrics
- **Test File Access**: Full access
- **Feature Flags**: All experimental features enabled

## Step 5: Development Tools Setup

### Browser Developer Tools:
1. **Console Logging**: Enable verbose logging
2. **Network Monitoring**: Track API calls
3. **Performance Profiling**: Monitor resource usage
4. **Local Storage**: Inspect stored data

### Development Extensions:
- **Google Sheets API Explorer**: Test API calls
- **JSON Formatter**: Format API responses
- **Network Throttling**: Test slow connections
- **Mobile Simulator**: Test responsive design

## Step 6: Development Workflows

### Feature Development Cycle:
1. **Create Feature Branch**: `git checkout -b feature/new-scanner`
2. **Update Development Data**: Add test scenarios
3. **Implement Feature**: Code and test locally
4. **Test with Dev Sheets**: Validate functionality
5. **Debug and Iterate**: Use debug tools
6. **Document Changes**: Update development notes

### Testing Workflows:
1. **Unit Testing**: Test individual components
2. **Integration Testing**: Test with Google Sheets
3. **Manual Testing**: Interactive testing
4. **Performance Testing**: Monitor metrics
5. **Cross-Browser Testing**: Multiple browsers

### Debugging Workflows:
1. **Enable Debug Mode**: Maximum logging
2. **Reproduce Issue**: Use development data
3. **Analyze Logs**: Check debug sheet
4. **Fix and Test**: Implement solution
5. **Verify Fix**: Confirm resolution

## Step 7: Development Data Management

### Data Categories:
1. **Happy Path Data**: Normal successful scenarios
2. **Edge Case Data**: Boundary conditions
3. **Error Case Data**: Invalid inputs
4. **Performance Data**: Large datasets
5. **Mobile Data**: Mobile-specific scenarios

### Data Refresh Procedures:
1. **Daily Reset**: Clear attendance data
2. **Weekly Refresh**: Update volunteer data
3. **Monthly Cleanup**: Archive old debug logs
4. **Feature Reset**: Reset for new features

## Step 8: API Development and Testing

### Google Sheets API Testing:
- **Authentication**: Test OAuth flow
- **Read Operations**: Test data retrieval
- **Write Operations**: Test data updates
- **Batch Operations**: Test bulk updates
- **Error Handling**: Test API failures

### API Rate Limiting:
- Monitor API usage quotas
- Implement retry logic
- Test rate limit handling
- Optimize API calls

## Step 9: Performance Development

### Performance Monitoring:
- **Sync Performance**: Track sync times
- **UI Responsiveness**: Monitor UI updates
- **Memory Usage**: Track memory consumption
- **Network Usage**: Monitor data transfer

### Optimization Testing:
- **Batch Processing**: Test bulk operations
- **Caching**: Test data caching
- **Lazy Loading**: Test on-demand loading
- **Compression**: Test data compression

## Step 10: Mobile Development

### Mobile Testing Setup:
- **Device Simulation**: Browser dev tools
- **Real Device Testing**: Physical devices
- **Touch Interactions**: Test touch events
- **Responsive Design**: Test different sizes

### Mobile-Specific Data:
- Touch-friendly volunteer IDs
- Mobile-optimized event names
- Quick-scan test scenarios
- Offline mode test data

## Step 11: Collaboration and Documentation

### Development Documentation:
- **Feature Specifications**: Document new features
- **API Documentation**: Document API changes
- **Testing Procedures**: Document test cases
- **Deployment Notes**: Document deployment steps

### Team Collaboration:
- **Shared Development Sheets**: Team access
- **Code Reviews**: Review development changes
- **Feature Demos**: Demonstrate new features
- **Knowledge Sharing**: Share development insights

## Step 12: Development Security

### Security Considerations:
- **API Key Management**: Separate dev keys
- **Data Privacy**: Use fake data only
- **Access Control**: Limit development access
- **Audit Logging**: Track development activities

### Development Best Practices:
- Never use production data in development
- Use separate API credentials
- Implement proper error handling
- Document security considerations

## Troubleshooting Development Issues

### Common Development Problems:
1. **API Quota Exceeded**: Use development quotas
2. **Sync Conflicts**: Clear local storage
3. **Browser Caching**: Hard refresh (Ctrl+F5)
4. **CORS Issues**: Check API configuration

### Debug Tools and Techniques:
- **Console Logging**: `console.log()` statements
- **Breakpoints**: Browser debugger
- **Network Tab**: Monitor API calls
- **Performance Tab**: Profile performance
- **Application Tab**: Inspect storage

### Development Environment Reset:
1. Clear browser cache and storage
2. Reset development spreadsheet data
3. Restart development server
4. Verify API credentials
5. Test basic functionality

---

**Note**: This is the development environment. All data here is for development purposes only. Never use production data or credentials in development.