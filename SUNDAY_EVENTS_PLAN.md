# Sunday Events Creation Plan

## Overview
Creating Sunday events from **September 7, 2025** to **May 16, 2026** for the school year.

## Date Range
- **Start Date**: September 7, 2025 (Sunday)
- **End Date**: May 16, 2026 (Saturday - last Sunday will be May 11, 2026)
- **Total Weeks**: ~36 weeks

## Excluded Dates (No Events)
The following Sunday dates will be **skipped** due to holidays and breaks:
- **November 30, 2025** - Thanksgiving weekend
- **December 21, 2025** - Winter break start
- **December 28, 2025** - Winter break
- **February 15, 2026** - Presidents Day weekend
- **April 12, 2026** - Easter/Spring break

## Expected Events Count
- **Total Sundays in range**: ~36
- **Excluded Sundays**: 5
- **Events to create**: ~31

## Event Details
Each event will have:
- **Event ID**: E20250907, E20250914, etc. (EYYYYMMDD format)
- **Event Name**: "Regular Class"
- **Type**: Recurring
- **Status**: Active
- **Day of Week**: Sunday
- **Recurring Pattern**: Weekly
- **Description**: "Weekly Regular Class - Volunteer Attendance Tracking"

## How to Create Events

### Option 1: Use the Interactive Interface
1. Open `create-sunday-events-interface.html`
2. Click "Generate Events Preview" to see all events
3. Click "Save All Events" to create them in the database
4. Monitor progress and view results

### Option 2: Use the Script Directly
1. Open browser console on any page with the app loaded
2. Run: `createSundayEvents()`
3. Wait for completion message
4. Optionally run: `verifySundayEvents()` to verify

### Option 3: Use the Existing Script
1. The `create-sunday-events.js` file is already loaded
2. Run `createSundayEvents()` in the console
3. Use `verifySundayEvents()` to check results
4. Use `cleanupSundayEvents()` if you need to start over

## Sample Events That Will Be Created

### September 2025
- Sep 7, 2025 - Regular Class
- Sep 14, 2025 - Regular Class
- Sep 21, 2025 - Regular Class
- Sep 28, 2025 - Regular Class

### October 2025
- Oct 5, 2025 - Regular Class
- Oct 12, 2025 - Regular Class
- Oct 19, 2025 - Regular Class
- Oct 26, 2025 - Regular Class

### November 2025
- Nov 2, 2025 - Regular Class
- Nov 9, 2025 - Regular Class
- Nov 16, 2025 - Regular Class
- Nov 23, 2025 - Regular Class
- ~~Nov 30, 2025~~ - **EXCLUDED** (Thanksgiving)

### December 2025
- Dec 7, 2025 - Regular Class
- Dec 14, 2025 - Regular Class
- ~~Dec 21, 2025~~ - **EXCLUDED** (Winter break)
- ~~Dec 28, 2025~~ - **EXCLUDED** (Winter break)

### January 2026
- Jan 4, 2026 - Regular Class
- Jan 11, 2026 - Regular Class
- Jan 18, 2026 - Regular Class
- Jan 25, 2026 - Regular Class

### February 2026
- Feb 1, 2026 - Regular Class
- Feb 8, 2026 - Regular Class
- ~~Feb 15, 2026~~ - **EXCLUDED** (Presidents Day)
- Feb 22, 2026 - Regular Class

### March 2026
- Mar 1, 2026 - Regular Class
- Mar 8, 2026 - Regular Class
- Mar 15, 2026 - Regular Class
- Mar 22, 2026 - Regular Class
- Mar 29, 2026 - Regular Class

### April 2026
- Apr 5, 2026 - Regular Class
- ~~Apr 12, 2026~~ - **EXCLUDED** (Easter/Spring break)
- Apr 19, 2026 - Regular Class
- Apr 26, 2026 - Regular Class

### May 2026
- May 3, 2026 - Regular Class
- May 10, 2026 - Regular Class
- (May 16 is Saturday, so last Sunday is May 10)

## Verification Steps

After creating events, verify by:

1. **Check Total Count**: Should have ~31 events
2. **Check Date Range**: First event Sep 7, 2025, last around May 10, 2026
3. **Check Exclusions**: No events on the 5 excluded dates
4. **Check Event Details**: All should be "Regular Class", "Recurring", "Active"

## Troubleshooting

### If Events Already Exist
- The script will skip existing events
- Check console for "already exists" messages
- Use `cleanupSundayEvents()` to remove all and start fresh

### If Some Events Fail to Create
- Check console for error messages
- Verify StorageManager is initialized
- Try creating events one by one for debugging

### If Wrong Date Range
- Modify the `startDate` and `endDate` in the script
- Update the `exceptionDates` array if needed
- Re-run the creation script

## Files Involved

1. **`create-sunday-events.js`** - Main script (already updated)
2. **`create-sunday-events-2025-2026.js`** - Comprehensive event creator
3. **`create-sunday-events-interface.html`** - Interactive interface
4. **`SUNDAY_EVENTS_PLAN.md`** - This documentation

## Next Steps

1. **Choose your preferred method** (interface, script, or console)
2. **Create the events** using your chosen method
3. **Verify the results** using the verification functions
4. **Test scanning** with one of the created events

The events will be ready for volunteer badge scanning once created!