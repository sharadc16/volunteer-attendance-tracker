# Production Google Sheets Setup Guide

## Overview
This guide helps you set up the production Google Sheets for the Volunteer Attendance Tracker. The production environment is configured for maximum reliability and security.

## Environment Configuration
- **Environment**: PRODUCTION
- **Spreadsheet Name**: `Gurukul Attendance Tracker - PRODUCTION`
- **Sync Interval**: 5 minutes (300,000ms)
- **Validation Mode**: Strict (only registered volunteers)
- **Backup**: Enabled
- **Debug Features**: Disabled

## Step 1: Create Production Spreadsheet

1. **Open Google Sheets**: Go to [sheets.google.com](https://sheets.google.com)
2. **Create New Spreadsheet**: Click "Blank" to create a new spreadsheet
3. **Rename Spreadsheet**: Change the title to `Gurukul Attendance Tracker - PRODUCTION`
4. **Share Settings**: Set appropriate sharing permissions for your organization

## Step 2: Set Up Required Sheets

### Sheet 1: Volunteers
Create a sheet named "Volunteers" with the following structure:

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | ID | Unique volunteer identifier | V001 |
| B | Name | Full name of volunteer | John Smith |
| C | Committee | Committee/department | Events |
| D | Status | Active/Inactive status | Active |
| E | Email | Contact email (optional) | john@example.com |
| F | DateAdded | Date volunteer was added | 2024-01-01 |

**Sample Data:**
```
ID      Name            Committee   Status  Email               DateAdded
V001    John Smith      Events      Active  john@example.com    2024-01-01
V002    Jane Doe        Logistics   Active  jane@example.com    2024-01-02
V003    Mike Johnson    Security    Active  mike@example.com    2024-01-03
```

### Sheet 2: Events
Create a sheet named "Events" with the following structure:

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | EventID | Unique event identifier | E240101 |
| B | EventName | Name of the event | Sunday Service |
| C | Date | Event date | 2024-01-01 |
| D | Type | Event type | Recurring |
| E | Status | Active/Inactive status | Active |
| F | Description | Event description | Weekly Sunday service |

**Sample Data:**
```
EventID EventName       Date        Type        Status  Description
E240101 Sunday Service  2024-01-07  Recurring   Active  Weekly Sunday service
E240102 Special Event   2024-01-15  Special     Active  Monthly special gathering
E240103 Committee Meet  2024-01-20  Meeting     Active  Monthly committee meeting
```

### Sheet 3: Attendance
Create a sheet named "Attendance" with the following structure:

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | VolunteerID | ID of volunteer | V001 |
| B | EventID | ID of event | E240101 |
| C | DateTime | Check-in timestamp | 2024-01-01T10:00:00Z |
| D | EventName | Name of event | Sunday Service |
| E | Committee | Volunteer's committee | Events |
| F | ValidationStatus | Validation result | Valid |

**Sample Data:**
```
VolunteerID EventID DateTime                EventName       Committee   ValidationStatus
V001        E240101 2024-01-07T10:00:00Z   Sunday Service  Events      Valid
V002        E240101 2024-01-07T10:05:00Z   Sunday Service  Logistics   Valid
V003        E240102 2024-01-15T14:00:00Z   Special Event   Security    Valid
```

## Step 3: Configure Formatting

### Header Formatting
1. Select row 1 in each sheet
2. Apply bold formatting
3. Set background color to light gray (#F0F0F0)
4. Center align text

### Column Sizing
1. Auto-resize all columns to fit content
2. Set minimum width for readability

### Data Validation
1. **Status columns**: Create dropdown with "Active", "Inactive"
2. **Date columns**: Format as date (YYYY-MM-DD)
3. **DateTime columns**: Format as datetime (ISO 8601)

## Step 4: Set Up Permissions

### Production Security Settings
1. **Owner**: Set organization admin as owner
2. **Editors**: Add authorized personnel only
3. **Viewers**: Add read-only access for reporting users
4. **Link Sharing**: Disable public sharing
5. **Download/Print**: Restrict as needed

### Recommended Permissions
- **System Administrator**: Owner
- **Event Coordinators**: Editor
- **Volunteers**: No direct access (app-only)
- **Reports Team**: Viewer

## Step 5: Configure Application

### In the Volunteer Attendance Tracker:
1. Open **Settings** → **Google Sheets Integration**
2. Enter your **Google API Key**
3. Enter your **OAuth Client ID**
4. Copy the **Spreadsheet ID** from the URL
5. Paste it in the **Spreadsheet ID** field
6. Set **Environment** to **Production**
7. **Save Settings**

### Verify Configuration:
1. Check sync status indicator
2. Test volunteer registration
3. Verify attendance recording
4. Confirm data appears in sheets

## Step 6: Production Checklist

### Before Going Live:
- [ ] Spreadsheet created with correct name
- [ ] All three sheets created (Volunteers, Events, Attendance)
- [ ] Headers properly formatted
- [ ] Sample data removed (if any)
- [ ] Permissions configured correctly
- [ ] API credentials configured in app
- [ ] Sync functionality tested
- [ ] Backup procedures established

### Security Checklist:
- [ ] No public sharing enabled
- [ ] Access limited to authorized users
- [ ] API keys stored securely
- [ ] Regular permission audits scheduled
- [ ] Data retention policy defined

## Step 7: Monitoring and Maintenance

### Regular Tasks:
1. **Weekly**: Check sync status and error logs
2. **Monthly**: Review access permissions
3. **Quarterly**: Backup spreadsheet data
4. **Annually**: Rotate API credentials

### Performance Monitoring:
- Monitor sync times (should be < 30 seconds)
- Check for data consistency
- Review error rates
- Monitor storage usage

## Troubleshooting

### Common Issues:
1. **Sync Failures**: Check API quotas and permissions
2. **Missing Data**: Verify sheet names and structure
3. **Slow Performance**: Check data volume and network
4. **Permission Errors**: Review sharing settings

### Support Contacts:
- **Technical Issues**: System Administrator
- **Access Issues**: Organization Admin
- **Data Issues**: Event Coordinator

## Backup and Recovery

### Automated Backups:
- Daily exports to organization drive
- Weekly full spreadsheet copies
- Monthly archive snapshots

### Recovery Procedures:
1. Identify data loss scope
2. Restore from most recent backup
3. Verify data integrity
4. Resume normal operations
5. Document incident

---

**Important**: This is the production environment. All changes should be tested in development/testing environments first.