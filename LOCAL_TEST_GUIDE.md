# Local Testing Guide

## How to Test Before Deploying to Main Branch

### Method 1: Using Vercel Dev (Recommended)

1. **Start the Vercel development server:**
```bash
vercel dev
```

2. **When prompted:**
- Set up and link to a new project? **N** (No)
- Link to existing project? **N** (No)
- What's your project's name? (press Enter to use default)
- In which directory is your code located? **./** (press Enter)
- Want to override settings? **N** (No)

3. **The server will start on http://localhost:3000**

4. **Test the main dashboard:**
- Open http://localhost:3000 in your browser
- Check that all data loads properly
- Open browser console (F12) and look for:
  - "Fetching FRED data via Vercel API" messages
  - "Fetching Yahoo Finance data via Vercel API" messages
  - No CORS errors

5. **Test the API endpoints directly:**
- Open http://localhost:3000/test_api_endpoints.html
- All three tests should show green checkmarks
- You can also test individual endpoints:
  - http://localhost:3000/api/fred?series=DGS10
  - http://localhost:3000/api/yahoo?symbol=AAPL
  - http://localhost:3000/api/yahoo-batch?symbols=AAPL,MSFT

### Method 2: Deploy to Preview Branch

1. **Create a preview deployment on Vercel:**
```bash
vercel
```

2. **Follow the prompts to deploy to a preview URL**
- This creates a temporary deployment URL for testing
- Share the preview URL with others for testing
- Does not affect your main production site

3. **Test the preview URL thoroughly before merging to main**

### What to Check

✅ **Dashboard Loading:**
- All economic indicators load
- All rate charts display
- Banking data appears
- Market indices update

✅ **Console Checks (F12):**
- No CORS errors
- API calls use `/api/` endpoints
- Successful data fetching messages

✅ **API Endpoint Test Page:**
- FRED API: Should show 10-Year Treasury data
- Yahoo API: Should show AAPL stock data
- Yahoo Batch: Should show AAPL, MSFT, GOOGL data

### Troubleshooting

**If data doesn't load:**
1. Check console for specific error messages
2. Verify Vercel dev server is running
3. Try refreshing the page
4. Check if APIs are accessible directly

**If you see CORS errors:**
- The fallback to CORS proxy is being used
- Check that API routes are properly set up
- Ensure you're accessing via localhost:3000, not file://

### Stop the Server

Press `Ctrl+C` to stop the Vercel dev server when done testing.