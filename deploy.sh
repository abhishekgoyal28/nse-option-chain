#!/bin/bash

echo "🚀 Deploying NSE Option Chain Tracker to Heroku..."

# Add all changes
git add .

# Commit changes
echo "📝 Committing changes..."
git commit -m "Revert to client-side credential input for Kite Connect authentication"

# Push to Heroku
echo "🚀 Pushing to Heroku..."
git push heroku main

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Visit your deployed app"
echo "2. Enter your Kite Connect API Key and Secret in the web interface"
echo "3. Follow the authentication flow to get your access token"
echo "4. Start tracking NIFTY option chain data!"
echo ""
echo "🔗 Get your API credentials from: https://kite.trade/connect/app"
echo ""
echo "📊 Check logs with:"
echo "   heroku logs --tail --app your-app-name"
