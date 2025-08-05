#!/bin/bash

# AWS EC2 Setup Script for NSE Tracker
# Run this script on your EC2 instance after connecting via SSH

set -e

echo "🚀 Setting up NSE Tracker on AWS EC2..."

# Update system
sudo yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo yum install -y git

# Install PM2 for process management
sudo npm install -g pm2

# Create application directory
mkdir -p /home/ec2-user/nse-tracker
cd /home/ec2-user/nse-tracker

echo "✅ Basic setup completed!"
echo "📝 Next steps:"
echo "1. Upload your application code to this directory"
echo "2. Create .env file with your Kite API credentials"
echo "3. Run: npm install"
echo "4. Run: pm2 start server.js --name nse-tracker"
echo "5. Run: pm2 startup and follow instructions"
echo "6. Run: pm2 save"

# Create systemd service file
sudo tee /etc/systemd/system/nse-tracker.service > /dev/null <<EOF
[Unit]
Description=NSE Tracker Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/nse-tracker
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "📋 Systemd service created at /etc/systemd/system/nse-tracker.service"
