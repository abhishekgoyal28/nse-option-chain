#!/bin/bash

# Heroku Deployment Script
# Make sure you have Heroku CLI installed

set -e

echo "🚀 Deploying NSE Tracker to Heroku..."

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not found. Please install it first:"
    echo "https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Login to Heroku (if not already logged in)
heroku auth:whoami || heroku login

# Create Heroku app (replace 'your-app-name' with desired name)
read -p "Enter your Heroku app name: " APP_NAME
heroku create $APP_NAME

# Set environment variables
echo "Setting environment variables..."
read -p "Enter your Kite API Key: " KITE_API_KEY
read -s -p "Enter your Kite API Secret: " KITE_API_SECRET
echo

heroku config:set KITE_API_KEY=$KITE_API_KEY --app $APP_NAME
heroku config:set KITE_API_SECRET=$KITE_API_SECRET --app $APP_NAME
heroku config:set NODE_ENV=production --app $APP_NAME

# Deploy
git add .
git commit -m "Deploy to Heroku" || echo "No changes to commit"
git push heroku main

echo "✅ Deployment completed!"
echo "🌐 Your app is available at: https://$APP_NAME.herokuapp.com"
