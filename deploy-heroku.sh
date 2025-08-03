#!/bin/bash

# Simple Heroku Deployment Script for NSE Tracker
set -e

echo "🚀 Deploying NSE Tracker to Heroku..."

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew tap heroku/brew && brew install heroku
        else
            echo "Please install Homebrew first: https://brew.sh"
            exit 1
        fi
    else
        echo "Please install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli"
        exit 1
    fi
fi

# Login to Heroku (if not already logged in)
echo "🔐 Checking Heroku authentication..."
if ! heroku auth:whoami &> /dev/null; then
    echo "Please login to Heroku:"
    heroku login
fi

# Get app name from user
echo "📝 App Configuration"
read -p "Enter your Heroku app name (or press Enter for auto-generated): " APP_NAME

# Create Heroku app
if [ -z "$APP_NAME" ]; then
    echo "🏗️  Creating Heroku app with auto-generated name..."
    APP_INFO=$(heroku create --json)
    APP_NAME=$(echo $APP_INFO | grep -o '"name":"[^"]*' | cut -d'"' -f4)
    APP_URL=$(echo $APP_INFO | grep -o '"web_url":"[^"]*' | cut -d'"' -f4)
else
    echo "🏗️  Creating Heroku app: $APP_NAME"
    heroku create $APP_NAME
    APP_URL="https://$APP_NAME.herokuapp.com"
fi

echo "✅ App created: $APP_NAME"
echo "🌐 URL: $APP_URL"

# Set environment variables
echo "🔐 Setting up environment variables..."
echo "Please provide your Kite Connect API credentials:"

read -p "Enter your Kite API Key: " KITE_API_KEY
read -s -p "Enter your Kite API Secret: " KITE_API_SECRET
echo

if [ -z "$KITE_API_KEY" ] || [ -z "$KITE_API_SECRET" ]; then
    echo "❌ API credentials are required!"
    exit 1
fi

# Set config vars
heroku config:set KITE_API_KEY="$KITE_API_KEY" --app $APP_NAME
heroku config:set KITE_API_SECRET="$KITE_API_SECRET" --app $APP_NAME
heroku config:set NODE_ENV=production --app $APP_NAME

echo "✅ Environment variables set"

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for Heroku deployment"
fi

# Add Heroku remote
heroku git:remote -a $APP_NAME

# Deploy
echo "🚀 Deploying to Heroku..."
git add .
git commit -m "Deploy to Heroku" || echo "No changes to commit"
git push heroku main || git push heroku master

# Open the app
echo "
🎉 Deployment completed successfully!

📋 App Details:
   App Name: $APP_NAME
   URL: $APP_URL
   
🔗 Quick Links:
   - Application: $APP_URL
   - Health Check: $APP_URL/api/health
   - Heroku Dashboard: https://dashboard.heroku.com/apps/$APP_NAME
   - Logs: heroku logs --tail --app $APP_NAME

🔧 Management Commands:
   - View logs: heroku logs --tail --app $APP_NAME
   - Restart app: heroku restart --app $APP_NAME
   - Open app: heroku open --app $APP_NAME
   - Scale dynos: heroku ps:scale web=1 --app $APP_NAME

💰 Pricing:
   - Free tier: 550 dyno hours/month
   - Eco dyno: \$5/month (never sleeps)
   - Basic dyno: \$7/month (custom domains)

📊 Next Steps:
   1. Check if your app is running: $APP_URL/api/health
   2. Test the data endpoint: $APP_URL/api/nifty-data
   3. Monitor logs: heroku logs --tail --app $APP_NAME
   4. Set up custom domain (optional)

⚠️  Important Notes:
   - Free dynos sleep after 30 minutes of inactivity
   - Consider upgrading to Eco dyno (\$5/month) for production
   - Heroku filesystem is ephemeral (files are lost on restart)
   - Historical data will be lost on dyno restart
"

# Ask if user wants to open the app
read -p "Would you like to open the app in your browser? (y/n): " OPEN_APP
if [[ $OPEN_APP =~ ^[Yy]$ ]]; then
    heroku open --app $APP_NAME
fi

echo "🎊 Happy trading with your NSE Tracker!"
