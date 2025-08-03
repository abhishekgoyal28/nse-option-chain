# NSE Tracker - Cloud Deployment Guide

This guide covers multiple deployment options for your NSE tracking application.

## Prerequisites

- Kite Connect API credentials (API Key and Secret)
- Basic knowledge of cloud platforms
- Git repository (recommended)

## Deployment Options

### 1. AWS EC2 (Recommended) 💰 ~$10-20/month

**Best for**: Full control, custom configurations, cost-effective

### 2. Google Cloud Run (Recommended) 💰 ~$5-15/month

**Best for**: Serverless, pay-per-use, automatic scaling

### 3. AWS App Runner 💰 ~$25-50/month

**Best for**: Serverless, automatic scaling, minimal management

### 4. Google App Engine 💰 ~$15-30/month

**Best for**: Traditional web apps, integrated GCP services

### 5. Google Compute Engine 💰 ~$5-20/month

**Best for**: Full VM control, custom configurations

### 6. Heroku 💰 ~$7-25/month

**Best for**: Quick deployment, beginner-friendly

### 7. DigitalOcean App Platform 💰 ~$12-25/month

**Best for**: Simple deployment, good performance

---

## 🚀 Quick Start Commands

```bash
# AWS EC2
npm run deploy:aws

# Google Cloud Run (Recommended)
npm run deploy:gcp-run

# Google App Engine
npm run deploy:gcp-appengine

# Google Compute Engine
npm run deploy:gcp-compute

# Heroku
npm run deploy:heroku

# Docker (any cloud)
npm run docker:build && npm run docker:run
```

---

### 1. AWS EC2 (Recommended) 💰 ~$10-20/month

**Best for**: Full control, custom configurations, cost-effective

#### Step 1: Launch EC2 Instance

1. Go to AWS Console → EC2
2. Launch Instance:
   - **AMI**: Amazon Linux 2
   - **Instance Type**: t3.micro (free tier) or t3.small
   - **Security Group**: Allow HTTP (80), HTTPS (443), SSH (22)
   - **Storage**: 8GB (default)

#### Step 2: Connect and Setup

```bash
# Connect to your instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Run setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/nse-tracker/main/deploy/aws-ec2-setup.sh | bash

# Upload your code (or clone from git)
git clone https://github.com/your-username/nse-tracker.git
cd nse-tracker

# Install dependencies
npm install

# Create environment file
cp .env.example .env
nano .env  # Add your Kite API credentials
```

#### Step 3: Deploy with PM2

```bash
# Start application with PM2
pm2 start server.js --name nse-tracker

# Setup PM2 to start on boot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs nse-tracker
```

#### Step 4: Setup Nginx (Optional but recommended)

```bash
# Install Nginx
sudo yum install -y nginx

# Copy nginx configuration
sudo cp deploy/nginx.conf /etc/nginx/sites-available/nse-tracker
sudo ln -s /etc/nginx/sites-available/nse-tracker /etc/nginx/sites-enabled/

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Step 5: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

---

### 2. Google Cloud Run (Recommended) 💰 ~$5-15/month

**Best for**: Serverless, pay-per-use, automatic scaling

#### Quick Deploy

```bash
# One-command deployment
npm run deploy:gcp-run
```

#### Manual Steps

```bash
# 1. Set up project
gcloud config set project YOUR_PROJECT_ID

# 2. Enable APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com secretmanager.googleapis.com

# 3. Create secrets
echo -n "YOUR_KITE_API_KEY" | gcloud secrets create kite-api-key --data-file=-
echo -n "YOUR_KITE_API_SECRET" | gcloud secrets create kite-api-secret --data-file=-

# 4. Build and deploy
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/nse-tracker
gcloud run deploy nse-tracker \
    --image gcr.io/YOUR_PROJECT_ID/nse-tracker \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --set-secrets KITE_API_KEY=kite-api-key:latest,KITE_API_SECRET=kite-api-secret:latest
```

**Features:**
- ✅ Automatic HTTPS
- ✅ Pay per request
- ✅ Scales to zero
- ✅ Global load balancing
- ✅ Built-in monitoring

---

### 3. Google App Engine 💰 ~$15-30/month

**Best for**: Traditional web apps, integrated GCP services

#### Quick Deploy

```bash
npm run deploy:gcp-appengine
```

#### Manual Steps

```bash
# 1. Create App Engine app
gcloud app create --region=us-central

# 2. Deploy
gcloud app deploy deploy/gcp-app-engine.yaml
```

**Features:**
- ✅ Automatic scaling
- ✅ Built-in services
- ✅ Custom domains
- ✅ SSL certificates

---

### 4. Google Compute Engine 💰 ~$5-20/month

**Best for**: Full VM control, custom configurations

#### Quick Deploy

```bash
npm run deploy:gcp-compute
```

This creates a VM instance with:
- Ubuntu 20.04 LTS
- Node.js 18
- PM2 process manager
- Nginx reverse proxy
- Automatic firewall rules

---

### 5. AWS App Runner 💰 ~$25-50/month

**Best for**: Serverless, automatic scaling, minimal management

#### Step 1: Prepare Code

```bash
# Ensure you have apprunner.yml
cp deploy/aws-apprunner.yml apprunner.yml

# Push to GitHub repository
git add .
git commit -m "Add App Runner config"
git push origin main
```

#### Step 2: Create App Runner Service

1. Go to AWS Console → App Runner
2. Create Service:
   - **Source**: GitHub repository
   - **Repository**: Select your repo
   - **Branch**: main
   - **Configuration**: Use apprunner.yml
3. Add Environment Variables:
   - `KITE_API_KEY`: Your API key
   - `KITE_API_SECRET`: Your API secret
4. Deploy

---

### 3. Heroku 💰 ~$7-25/month

**Best for**: Quick deployment, beginner-friendly

#### Prerequisites

```bash
# Install Heroku CLI
# macOS
brew tap heroku/brew && brew install heroku

# Ubuntu/Debian
curl https://cli-assets.heroku.com/install.sh | sh
```

#### Deploy

```bash
# Run deployment script
chmod +x deploy/heroku-deploy.sh
./deploy/heroku-deploy.sh
```

Or manually:

```bash
# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set KITE_API_KEY=your_key
heroku config:set KITE_API_SECRET=your_secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

---

### 4. DigitalOcean App Platform 💰 ~$12-25/month

**Best for**: Simple deployment, good performance

#### Step 1: Create App

1. Go to DigitalOcean → Apps
2. Create App from GitHub repository
3. Configure:
   - **Build Command**: `npm ci --only=production`
   - **Run Command**: `node server.js`
   - **Environment Variables**: Add Kite credentials

---

### 5. Docker Deployment (Any Cloud)

#### Build and Run Locally

```bash
# Build Docker image
docker build -t nse-tracker .

# Run container
docker run -d \
  --name nse-tracker \
  -p 3000:3000 \
  -e KITE_API_KEY=your_key \
  -e KITE_API_SECRET=your_secret \
  -v $(pwd)/data:/app/data \
  nse-tracker
```

#### Deploy to AWS ECS

```bash
# Tag and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com
docker tag nse-tracker:latest your-account.dkr.ecr.us-east-1.amazonaws.com/nse-tracker:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/nse-tracker:latest
```

---

## Post-Deployment Setup

### 1. Domain Configuration

```bash
# Point your domain to the server IP
# Add A record: your-domain.com → server-ip
# Add CNAME record: www.your-domain.com → your-domain.com
```

### 2. SSL Certificate

```bash
# For EC2 with Nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# For other platforms, SSL is usually handled automatically
```

### 3. Monitoring Setup

```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-server-monit

# Setup log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 4. Backup Strategy

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "backup_${DATE}.tar.gz" data/
aws s3 cp "backup_${DATE}.tar.gz" s3://your-backup-bucket/
rm "backup_${DATE}.tar.gz"
EOF

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

---

## Environment Variables

Create `.env` file with:

```env
# Required
KITE_API_KEY=your_kite_api_key
KITE_API_SECRET=your_kite_api_secret

# Optional
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
```

---

## Security Checklist

- [ ] Use HTTPS (SSL certificate)
- [ ] Set up firewall rules
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Use strong passwords/keys
- [ ] Enable 2FA on cloud accounts

---

## Monitoring and Maintenance

### Health Checks

```bash
# Check application health
curl https://your-domain.com/api/health

# Check periodic fetch status
curl -X POST https://your-domain.com/api/control-fetch \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'
```

### Log Monitoring

```bash
# PM2 logs
pm2 logs nse-tracker

# System logs
sudo journalctl -u nse-tracker -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Performance Monitoring

```bash
# PM2 monitoring
pm2 monit

# System resources
htop
df -h
free -h
```

---

## Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   # Check logs
   pm2 logs nse-tracker
   
   # Check environment variables
   pm2 env 0
   ```

2. **Can't connect to Kite API**
   ```bash
   # Test API credentials
   curl -X POST https://your-domain.com/api/fetch-data
   ```

3. **High memory usage**
   ```bash
   # Restart application
   pm2 restart nse-tracker
   
   # Check memory usage
   pm2 monit
   ```

4. **SSL certificate issues**
   ```bash
   # Renew certificate
   sudo certbot renew
   
   # Test SSL
   curl -I https://your-domain.com
   ```

---

## Cost Optimization

### AWS EC2
- Use t3.micro for development
- Use t3.small for production
- Enable detailed monitoring
- Set up auto-scaling if needed

### General Tips
- Use CDN for static assets
- Enable gzip compression
- Optimize Docker images
- Monitor resource usage
- Set up alerts for high usage

---

## Support

For deployment issues:
1. Check the logs first
2. Verify environment variables
3. Test API endpoints manually
4. Check cloud provider status pages
5. Review security group/firewall rules

---

## Quick Start Commands

```bash
# Clone and setup
git clone https://github.com/your-username/nse-tracker.git
cd nse-tracker
npm install
cp .env.example .env
# Edit .env with your credentials

# Local development
npm start

# Production deployment (EC2)
pm2 start server.js --name nse-tracker
pm2 startup
pm2 save

# Check status
curl http://localhost:3000/api/health
```
