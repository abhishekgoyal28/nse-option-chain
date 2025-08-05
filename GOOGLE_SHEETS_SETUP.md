# Google Sheets Integration Setup Guide

This guide will help you set up Google Sheets as the primary storage for your NSE Option Chain Tracker, ensuring your historical data persists across Heroku deployments.

## 🎯 Benefits

- **Persistent Storage**: Data survives Heroku deployments and dyno restarts
- **Free**: No additional costs beyond your existing Heroku plan
- **Visual Interface**: View and analyze data directly in Google Sheets
- **Backup**: Google handles backups automatically
- **Sharing**: Easy to share data with team members
- **Fallback**: Excel storage continues to work as backup

## 📋 Prerequisites

- Google account
- Google Cloud Console access
- Your NSE tracker deployed on Heroku

## 🚀 Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `nse-option-tracker`
4. Click "Create"

### Step 2: Enable Google Sheets API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on it and press "Enable"

### Step 3: Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Enter details:
   - **Service account name**: `nse-tracker-service`
   - **Service account ID**: `nse-tracker-service` (auto-filled)
   - **Description**: `Service account for NSE Option Chain Tracker`
4. Click "Create and Continue"
5. Skip role assignment (click "Continue")
6. Skip user access (click "Done")

### Step 4: Generate Service Account Key

1. Click on the created service account (`nse-tracker-service`)
2. Go to the "Keys" tab
3. Click "Add Key" → "Create New Key"
4. Select "JSON" format
5. Click "Create"
6. **Save the downloaded JSON file securely** - you'll need it later

### Step 5: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/)
2. Click "Blank" to create a new sheet
3. Rename it to: `NSE NIFTY Option Chain Tracker`
4. Copy the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
   ```
   The SHEET_ID is the long string between `/d/` and `/edit`

### Step 6: Share Sheet with Service Account

1. In your Google Sheet, click the "Share" button (top right)
2. Add the service account email from your JSON file:
   - It looks like: `nse-tracker-service@your-project.iam.gserviceaccount.com`
3. Set permission to "Editor"
4. Uncheck "Notify people" 
5. Click "Share"

### Step 7: Configure Heroku Environment Variables

1. Open your downloaded JSON file and extract these values:
   - `client_email` → This is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → This is your `GOOGLE_PRIVATE_KEY`

2. Set Heroku config vars:
   ```bash
   heroku config:set GOOGLE_SHEET_ID="your_sheet_id_here"
   heroku config:set GOOGLE_SERVICE_ACCOUNT_EMAIL="nse-tracker-service@your-project.iam.gserviceaccount.com"
   heroku config:set GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
   MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
   -----END PRIVATE KEY-----"
   ```

   **Important**: For the private key, include the entire key with line breaks. You can also set it through the Heroku dashboard for easier formatting.

### Step 8: Deploy and Test

1. Deploy your updated code to Heroku:
   ```bash
   git add .
   git commit -m "Add Google Sheets integration"
   git push heroku main
   ```

2. Check the health endpoint to verify Google Sheets connection:
   ```bash
   curl https://your-app.herokuapp.com/api/health
   ```

3. Look for the `google_sheets` section in the response:
   ```json
   {
     "google_sheets": {
       "available": true,
       "sheetTitle": "NSE NIFTY Option Chain Tracker",
       "mainSheetRows": 0,
       "summarySheetRows": 0
     }
   }
   ```

## 📊 New API Endpoints

Once configured, you'll have access to these new endpoints:

- `GET /api/sheets-status` - Google Sheets connection status
- `GET /api/sheets-historical-data` - Historical data from Google Sheets
- `GET /api/sheets-daily-summary` - Daily summary data

## 🔍 Verification

### Check Logs
```bash
heroku logs --tail
```

Look for these success messages:
- `✅ Google Sheets authenticated successfully`
- `📊 Connected to sheet: NSE NIFTY Option Chain Tracker`
- `✅ Saved X records to Google Sheets`

### Check Your Google Sheet
After the market opens and data starts flowing, you should see:
1. **NIFTY_History** sheet with real-time option chain data
2. **Daily_Summary** sheet with daily statistics

## 🛠️ Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify the service account email is correct
   - Check that the private key includes `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
   - Ensure the sheet is shared with the service account email

2. **Sheet Not Found**
   - Verify the GOOGLE_SHEET_ID is correct
   - Make sure the sheet is shared with the service account

3. **Rate Limits**
   - Google Sheets API has limits: 300 requests per minute
   - The app handles this with batching and delays

### Fallback Behavior

If Google Sheets fails:
- The app automatically falls back to Excel storage
- No data is lost
- Check `/api/health` to see current storage status

## 📈 Data Structure

### NIFTY_History Sheet Columns
- Timestamp, Date, Time
- Strike_Price, Call_OI, Put_OI
- Call_Volume, Put_Volume
- Call_LTP, Put_LTP, Call_Change, Put_Change
- Call_Bid, Call_Ask, Put_Bid, Put_Ask
- PCR_OI, PCR_Volume
- Underlying_Price, Market_Status

### Daily_Summary Sheet Columns
- Date, Total_Records
- Max_Call_OI_Strike, Max_Call_OI_Value
- Max_Put_OI_Strike, Max_Put_OI_Value
- PCR_OI_Average, PCR_Volume_Average
- Most_Active_Strike
- Total_Call_Volume, Total_Put_Volume
- Underlying_High, Underlying_Low

## 🔐 Security Notes

- Keep your service account JSON file secure
- Never commit the JSON file to your repository
- Use Heroku config vars for sensitive data
- The service account only has access to the specific sheet you shared

## 🎉 Success!

Once set up, your NSE Option Chain Tracker will:
- Save all data to Google Sheets during market hours
- Maintain Excel backup locally
- Persist data across all Heroku deployments
- Provide real-time data visualization in Google Sheets

Your historical data is now safe and accessible from anywhere! 🚀
