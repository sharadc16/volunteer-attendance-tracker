# Run Development Server Locally

## Quick Start

### Option 1: Python HTTP Server
```bash
cd volunteer-attendance-tracker
python3 -m http.server 8080
```
Then open: http://localhost:8080

### Option 2: Node.js HTTP Server
```bash
cd volunteer-attendance-tracker
npx http-server -p 8080 -c-1
```
Then open: http://localhost:8080

### Option 3: PHP Server (if available)
```bash
cd volunteer-attendance-tracker
php -S localhost:8080
```
Then open: http://localhost:8080

## Development Features

When running locally from the dev branch, you'll have:
- ✅ All latest fixes (volunteer forms, sync optimization)
- ✅ Debug tools and test files
- ✅ Development console logging
- ✅ All new features from v2.1.0

## Testing Your Changes

1. **Test volunteer addition** - Forms should work properly now
2. **Check sync settings** - Should default to 300 seconds (5 minutes)
3. **Verify email optional** - Can add volunteers without email
4. **Test ID uniqueness** - Duplicate IDs should be prevented