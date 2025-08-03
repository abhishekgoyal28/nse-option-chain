# Google Cloud Platform (GCP) Deployment Guide

This guide covers multiple GCP deployment options for your NSE tracking application, from simple to enterprise-grade solutions.

## 🚀 GCP Deployment Options

### 1. **Cloud Run** (Recommended) 💰 ~$5-15/month
- **Best for**: Serverless, automatic scaling, pay-per-use
- **Scaling**: Automatic (0 to 1000+ instances)
- **Management**: Fully managed
- **Cold starts**: ~1-2 seconds

### 2. **App Engine** 💰 ~$15-30/month
- **Best for**: Traditional web apps, integrated services
- **Scaling**: Automatic
- **Management**: Fully managed
- **Features**: Built-in services (cron, task queues)

### 3. **Compute Engine** 💰 ~$5-20/month
- **Best for**: Full control, custom configurations
- **Scaling**: Manual or auto-scaling groups
- **Management**: Self-managed
- **Features**: Full VM control

### 4. **Google Kubernetes Engine (GKE)** 💰 ~$25-100/month
- **Best for**: Microservices, enterprise applications
- **Scaling**: Horizontal pod autoscaling
- **Management**: Container orchestration
- **Features**: Advanced networking, security

## 📋 Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Google Cloud SDK** installed
3. **Docker** installed (for containerized deployments)
4. **Kite Connect API credentials**

### Install Google Cloud SDK

```bash
# macOS
brew install --cask google-cloud-sdk

# Ubuntu/Debian
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Windows
# Download from: https://cloud.google.com/sdk/docs/install

# Initialize
gcloud init
gcloud auth login
```

---

## 🎯 Quick Start Deployments

### Option 1: Cloud Run (Recommended)

**Perfect for**: Most applications, cost-effective, serverless

```bash
# 1. Set up project
gcloud config set project YOUR_PROJECT_ID

# 2. Deploy with one command
npm run deploy:gcp-run
```

**Features:**
- ✅ Automatic HTTPS
- ✅ Pay per request
- ✅ Scales to zero
- ✅ Global load balancing
- ✅ Built-in monitoring

---

### Option 2: App Engine

**Perfect for**: Traditional web apps, integrated GCP services

```bash
# Deploy with one command
npm run deploy:gcp-appengine
```

**Features:**
- ✅ Automatic scaling
- ✅ Built-in services
- ✅ Custom domains
- ✅ SSL certificates
- ✅ Integrated logging

---

### Option 3: Compute Engine

**Perfect for**: Full control, custom configurations

```bash
# Deploy with one command
npm run deploy:gcp-compute
```

**Features:**
- ✅ Full VM control
- ✅ Custom machine types
- ✅ Persistent disks
- ✅ Load balancing
- ✅ Auto-scaling groups

---

## 🔧 Detailed Setup Instructions

### Cloud Run Deployment

#### Step 1: Enable APIs and Setup
```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

#### Step 2: Create Secrets
```bash
# Store Kite API credentials securely
echo -n "YOUR_KITE_API_KEY" | gcloud secrets create kite-api-key --data-file=-
echo -n "YOUR_KITE_API_SECRET" | gcloud secrets create kite-api-secret --data-file=-
```

#### Step 3: Build and Deploy
```bash
# Build container image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/nse-tracker

# Deploy to Cloud Run
gcloud run deploy nse-tracker \
    --image gcr.io/YOUR_PROJECT_ID/nse-tracker \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --set-secrets KITE_API_KEY=kite-api-key:latest,KITE_API_SECRET=kite-api-secret:latest \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 1 \
    --max-instances 10
```

#### Step 4: Custom Domain (Optional)
```bash
# Map custom domain
gcloud run domain-mappings create --service nse-tracker --domain your-domain.com --region us-central1
```

---

### App Engine Deployment

#### Step 1: Create App Engine App
```bash
# Create App Engine application
gcloud app create --region=us-central
```

#### Step 2: Configure app.yaml
```yaml
runtime: nodejs18

automatic_scaling:
  min_instances: 1
  max_instances: 10

env_variables:
  NODE_ENV: production
  KITE_API_KEY: your_api_key
  KITE_API_SECRET: your_api_secret

readiness_check:
  path: "/api/health"
```

#### Step 3: Deploy
```bash
gcloud app deploy
```

---

### Compute Engine Deployment

#### Step 1: Create VM Instance
```bash
# Create instance with startup script
gcloud compute instances create nse-tracker-vm \
    --machine-type e2-micro \
    --image-family ubuntu-2004-lts \
    --image-project ubuntu-os-cloud \
    --metadata-from-file startup-script=startup.sh \
    --tags http-server,https-server
```

#### Step 2: Configure Firewall
```bash
# Allow HTTP/HTTPS traffic
gcloud compute firewall-rules create allow-http-https \
    --allow tcp:80,tcp:443,tcp:3000 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server,https-server
```

#### Step 3: Setup Application
```bash
# SSH into instance
gcloud compute ssh nse-tracker-vm

# Upload and setup your application
# (Follow the setup instructions provided by the script)
```

---

## 💰 Cost Comparison

| Service | Free Tier | Typical Cost | Best For |
|---------|-----------|--------------|----------|
| **Cloud Run** | 2M requests/month | $5-15/month | Most apps |
| **App Engine** | 28 hours/day | $15-30/month | Web apps |
| **Compute Engine** | 1 e2-micro instance | $5-20/month | Full control |
| **GKE** | None | $25-100/month | Enterprise |

---

## 🔐 Security Best Practices

### 1. Use Secret Manager
```bash
# Store sensitive data in Secret Manager
gcloud secrets create kite-api-key --data-file=-
gcloud secrets create kite-api-secret --data-file=-

# Grant access to your service
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
```

### 2. Enable Security Features
```bash
# Enable security scanning for container images
gcloud container images scan IMAGE_URL

# Set up VPC firewall rules
gcloud compute firewall-rules create nse-tracker-allow \
    --allow tcp:80,tcp:443 \
    --source-ranges 0.0.0.0/0
```

### 3. Use IAM Roles
```bash
# Create service account with minimal permissions
gcloud iam service-accounts create nse-tracker-sa \
    --display-name="NSE Tracker Service Account"

# Assign minimal roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:nse-tracker-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

---

## 📊 Monitoring and Logging

### 1. Cloud Monitoring
```bash
# View metrics in Cloud Console
# https://console.cloud.google.com/monitoring

# Create custom dashboards
# Set up alerting policies
```

### 2. Cloud Logging
```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=nse-tracker"

# Create log-based metrics
gcloud logging metrics create error_count \
    --description="Count of error logs" \
    --log-filter='severity>=ERROR'
```

### 3. Application Performance Monitoring
```bash
# Enable Cloud Trace
npm install @google-cloud/trace-agent
# Add to your app: require('@google-cloud/trace-agent').start();

# Enable Cloud Profiler
npm install @google-cloud/profiler
# Add to your app: require('@google-cloud/profiler').start();
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions for GCP

Create `.github/workflows/deploy-gcp.yml`:

```yaml
name: Deploy to GCP

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Cloud SDK
      uses: google-github-actions/setup-gcloud@v0
      with:
        project_id: ${{ secrets.GCP_PROJECT_ID }}
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        export_default_credentials: true
    
    - name: Build and Deploy to Cloud Run
      run: |
        gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/nse-tracker
        gcloud run deploy nse-tracker \
          --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/nse-tracker \
          --platform managed \
          --region us-central1 \
          --allow-unauthenticated
```

---

## 🔧 Advanced Configurations

### 1. Load Balancing
```bash
# Create global load balancer
gcloud compute url-maps create nse-tracker-lb \
    --default-service nse-tracker-backend

# Add SSL certificate
gcloud compute ssl-certificates create nse-tracker-ssl \
    --domains your-domain.com
```

### 2. Auto Scaling
```yaml
# For GKE - Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nse-tracker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nse-tracker
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 3. Database Integration
```bash
# Create Cloud SQL instance
gcloud sql instances create nse-tracker-db \
    --database-version=POSTGRES_13 \
    --tier=db-f1-micro \
    --region=us-central1

# Create database
gcloud sql databases create nsetracker --instance=nse-tracker-db
```

---

## 🛠️ Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   gcloud builds log BUILD_ID
   
   # Common fix: Update Dockerfile
   ```

2. **Service Not Accessible**
   ```bash
   # Check service status
   gcloud run services describe nse-tracker --region us-central1
   
   # Check IAM permissions
   gcloud run services get-iam-policy nse-tracker --region us-central1
   ```

3. **High Costs**
   ```bash
   # Set up budget alerts
   gcloud billing budgets create \
     --billing-account BILLING_ACCOUNT_ID \
     --display-name "NSE Tracker Budget" \
     --budget-amount 50USD
   ```

4. **Performance Issues**
   ```bash
   # Check metrics
   gcloud monitoring metrics list --filter="resource.type=cloud_run_revision"
   
   # Increase resources
   gcloud run services update nse-tracker \
     --memory 1Gi \
     --cpu 2 \
     --region us-central1
   ```

---

## 📈 Scaling Strategies

### 1. Vertical Scaling
```bash
# Increase resources
gcloud run services update nse-tracker \
    --memory 1Gi \
    --cpu 2 \
    --region us-central1
```

### 2. Horizontal Scaling
```bash
# Increase max instances
gcloud run services update nse-tracker \
    --max-instances 50 \
    --region us-central1
```

### 3. Multi-Region Deployment
```bash
# Deploy to multiple regions
gcloud run deploy nse-tracker \
    --image gcr.io/PROJECT_ID/nse-tracker \
    --region us-central1

gcloud run deploy nse-tracker \
    --image gcr.io/PROJECT_ID/nse-tracker \
    --region europe-west1
```

---

## 🎯 Production Checklist

- [ ] Enable HTTPS/SSL
- [ ] Set up monitoring and alerting
- [ ] Configure proper IAM roles
- [ ] Use Secret Manager for credentials
- [ ] Set up backup strategy
- [ ] Configure custom domain
- [ ] Enable logging
- [ ] Set up CI/CD pipeline
- [ ] Configure auto-scaling
- [ ] Set up budget alerts
- [ ] Enable security scanning
- [ ] Configure health checks

---

## 🆘 Support Resources

- **GCP Documentation**: https://cloud.google.com/docs
- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **App Engine Docs**: https://cloud.google.com/appengine/docs
- **Compute Engine Docs**: https://cloud.google.com/compute/docs
- **GKE Docs**: https://cloud.google.com/kubernetes-engine/docs
- **Community Support**: https://stackoverflow.com/questions/tagged/google-cloud-platform

---

## 💡 Pro Tips

1. **Use Cloud Build for CI/CD** - Automatic builds on git push
2. **Enable Cloud CDN** - Faster global content delivery
3. **Use Cloud Storage** - For file uploads and static assets
4. **Set up Cloud Scheduler** - For periodic tasks
5. **Use Cloud Tasks** - For background job processing
6. **Enable Cloud Armor** - For DDoS protection
7. **Use Cloud Endpoints** - For API management
8. **Set up Cloud Functions** - For serverless functions

---

## 🚀 Quick Commands Reference

```bash
# Deploy to Cloud Run
npm run deploy:gcp-run

# Deploy to App Engine  
npm run deploy:gcp-appengine

# Deploy to Compute Engine
npm run deploy:gcp-compute

# View logs
gcloud run services logs tail nse-tracker --region us-central1

# Update service
gcloud run services update nse-tracker --region us-central1

# Delete service
gcloud run services delete nse-tracker --region us-central1
```
