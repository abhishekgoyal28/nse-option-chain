#!/bin/bash

# Google App Engine Deployment Script for NSE Tracker
set -e

# Configuration
PROJECT_ID=""
REGION="us-central"

echo "🚀 Starting GCP App Engine deployment for NSE Tracker..."

# Check if gcloud is installed and configured
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID if not set
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        echo "❌ No project ID found. Please set your project:"
        echo "gcloud config set project YOUR_PROJECT_ID"
        exit 1
    fi
fi

echo "📋 Using project: $PROJECT_ID"

# Check if App Engine app exists, create if not
if ! gcloud app describe --project=$PROJECT_ID &> /dev/null; then
    echo "🏗️  Creating App Engine application..."
    gcloud app create --region=$REGION --project=$PROJECT_ID
    echo "✅ App Engine application created"
else
    echo "✅ App Engine application already exists"
fi

# Get Kite API credentials
echo "🔐 Please provide your Kite Connect credentials:"
read -p "Enter your Kite API Key: " KITE_API_KEY
read -s -p "Enter your Kite API Secret: " KITE_API_SECRET
echo

# Create .env file for deployment
cat > .env.deploy << EOF
KITE_API_KEY=$KITE_API_KEY
KITE_API_SECRET=$KITE_API_SECRET
NODE_ENV=production
PORT=8080
EOF

# Update app.yaml with environment variables
cat > app.yaml << EOF
runtime: nodejs18

automatic_scaling:
  min_instances: 1
  max_instances: 10
  target_cpu_utilization: 0.6

resources:
  cpu: 1
  memory_gb: 0.5

env_variables:
  NODE_ENV: production
  PORT: 8080
  KITE_API_KEY: $KITE_API_KEY
  KITE_API_SECRET: $KITE_API_SECRET

readiness_check:
  path: "/api/health"
  check_interval_sec: 5
  timeout_sec: 4
  failure_threshold: 2
  success_threshold: 2

liveness_check:
  path: "/api/health"
  check_interval_sec: 30
  timeout_sec: 4
  failure_threshold: 4
  success_threshold: 2

skip_files:
  - ^(.*/)?#.*#$
  - ^(.*/)?.*~$
  - ^(.*/)?.*\.py[co]$
  - ^(.*/)?.*/RCS/.*$
  - ^(.*/)?\..*$
  - ^(.*/)?node_modules$
  - ^(.*/)?test$
  - ^(.*/)?tests$
  - ^(.*/)?deploy$
  - .env.deploy
EOF

# Update server.js to use PORT 8080 for App Engine
if ! grep -q "process.env.PORT || 8080" server.js; then
    echo "⚠️  Note: App Engine requires PORT 8080. Make sure your server.js uses:"
    echo "   const PORT = process.env.PORT || 8080;"
fi

# Deploy to App Engine
echo "🚀 Deploying to App Engine..."
gcloud app deploy app.yaml --project=$PROJECT_ID --quiet

# Get service URL
SERVICE_URL="https://$PROJECT_ID.appspot.com"

# Clean up sensitive files
rm -f .env.deploy

echo "
🎉 GCP App Engine deployment completed!

📋 Service Details:
   Project ID: $PROJECT_ID
   Service URL: $SERVICE_URL
   Region: $REGION

🔗 Quick Links:
   - Application: $SERVICE_URL
   - Health Check: $SERVICE_URL/api/health
   - App Engine Console: https://console.cloud.google.com/appengine?project=$PROJECT_ID
   - Logs: https://console.cloud.google.com/logs/query?project=$PROJECT_ID

🔧 Management Commands:
   - View logs: gcloud app logs tail -s default --project=$PROJECT_ID
   - Deploy new version: gcloud app deploy --project=$PROJECT_ID
   - Stop traffic: gcloud app versions stop VERSION --project=$PROJECT_ID
   - View versions: gcloud app versions list --project=$PROJECT_ID

💰 Pricing:
   - Automatic scaling based on traffic
   - Pay for actual usage
   - Free tier: 28 instance hours per day

📊 Features:
   - Automatic load balancing
   - Built-in health checks
   - Integrated logging and monitoring
   - Custom domain support
   - SSL certificates included

🔧 Configuration:
   - Edit app.yaml for scaling and resource settings
   - Use Cloud Console for advanced configuration
   - Set up custom domains in App Engine settings

⚠️  Important Notes:
   - App Engine requires PORT 8080 (configured in app.yaml)
   - File system is read-only (except /tmp)
   - Consider Cloud Storage for persistent data
   - Environment variables are visible in app.yaml (use Secret Manager for production)

🔐 Security Recommendations:
   1. Use Secret Manager instead of environment variables:
      gcloud secrets create kite-api-key --data-file=-
      gcloud secrets create kite-api-secret --data-file=-
   
   2. Update app.yaml to use secrets:
      env_variables:
        KITE_API_KEY: \${KITE_API_KEY}
        KITE_API_SECRET: \${KITE_API_SECRET}
"
