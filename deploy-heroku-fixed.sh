#!/bin/bash

# Heroku Deployment Script for NSE Option Chain Tracker
# Fixed version with proper TypeScript build

echo "🚀 Starting Heroku deployment for NSE Option Chain Tracker..."

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed. Please install it first:"
    echo "   https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if user is logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Not logged in to Heroku. Please login first:"
    echo "   heroku login"
    exit 1
fi

# Get app name from user
read -p "Enter your Heroku app name (or press Enter to create a new one): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo "📝 Creating a new Heroku app..."
    heroku create
    APP_NAME=$(heroku apps:info --json | jq -r '.name')
    echo "✅ Created app: $APP_NAME"
else
    echo "📝 Using existing app: $APP_NAME"
fi

# Set environment variables
echo "🔧 Setting up environment variables..."
echo "Please provide your Kite Connect API credentials:"

read -p "KITE_API_KEY: " KITE_API_KEY
read -p "KITE_API_SECRET: " KITE_API_SECRET

heroku config:set KITE_API_KEY="$KITE_API_KEY" --app $APP_NAME
heroku config:set KITE_API_SECRET="$KITE_API_SECRET" --app $APP_NAME
heroku config:set NODE_ENV=production --app $APP_NAME

# Optional: Google Sheets configuration
read -p "Do you want to configure Google Sheets? (y/n): " SETUP_SHEETS

if [ "$SETUP_SHEETS" = "y" ] || [ "$SETUP_SHEETS" = "Y" ]; then
    read -p "GOOGLE_SHEET_ID: " GOOGLE_SHEET_ID
    read -p "GOOGLE_SERVICE_ACCOUNT_EMAIL: " GOOGLE_SERVICE_ACCOUNT_EMAIL
    echo "Please paste your Google Private Key (press Enter twice when done):"
    GOOGLE_PRIVATE_KEY=""
    while IFS= read -r line; do
        [ -z "$line" ] && break
        GOOGLE_PRIVATE_KEY="$GOOGLE_PRIVATE_KEY$line\n"
    done
    
    heroku config:set GOOGLE_SHEET_ID="$GOOGLE_SHEET_ID" --app $APP_NAME
    heroku config:set GOOGLE_SERVICE_ACCOUNT_EMAIL="$GOOGLE_SERVICE_ACCOUNT_EMAIL" --app $APP_NAME
    heroku config:set GOOGLE_PRIVATE_KEY="$GOOGLE_PRIVATE_KEY" --app $APP_NAME
fi

# Build and deploy
echo "🔨 Building and deploying to Heroku..."
git add .
git commit -m "Deploy to Heroku with TypeScript build fixes" || echo "No changes to commit"

# Deploy to Heroku
git push heroku main || git push heroku master

# Open the app
echo "✅ Deployment complete!"
echo "🌐 Opening your app..."
heroku open --app $APP_NAME

echo "📊 Your NSE Option Chain Tracker is now live!"
echo "🔗 App URL: https://$APP_NAME.herokuapp.com"
echo "📝 To view logs: heroku logs --tail --app $APP_NAME"
echo "⚙️  To manage config: heroku config --app $APP_NAME"
