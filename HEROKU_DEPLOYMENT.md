# Heroku Deployment Guide for NSE Tracker

## 🚀 Quick Deployment (3 Steps)

### Step 1: Install Heroku CLI
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Or download from: https://devcenter.heroku.com/articles/heroku-cli
```

### Step 2: Deploy with One Command
```bash
./deploy-heroku.sh
```

### Step 3: Access Your App
Your app will be available at: `https://your-app-name.herokuapp.com`

---

## 📋 What the Deployment Script Does

1. **Checks Prerequisites** - Heroku CLI installation
2. **Authenticates** - Logs you into Heroku
3. **Creates App** - Sets up new Heroku application
4. **Sets Environment Variables** - Configures Kite API credentials
5. **Deploys Code** - Pushes your code to Heroku
6. **Provides URLs** - Gives you all the important links

---

## 🔧 Manual Deployment (Alternative)

If you prefer to do it manually:

```bash
# 1. Install Heroku CLI (if not already installed)
brew tap heroku/brew && brew install heroku

# 2. Login to Heroku
heroku login

# 3. Create app
heroku create your-app-name

# 4. Set environment variables
heroku config:set KITE_API_KEY=your_api_key
heroku config:set KITE_API_SECRET=your_api_secret
heroku config:set NODE_ENV=production

# 5. Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit"

# 6. Add Heroku remote and deploy
heroku git:remote -a your-app-name
git push heroku main
```

---

## 🔐 Environment Variables Setup

Your app needs these environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `KITE_API_KEY` | Your Kite Connect API Key | ✅ Yes |
| `KITE_API_SECRET` | Your Kite Connect API Secret | ✅ Yes |
| `NODE_ENV` | Set to "production" | ✅ Yes |
| `PORT` | Heroku sets this automatically | ❌ Auto |

Set them using:
```bash
heroku config:set KITE_API_KEY=your_key --app your-app-name
heroku config:set KITE_API_SECRET=your_secret --app your-app-name
```

---

## 💰 Heroku Pricing

### Free Tier (Good for Testing)
- **Cost**: $0/month
- **Dyno Hours**: 550 hours/month
- **Sleep**: After 30 minutes of inactivity
- **Custom Domains**: No
- **SSL**: Yes (automatic)

### Eco Dyno (Recommended for Production)
- **Cost**: $5/month
- **Dyno Hours**: Unlimited
- **Sleep**: Never sleeps
- **Custom Domains**: No
- **SSL**: Yes (automatic)

### Basic Dyno (Full Features)
- **Cost**: $7/month
- **Dyno Hours**: Unlimited
- **Sleep**: Never sleeps
- **Custom Domains**: Yes
- **SSL**: Yes (automatic)

---

## 📊 Monitoring Your App

### View Logs
```bash
# Real-time logs
heroku logs --tail --app your-app-name

# Last 100 lines
heroku logs --app your-app-name

# Filter by source
heroku logs --source app --app your-app-name
```

### Check App Status
```bash
# App info
heroku info --app your-app-name

# Dyno status
heroku ps --app your-app-name

# Config variables
heroku config --app your-app-name
```

### Health Checks
```bash
# Check if app is running
curl https://your-app-name.herokuapp.com/api/health

# Test data endpoint
curl https://your-app-name.herokuapp.com/api/nifty-data
```

---

## 🔧 Common Management Tasks

### Restart App
```bash
heroku restart --app your-app-name
```

### Scale Dynos
```bash
# Scale up
heroku ps:scale web=2 --app your-app-name

# Scale down
heroku ps:scale web=1 --app your-app-name
```

### Update Environment Variables
```bash
heroku config:set NEW_VARIABLE=value --app your-app-name
```

### Deploy Updates
```bash
git add .
git commit -m "Update message"
git push heroku main
```

---

## ⚠️ Important Limitations

### 1. **Ephemeral Filesystem**
- Files are lost when dyno restarts
- Historical Excel data will be lost
- Consider using external storage for persistence

### 2. **Dyno Sleep (Free Tier)**
- App sleeps after 30 minutes of inactivity
- First request after sleep takes ~10-30 seconds
- Upgrade to Eco dyno ($5/month) to prevent sleeping

### 3. **Request Timeout**
- Maximum 30-second request timeout
- Long-running requests will be terminated

### 4. **Memory Limits**
- Free/Eco: 512MB RAM
- Basic: 1GB RAM

---

## 🛠️ Troubleshooting

### App Won't Start
```bash
# Check logs for errors
heroku logs --tail --app your-app-name

# Common issues:
# 1. Missing environment variables
# 2. Port configuration (should use process.env.PORT)
# 3. Package.json start script
```

### Environment Variables Not Set
```bash
# Check current config
heroku config --app your-app-name

# Set missing variables
heroku config:set KITE_API_KEY=your_key --app your-app-name
```

### App is Slow/Sleeping
```bash
# Upgrade to prevent sleeping
heroku ps:scale web=1:eco --app your-app-name

# Or use a service like UptimeRobot to ping your app
```

### Deployment Fails
```bash
# Check build logs
heroku logs --source heroku --app your-app-name

# Common fixes:
# 1. Ensure package.json has correct start script
# 2. Check Node.js version compatibility
# 3. Verify all dependencies are in package.json
```

### Data Loss Issues
```bash
# Historical data is lost on restart
# Solutions:
# 1. Use external database (Heroku Postgres)
# 2. Use cloud storage (AWS S3, Google Cloud Storage)
# 3. Accept data loss for development/testing
```

---

## 🔄 Continuous Deployment

### GitHub Integration
1. Go to Heroku Dashboard
2. Select your app
3. Go to "Deploy" tab
4. Connect to GitHub repository
5. Enable automatic deploys from main branch

### Manual Deployment
```bash
# After making changes
git add .
git commit -m "Your changes"
git push heroku main
```

---

## 📈 Scaling for Production

### Database Setup
```bash
# Add Heroku Postgres (free tier)
heroku addons:create heroku-postgresql:mini --app your-app-name

# Get database URL
heroku config:get DATABASE_URL --app your-app-name
```

### Redis for Caching
```bash
# Add Redis (free tier)
heroku addons:create heroku-redis:mini --app your-app-name
```

### Custom Domain
```bash
# Add custom domain (requires Basic dyno or higher)
heroku domains:add your-domain.com --app your-app-name

# Point your DNS to:
# your-app-name.herokuapp.com
```

---

## 🎯 Production Checklist

- [ ] Upgrade to Eco dyno ($5/month) to prevent sleeping
- [ ] Set up external database for data persistence
- [ ] Configure custom domain
- [ ] Set up monitoring/alerting
- [ ] Enable automatic deployments from GitHub
- [ ] Set up staging environment
- [ ] Configure log management
- [ ] Set up backup strategy

---

## 📞 Support

### Heroku Resources
- **Documentation**: https://devcenter.heroku.com/
- **Status**: https://status.heroku.com/
- **Support**: https://help.heroku.com/

### App-Specific Issues
- Check logs: `heroku logs --tail --app your-app-name`
- Test endpoints manually
- Verify environment variables
- Check Kite API credentials

---

## 🎊 Success!

Once deployed, your NSE Tracker will be available at:
- **App URL**: `https://your-app-name.herokuapp.com`
- **Health Check**: `https://your-app-name.herokuapp.com/api/health`
- **Data Endpoint**: `https://your-app-name.herokuapp.com/api/nifty-data`

The app will automatically:
- ✅ Fetch NIFTY data every 30 seconds during market hours
- ✅ Serve data from memory for fast responses
- ✅ Handle market hours automatically
- ✅ Provide monitoring endpoints
- ✅ Scale based on traffic

Happy trading! 📈
