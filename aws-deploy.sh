#!/bin/bash

# AWS Automated Deployment Script for NSE Tracker
# This script creates EC2 instance and deploys the application

set -e

# Configuration
INSTANCE_TYPE="t3.micro"
AMI_ID="ami-0c02fb55956c7d316"  # Amazon Linux 2 (update as needed)
KEY_NAME="nse-tracker-key"
SECURITY_GROUP="nse-tracker-sg"
REGION="us-east-1"

echo "🚀 Starting AWS deployment for NSE Tracker..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Create key pair if it doesn't exist
if ! aws ec2 describe-key-pairs --key-names $KEY_NAME --region $REGION &> /dev/null; then
    echo "🔑 Creating key pair..."
    aws ec2 create-key-pair --key-name $KEY_NAME --region $REGION --query 'KeyMaterial' --output text > ${KEY_NAME}.pem
    chmod 400 ${KEY_NAME}.pem
    echo "✅ Key pair created: ${KEY_NAME}.pem"
else
    echo "🔑 Key pair already exists"
fi

# Create security group if it doesn't exist
if ! aws ec2 describe-security-groups --group-names $SECURITY_GROUP --region $REGION &> /dev/null; then
    echo "🛡️  Creating security group..."
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name $SECURITY_GROUP \
        --description "Security group for NSE Tracker" \
        --region $REGION \
        --query 'GroupId' --output text)
    
    # Add rules
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP_ID \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0 \
        --region $REGION
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP_ID \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --region $REGION
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP_ID \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0 \
        --region $REGION
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP_ID \
        --protocol tcp \
        --port 3000 \
        --cidr 0.0.0.0/0 \
        --region $REGION
    
    echo "✅ Security group created: $SECURITY_GROUP_ID"
else
    echo "🛡️  Security group already exists"
    SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --group-names $SECURITY_GROUP --region $REGION --query 'SecurityGroups[0].GroupId' --output text)
fi

# Create user data script
cat > user-data.sh << 'EOF'
#!/bin/bash
yum update -y
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs git

# Install PM2
npm install -g pm2

# Create app directory
mkdir -p /home/ec2-user/nse-tracker
chown ec2-user:ec2-user /home/ec2-user/nse-tracker

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Nginx
yum install -y nginx
systemctl start nginx
systemctl enable nginx

echo "Setup completed" > /home/ec2-user/setup-complete.txt
EOF

# Launch EC2 instance
echo "🖥️  Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --count 1 \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SECURITY_GROUP_ID \
    --user-data file://user-data.sh \
    --region $REGION \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=NSE-Tracker}]' \
    --query 'Instances[0].InstanceId' --output text)

echo "✅ Instance launched: $INSTANCE_ID"

# Wait for instance to be running
echo "⏳ Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $REGION \
    --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "✅ Instance is running!"
echo "🌐 Public IP: $PUBLIC_IP"

# Clean up
rm user-data.sh

echo "
🎉 Deployment completed!

📋 Instance Details:
   Instance ID: $INSTANCE_ID
   Public IP: $PUBLIC_IP
   Key File: ${KEY_NAME}.pem

🔗 Next Steps:
1. Wait 2-3 minutes for setup to complete
2. Connect to your instance:
   ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP

3. Upload your application:
   scp -i ${KEY_NAME}.pem -r . ec2-user@$PUBLIC_IP:~/nse-tracker/

4. Setup and start the application:
   cd nse-tracker
   npm install
   cp .env.example .env
   # Edit .env with your Kite credentials
   pm2 start server.js --name nse-tracker
   pm2 startup
   pm2 save

5. Access your application:
   http://$PUBLIC_IP:3000

🔧 Management Commands:
   - Start: pm2 start nse-tracker
   - Stop: pm2 stop nse-tracker
   - Restart: pm2 restart nse-tracker
   - Logs: pm2 logs nse-tracker
   - Status: pm2 status

💡 Don't forget to:
   - Set up your domain name
   - Configure SSL certificate
   - Set up monitoring and backups
"
