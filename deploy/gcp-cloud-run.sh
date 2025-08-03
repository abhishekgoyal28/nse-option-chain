#!/bin/bash

# Google Cloud Run Deployment Script for NSE Tracker
set -e

# Configuration
PROJECT_ID=""
REGION="us-central1"
SERVICE_NAME="nse-tracker"
IMAGE_NAME="gcr.io/$PROJECT_ID/nse-tracker"

echo "🚀 Starting GCP Cloud Run deployment for NSE Tracker..."

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

# Update IMAGE_NAME with actual project ID
IMAGE_NAME="gcr.io/$PROJECT_ID/nse-tracker"

echo "📋 Using project: $PROJECT_ID"
echo "🐳 Image name: $IMAGE_NAME"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID
gcloud services enable run.googleapis.com --project=$PROJECT_ID
gcloud services enable containerregistry.googleapis.com --project=$PROJECT_ID

# Get Kite API credentials
echo "🔐 Setting up secrets..."
read -p "Enter your Kite API Key: " KITE_API_KEY
read -s -p "Enter your Kite API Secret: " KITE_API_SECRET
echo

# Create secrets in Secret Manager
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID

# Create secrets
echo -n "$KITE_API_KEY" | gcloud secrets create kite-api-key --data-file=- --project=$PROJECT_ID 2>/dev/null || \
echo -n "$KITE_API_KEY" | gcloud secrets versions add kite-api-key --data-file=- --project=$PROJECT_ID

echo -n "$KITE_API_SECRET" | gcloud secrets create kite-api-secret --data-file=- --project=$PROJECT_ID 2>/dev/null || \
echo -n "$KITE_API_SECRET" | gcloud secrets versions add kite-api-secret --data-file=- --project=$PROJECT_ID

echo "✅ Secrets created in Secret Manager"

# Build and push Docker image
echo "🐳 Building Docker image..."
gcloud builds submit --tag $IMAGE_NAME --project=$PROJECT_ID .

echo "✅ Docker image built and pushed to Container Registry"

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --project $PROJECT_ID \
    --allow-unauthenticated \
    --set-env-vars NODE_ENV=production \
    --set-secrets KITE_API_KEY=kite-api-key:latest,KITE_API_SECRET=kite-api-secret:latest \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300 \
    --concurrency 80 \
    --min-instances 1 \
    --max-instances 10 \
    --port 3000

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --project $PROJECT_ID \
    --format 'value(status.url)')

echo "
🎉 GCP Cloud Run deployment completed!

📋 Service Details:
   Service Name: $SERVICE_NAME
   Region: $REGION
   Service URL: $SERVICE_URL
   Image: $IMAGE_NAME

🔗 Quick Links:
   - Application: $SERVICE_URL
   - Health Check: $SERVICE_URL/api/health
   - Cloud Console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID

🔧 Management Commands:
   - View logs: gcloud run services logs tail $SERVICE_NAME --region=$REGION --project=$PROJECT_ID
   - Update service: gcloud run services update $SERVICE_NAME --region=$REGION --project=$PROJECT_ID
   - Delete service: gcloud run services delete $SERVICE_NAME --region=$REGION --project=$PROJECT_ID

💰 Pricing:
   - Pay per request (very cost-effective for low traffic)
   - Automatic scaling to zero when not in use
   - Free tier: 2 million requests per month

🔐 Security:
   - Secrets stored in Secret Manager
   - HTTPS enabled by default
   - IAM-based access control

📊 Monitoring:
   - View metrics in Cloud Console
   - Set up alerts for errors or high latency
   - Use Cloud Logging for detailed logs

🌐 Custom Domain (Optional):
   1. Verify domain ownership in Cloud Console
   2. Map domain to Cloud Run service
   3. SSL certificate automatically provisioned
"
