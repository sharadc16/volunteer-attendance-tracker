# Quick Start Guide - Event Day Scanning

## 🚀 Get Scanning in 5 Minutes

This guide gets you up and running for event day scanning with full connectivity validation.

---

## ⏰ 30 Minutes Before Event

### Step 1: System Startup (2 minutes)
1. **Open Browser**: Use Chrome for best performance
2. **Navigate to System**:
   - **Production**: https://attendance.gurukul.org
   - **Testing**: [Contact admin for URL]
3. **Check Environment Badge**: Verify correct environment in header
   - 🟢 **PROD** = Production (live events)
   - 🟡 **TEST** = Testing (practice/training)
   - 🟠 **DEV** = Development (testing only)

### Step 2: Connectivity Validation (3 minutes)
The system automatically validates connectivity on startup. Wait for the status dashboard:

```
┌─────────────────────────────────────────────────────────────┐
│ 🟢 PROD | Volunteer Attendance Tracker    🟢 Ready to Scan  │
├─────────────────────────────────────────────────────────────┤
│ System Status:                                              │
│ ✅ Local Storage: Available (2.3MB / 50MB used)            │
│ ✅ Cloud Sync: Connected (234ms response)                  │
│ ✅ Environment: Production (validated)                      │
│ ✅ Scanner: Ready for input                                 │
└─────────────────────────────────────────────────────────────┘
```

**✅ All Green = Ready to Scan**  
**⚠️ Yellow Warnings = Proceed with Caution**  
**❌ Red Errors = Must Fix Before Scanning**

### Step 3: Event Selection (1 minute)
1. **Check Active Event**: Look for event name in dashboard
2. **Verify Event Details**: Confirm correct date and event name
3. **Change if Needed**: Click "Change Event" if wrong event selected

### Step 4: Validation Mode Check (1 minute)
Check the validation mode indicator on the scanner card:

| Mode | When to Use | What Happens |
|------|-------------|--------------|
| 🔒 **Strict** | Corporate events, security required | Only registered volunteers accepted |
| ➕ **Create** | Community events, walk-ins expected | New volunteers can register during scanning |
| ⚠️ **No Validation** | Emergency only | Any ID accepted (use sparingly) |

**Change Mode if Needed**: Settings → Scanner Configuration → Select Mode → Save

---

## 🎯 Event Day Scanning

### Scanner Setup (1 minute)
1. **Connect Scanner**: Plug in USB scanner or pair Bluetooth
2. **Test Scanner**: Click scanner input field and test scan
3. **Focus Check**: Ensure scanner input field is highlighted/focused

### Basic Scanning Process

#### For Every Volunteer:
1. **Scan Badge**: Use scanner or type ID manually
2. **Wait for Feedback**: System shows result within 1-2 seconds
3. **Handle Result**: Follow appropriate procedure below
4. **Next Volunteer**: Scanner automatically ready for next scan

### Handling Scan Results

#### ✅ Successful Scan (All Modes)
- **Green Checkmark**: Volunteer successfully checked in
- **Name Display**: Volunteer name and committee shown
- **Continue**: Ready for next volunteer immediately

#### ❌ Failed Scan (Strict Mode Only)
- **Red X**: "Volunteer not found" error
- **Options**:
  1. **Verify ID**: Check if ID was scanned correctly
  2. **Manual Entry**: Try typing ID manually
  3. **Check Registration**: Look up volunteer in Volunteers section
  4. **Switch Mode**: Consider switching to Create Mode temporarily
  5. **Manual Backup**: Record on paper for later entry

#### ➕ New Volunteer (Create Mode Only)
- **Registration Form**: Quick form appears for unknown IDs
- **Required Info**: Name and Committee (Email optional)
- **Process**:
  1. Help volunteer fill out form
  2. Select appropriate committee
  3. Click "Register & Check In"
  4. Volunteer is now registered and checked in

#### ⚠️ Any ID Accepted (No Validation Mode)
- **Immediate Accept**: All IDs accepted without checking
- **Status**: Marked as "No Validation" for later review
- **Use Sparingly**: Only for emergencies or high-volume situations

---

## 🔧 Quick Troubleshooting

### Scanner Not Working
1. **Check Connection**: Verify USB/Bluetooth connection
2. **Click Input Field**: Ensure scanner input is focused
3. **Test Manually**: Try typing an ID with keyboard
4. **Restart Scanner**: Unplug and reconnect scanner

### Connectivity Issues
1. **Check Internet**: Verify network connection
2. **Manual Sync**: Click sync button (🔄) in navigation
3. **Continue Locally**: System works offline, syncs when connection restored
4. **Check Status**: Monitor connectivity indicators

### Validation Problems
1. **Check Mode**: Verify correct validation mode is selected
2. **Refresh Page**: Reload page and check mode again
3. **Switch Mode**: Consider switching to more permissive mode
4. **Check Database**: Verify volunteer is actually registered

### Performance Issues
1. **Close Tabs**: Close unnecessary browser tabs
2. **Restart Browser**: Fresh browser session
3. **Clear Cache**: Clear browser cache and reload
4. **Check Resources**: Monitor device CPU/memory usage

---

## 📊 Monitoring During Event

### Dashboard Indicators
- **Recent Activity**: Shows last 10 check-ins with validation status
- **Total Count**: Running total of attendees
- **Sync Status**: Last sync time and next sync countdown
- **Validation Breakdown**: Count by validation status

### Key Metrics to Watch
- **Scan Rate**: Aim for 1 scan every 10-15 seconds
- **Error Rate**: Keep validation errors under 5%
- **Sync Status**: Should sync every 2-5 minutes
- **Response Time**: Scans should process within 2 seconds

### When to Take Action
- **High Error Rate**: Consider switching validation modes
- **Slow Performance**: Close browser tabs, restart if needed
- **Sync Failures**: Check internet, try manual sync
- **Scanner Issues**: Have backup manual process ready

---

## 🏁 End of Event (5 minutes)

### Immediate Actions
1. **Final Sync**: Click sync button (🔄) to ensure all data uploaded
2. **Export Data**: Go to Reports → Export → Download CSV
3. **Check Totals**: Verify attendance numbers look correct
4. **Document Issues**: Note any problems for improvement

### Data Verification
1. **Google Sheets**: Check that data appears in Google Sheets
2. **Validation Status**: Review breakdown of validation statuses
3. **Missing Data**: Check for any obvious missing attendees
4. **Backup**: Save exported CSV file as backup

---

## 🆘 Emergency Procedures

### Complete System Failure
1. **Switch to Paper**: Use manual attendance sheets immediately
2. **Document Time**: Note exact time of system failure
3. **Continue Event**: Don't let technical issues disrupt event
4. **Contact Admin**: Notify system administrator
5. **Data Recovery**: Plan to enter manual data later

### Partial System Issues
1. **Switch Modes**: Try different validation mode
2. **Use Backup Device**: Switch to different computer/tablet
3. **Manual Entry**: Record problematic volunteers manually
4. **Continue Scanning**: Keep scanning working volunteers

---

## 📞 Quick Reference Contacts

### During Event Issues
- **System Administrator**: [Contact Info]
- **Technical Support**: [Contact Info]
- **Event Coordinator**: [Contact Info]

### After Event Support
- **Data Questions**: [Contact Info]
- **Training Requests**: [Contact Info]
- **System Improvements**: [Contact Info]

---

## 🎯 Success Checklist

### Before Event Starts
- [ ] System shows "Ready to Scan" green indicator
- [ ] Correct environment selected (PROD for live events)
- [ ] Appropriate validation mode selected
- [ ] Scanner connected and tested
- [ ] Correct event selected in dashboard
- [ ] Staff briefed on procedures

### During Event
- [ ] Scanner responding quickly (under 2 seconds)
- [ ] Validation errors under 5%
- [ ] Regular sync occurring (every 2-5 minutes)
- [ ] Dashboard showing accurate attendance counts
- [ ] Staff handling validation issues appropriately

### After Event
- [ ] Final sync completed successfully
- [ ] Attendance data exported and saved
- [ ] Google Sheets updated with all data
- [ ] Any issues documented for improvement
- [ ] Equipment properly shut down

---

## 💡 Pro Tips

### Speed Optimization
- **Keep Browser Focused**: Don't switch between applications
- **Close Unnecessary Tabs**: Reduce browser memory usage
- **Use Dedicated Device**: Use one device just for scanning
- **Pre-position Scanner**: Keep scanner in optimal position

### Accuracy Tips
- **Double-Check New Volunteers**: Verify spelling and committee
- **Monitor Validation Status**: Watch for unusual patterns
- **Regular Sync Checks**: Ensure data is backing up regularly
- **Staff Communication**: Keep all staff informed of any changes

### Backup Strategies
- **Manual List**: Keep paper backup list of expected volunteers
- **Multiple Devices**: Have backup scanning device ready
- **Export Early**: Export data partway through large events
- **Document Everything**: Note any deviations from normal process

---

**Remember**: The system is designed to work reliably, but always have a backup plan. When in doubt, prioritize keeping the event running smoothly over perfect data collection.

**Quick Help**: Press F12 → Console to see technical error messages if needed.

---

*Last Updated: January 2024 | Version 1.0*