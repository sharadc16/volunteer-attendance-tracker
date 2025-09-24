# Saved Settings Override Fix

## 🚨 **Issue Identified**

The settings form still shows **60 seconds** instead of the new **300 seconds (5 minutes)** default because:

**Saved settings in localStorage are overriding the new defaults!**

## 🔍 **Root Cause Analysis**

### **The Problem:**
1. **Old settings saved** - User's browser has saved settings with `sync.interval: 60000`
2. **Config loading** - `ConfigManager.loadConfig()` loads saved settings from localStorage
3. **Override behavior** - `Object.assign(Config.sync, savedConfig.sync)` overwrites new defaults
4. **Form displays old value** - `${Config.sync.interval / 1000}` shows 60 instead of 300

### **Code Flow:**
```javascript
// 1. New default set in config.js
Config.sync.interval = 300000; // 5 minutes

// 2. App loads saved settings
ConfigManager.loadConfig() // Loads old saved settings

// 3. Saved settings override new defaults
Object.assign(Config.sync, savedConfig.sync); // savedConfig.sync.interval = 60000

// 4. Form shows old value
value="${Config.sync.interval / 1000}" // Shows 60 instead of 300
```

## ✅ **Fix Applied**

### **1. Migration Logic Added**
Added automatic migration in `ConfigManager.loadConfig()`:

```javascript
// Migrate old sync interval values to new default if needed
if (savedConfig.sync && savedConfig.sync.interval && savedConfig.sync.interval < 120000) {
  console.log(`Migrating old sync interval ${savedConfig.sync.interval}ms to new default 300000ms`);
  savedConfig.sync.interval = 300000; // Update to new 5-minute default
}

// Remove deprecated googleSheets.syncInterval if it exists
if (savedConfig.googleSheets && savedConfig.googleSheets.syncInterval) {
  console.log('Removing deprecated googleSheets.syncInterval');
  delete savedConfig.googleSheets.syncInterval;
}
```

### **2. Settings Clear Tool Created**
Created `clear-saved-settings.html` to help users:
- **Check current saved settings** - See what's in localStorage
- **Clear saved settings** - Remove old configurations
- **Show new defaults** - Display new recommended values

## 🔧 **Technical Details**

### **Files Modified:**
- `js/core/config-manager.js` - Added migration logic for old settings

### **Files Created:**
- `clear-saved-settings.html` - Tool to clear saved settings

### **Migration Logic:**
```javascript
// Automatic migration criteria:
if (savedConfig.sync.interval < 120000) { // Less than 2 minutes
  savedConfig.sync.interval = 300000;     // Update to 5 minutes
}
```

### **Storage Keys Checked:**
- `vat_settings` - Main settings storage key
- `config` - Alternative config storage
- `volunteer_attendance_settings` - Legacy storage key

## 🧪 **How to Fix Your Current Issue**

### **Option 1: Use the Clear Tool (Recommended)**
1. **Open** `clear-saved-settings.html` in your browser
2. **Click "Check Current Settings"** - See your saved settings
3. **Click "Clear Saved Settings"** - Remove old configuration
4. **Refresh settings page** - Should now show 300 seconds

### **Option 2: Manual Browser Clear**
1. **Open browser DevTools** (F12)
2. **Go to Application/Storage tab**
3. **Find localStorage** for your domain
4. **Delete** `vat_settings` key
5. **Refresh settings page**

### **Option 3: Wait for Migration**
The migration logic will automatically update old values < 2 minutes to 5 minutes on next app load.

## 📊 **Expected Results**

### **After Fix:**
- ✅ **Settings form shows 300 seconds** (5 minutes)
- ✅ **New users get 5-minute default** automatically
- ✅ **Existing users migrated** from old values
- ✅ **No manual intervention needed** for most users

### **Migration Behavior:**
- **Old intervals < 2 minutes** → Automatically updated to 5 minutes
- **Old intervals ≥ 2 minutes** → Kept as-is (user customization)
- **Deprecated googleSheets.syncInterval** → Automatically removed

## 🎯 **Prevention**

### **For Future Updates:**
1. **Always consider saved settings** when changing defaults
2. **Add migration logic** for breaking changes
3. **Provide clear tools** for users to reset settings
4. **Test with existing saved data** not just fresh installs

### **Migration Best Practices:**
```javascript
// Good: Migrate old values to new defaults
if (oldValue < newMinimum) {
  newValue = newRecommendedDefault;
}

// Bad: Just override without considering user data
Object.assign(Config, savedConfig); // Can break with new defaults
```

## 🚀 **Additional Benefits**

### **Automatic Migration:**
- **Seamless upgrade** - Users don't need to manually update
- **Preserves customization** - Only updates problematic values
- **Backward compatibility** - Handles old configuration formats

### **User Tools:**
- **Diagnostic capability** - Users can see what's saved
- **Easy reset option** - Clear settings without technical knowledge
- **Educational** - Shows new recommended values

## 🎉 **Summary**

The issue was **saved settings overriding new defaults**. The fix includes:

1. **Automatic migration** - Updates old sync intervals to new 5-minute default
2. **Clear tool** - Allows users to reset settings manually
3. **Deprecation cleanup** - Removes old googleSheets.syncInterval

**Your settings form should now show 300 seconds after using the clear tool or waiting for the migration to run!** 🎊