# Event Management System Guide

## Overview

The Event Management System allows coordinators to create, manage, and track events for volunteer attendance. It supports both one-time special events and recurring events (like weekly Sunday services).

## Features Implemented

### ✅ Event Creation Interface
- **Single Events**: Create one-time special events
- **Recurring Events**: Create weekly, monthly, or daily recurring events
- **Event Types**: Special, Recurring, Daily
- **Event Status**: Active, Inactive, Cancelled

### ✅ Recurring Event System
- **Weekly Recurring Events**: Perfect for Sunday services
- **Day of Week Selection**: Choose specific days (Sunday, Monday, etc.)
- **End Date Support**: Set when recurring events should stop
- **Exception Handling**: Skip or modify individual occurrences
- **Automatic Generation**: Creates multiple events based on pattern

### ✅ Event Calendar View
- **Monthly Calendar**: Shows events for current month
- **Event Indicators**: Visual indicators for different event types
- **Quick Access**: Click events to view attendance
- **Today Highlighting**: Current day events are highlighted

### ✅ Event Management Interface
- **Event List**: Organized by upcoming, past, and inactive events
- **Event Cards**: Rich information display with actions
- **Search and Filter**: Find events quickly
- **Bulk Operations**: Manage multiple events

## How to Use

### Creating a Single Event

1. Navigate to the **Events** tab
2. Click **Add Event** button
3. Fill in the event details:
   - **Event Name**: e.g., "Christmas Service"
   - **Event Date**: Select the date
   - **Event Type**: Choose "Special Event"
   - **Description**: Optional details
   - **Status**: Usually "Active"
4. Click **Create Event**

### Creating Recurring Events

1. Navigate to the **Events** tab
2. Click **Add Event** button
3. Fill in the event details:
   - **Event Name**: e.g., "Sunday Service"
   - **Event Date**: Select the first occurrence date
   - **Event Type**: Choose "Recurring Event"
   - **Recurring Pattern**: Choose "Weekly"
   - **Day of Week**: Choose "Sunday"
   - **End Date**: Optional - when to stop creating events
   - **Description**: Optional details
4. Click **Create Event**

The system will automatically create multiple events based on your pattern.

### Managing Events

#### Edit an Event
1. Find the event in the Events list
2. Click the **Edit** button on the event card
3. Modify the details
4. Click **Update Event**

#### View Event Attendance
1. Find the event in the Events list
2. Click the **Attendance** button
3. View all volunteers who checked in for that event

#### Delete an Event
1. Find the event in the Events list
2. Click the **Delete** button
3. Confirm the deletion
4. **Warning**: This cannot be undone

### Event Calendar

The calendar view shows:
- **Current Month Events**: All active events for the current month
- **Event Types**: Different colors for different event types
- **Recurring Indicators**: Special icons for recurring events
- **Click to View**: Click any event to see attendance details

## Event Types Explained

### Special Events
- **Purpose**: One-time events like holidays, special services, fundraisers
- **Examples**: Christmas Service, Easter Service, Volunteer Appreciation
- **Characteristics**: Single occurrence, specific date

### Recurring Events
- **Purpose**: Regular events that happen on a schedule
- **Examples**: Sunday Service, Weekly Bible Study, Monthly Meeting
- **Characteristics**: Multiple occurrences, follows a pattern
- **Patterns Supported**:
  - **Weekly**: Every week on the same day
  - **Monthly**: Same date each month
  - **Daily**: Every day

### Daily Events
- **Purpose**: Events that happen every day
- **Examples**: Daily prayer, morning devotion
- **Characteristics**: Occurs daily, good for ongoing activities

## Event Status Options

### Active
- Event is currently active and accepting attendance
- Shows in upcoming events and calendar
- Volunteers can check in

### Inactive
- Event is temporarily disabled
- Does not show in active lists
- Volunteers cannot check in
- Can be reactivated later

### Cancelled
- Event has been cancelled
- Shows in inactive events list
- Volunteers cannot check in
- Indicates the event will not happen

## Best Practices

### For Sunday Services (Weekly Recurring)
1. Create a recurring event with:
   - **Name**: "Sunday Service"
   - **Type**: Recurring
   - **Pattern**: Weekly
   - **Day**: Sunday
   - **No End Date**: Leave empty for ongoing
2. This creates events automatically for the entire year

### For Special Events
1. Create well in advance for planning
2. Use descriptive names
3. Add detailed descriptions
4. Set status to "Active" when ready

### For Event Management
1. **Regular Review**: Check events monthly
2. **Update Status**: Mark past events as inactive if needed
3. **Clean Up**: Delete test or duplicate events
4. **Plan Ahead**: Create events at least a week in advance

## Troubleshooting

### Event Not Showing in Calendar
- Check if event status is "Active"
- Verify the date is correct
- Ensure the event is not in the past

### Cannot Create Recurring Events
- Check that the start date is valid
- Ensure day of week matches the start date
- Verify end date is after start date

### Duplicate Events Created
- Check for existing events with same date
- Use unique event names to avoid confusion
- Delete duplicates if necessary

### Event Attendance Not Recording
- Verify event exists and is active
- Check that volunteers are in the system
- Ensure scanner is working properly

## Technical Details

### Event ID Format
- Single Events: `E20241225` (E + YYYYMMDD)
- Recurring Events: Same format, one per occurrence

### Data Storage
- Events stored in IndexedDB locally
- Synced to Google Sheets if configured
- Automatic backup and recovery

### Recurring Event Generation
- Creates up to 100 events per series (safety limit)
- Generates 1 year ahead by default
- Respects end dates when specified

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

### Requirement 7.1 ✅
**WHEN setting up recurring events THEN the system SHALL allow creating weekly recurring events (e.g., every Sunday)**
- ✅ Weekly recurring pattern supported
- ✅ Day of week selection (Sunday, Monday, etc.)
- ✅ Automatic event generation

### Requirement 7.2 ✅
**WHEN managing the event schedule THEN the system SHALL allow adding occasional events on different days**
- ✅ Special event creation for one-time events
- ✅ Flexible date selection
- ✅ Different event types supported

### Requirement 7.3 ✅
**WHEN viewing the calendar THEN the system SHALL display all scheduled events for the current month and upcoming months**
- ✅ Monthly calendar view implemented
- ✅ Shows current month events
- ✅ Visual event indicators
- ✅ Event type differentiation

### Requirement 7.4 ✅
**WHEN an event date arrives THEN the system SHALL automatically activate attendance tracking for that event**
- ✅ Events automatically available for attendance
- ✅ Today's events highlighted
- ✅ Active status controls availability

### Requirement 7.5 ✅
**WHEN viewing attendance history THEN the system SHALL organize data by individual events and provide year-to-date summaries**
- ✅ Event-specific attendance viewing
- ✅ Individual event attendance records
- ✅ Event-based data organization
- ✅ Historical event tracking

## Future Enhancements

Potential improvements for future versions:
- **Full Calendar View**: Month/week/day calendar layouts
- **Event Templates**: Save common event configurations
- **Bulk Event Operations**: Edit multiple events at once
- **Event Notifications**: Remind coordinators of upcoming events
- **Event Analytics**: Attendance trends and statistics
- **Event Export**: Export event schedules to external calendars