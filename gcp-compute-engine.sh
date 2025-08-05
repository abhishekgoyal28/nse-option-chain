#!/bin/bash

# Google Compute Engine Deployment Script for NSE Tracker
set -e

# Configuration
PROJECT_ID=""
ZONE="us-central1-a"
INSTANCE_NAME="nse-tracker-vm"
MACHINE_TYPE="e2-micro"  # Free tier eligible
IMAGE_FAMILY="ubuntu-2004-lts"
IMAGE_PROJECT="ubuntu-os-cloud"
DISK_SIZE="10GB"

echo "🚀 Starting GCP Compute Engine deployment for NSE Tracker..."

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

# Create firewall rules if they don't exist
echo "🛡️  Setting up firewall rules..."
if ! gcloud compute firewall-rules describe nse-tracker-http --project=$PROJECT_ID &> /dev/null; then
    gcloud compute firewall-rules create nse-tracker-http \
        --allow tcp:80,tcp:443,tcp:3000 \
        --source-ranges 0.0.0.0/0 \
        --description "Allow HTTP/HTTPS and Node.js for NSE Tracker" \
        --project=$PROJECT_ID
    echo "✅ Firewall rules created"
else
    echo "🛡️  Firewall rules already exist"
fi

# Create startup script
cat > startup-script.sh << 'EOF'
#!/bin/bash

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Docker
apt-get install -y docker.io
systemctl start docker
systemctl enable docker
usermod -aG docker $USER

# Install Nginx
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx

# Install Git
apt-get install -y git curl

# Create application directory
mkdir -p /home/nse-tracker
cd /home/nse-tracker

# Set up basic Nginx config
cat > /etc/nginx/sites-available/nse-tracker << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_EOF

# Enable the site
ln -sf /etc/nginx/sites-available/nse-tracker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl reload nginx

# Create a flag file to indicate setup completion
echo "Setup completed at $(date)" > /home/setup-complete.txt

EOF

# Create the VM instance
echo "🖥️  Creating Compute Engine instance..."
gcloud compute instances create $INSTANCE_NAME \
    --project=$PROJECT_ID \
    --zone=$ZONE \
    --machine-type=$MACHINE_TYPE \
    --network-interface=network-tier=PREMIUM,subnet=default \
    --metadata-from-file startup-script=startup-script.sh \
    --maintenance-policy=MIGRATE \
    --provisioning-model=STANDARD \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --tags=http-server,https-server \
    --create-disk=auto-delete=yes,boot=yes,device-name=$INSTANCE_NAME,image=projects/$IMAGE_PROJECT/global/images/family/$IMAGE_FAMILY,mode=rw,size=$DISK_SIZE,type=projects/$PROJECT_ID/zones/$ZONE/diskTypes/pd-standard \
    --no-shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring \
    --reservation-affinity=any

# Wait for instance to be running
echo "⏳ Waiting for instance to be ready..."
gcloud compute instances wait-until-running $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID

# Get external IP
EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME \
    --zone=$ZONE \
    --project=$PROJECT_ID \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

# Clean up
rm startup-script.sh

echo "
🎉 GCP Compute Engine deployment completed!

📋 Instance Details:
   Instance Name: $INSTANCE_NAME
   Zone: $ZONE
   External IP: $EXTERNAL_IP
   Machine Type: $MACHINE_TYPE

🔗 Next Steps:
1. Wait 3-5 minutes for startup script to complete
2. Connect to your instance:
   gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID

3. Upload your application:
   gcloud compute scp --recurse . $INSTANCE_NAME:~/nse-tracker --zone=$ZONE --project=$PROJECT_ID

4. Setup and start the application:
   cd nse-tracker
   npm install
   cp .env.example .env
   # Edit .env with your Kite credentials
   pm2 start server.js --name nse-tracker
   pm2 startup
   pm2 save

5. Access your application:
   http://$EXTERNAL_IP

🔧 Management Commands:
   - SSH: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID
   - Stop: gcloud compute instances stop $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID
   - Start: gcloud compute instances start $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID
   - Delete: gcloud compute instances delete $INSTANCE_NAME --zone=$ZONE --project=$PROJECT_ID

💰 Cost Optimization:
   - This uses e2-micro (free tier eligible)
   - Stop instance when not needed to save costs
   - Consider preemptible instances for development

🌐 Domain Setup:
   - Point your domain A record to: $EXTERNAL_IP
   - Set up SSL with Let's Encrypt after domain configuration
"
