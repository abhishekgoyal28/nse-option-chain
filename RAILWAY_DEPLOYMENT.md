# Railway Deployment Guide for NSE Tracker

Railway is a modern deployment platform that's simpler than Heroku and doesn't require Git knowledge.

## 🚀 Quick Deployment (2 Methods)

### Method 1: Automated Script (Recommended)
```bash
./deploy-railway.sh
```

### Method 2: Manual Web Interface
1. Go to https://railway.app/
2. Sign up/login
3. Create new project
4. Upload your code folder
5. Set environment variables
6. Deploy!

---

## 📋 Prerequisites

- Railway account (free)
- Kite Connect API credentials
- Your NSE tracker code

---

## 🎯 Method 1: Automated Deployment

### Step 1: Run the Script
```bash
cd /Users/abhishekgoyal/Downloads/Abhishek/nse_tracking
./deploy-railway.sh
```

### What the Script Does:
1. **Installs Railway CLI** (if not present)
2. **Logs you into Railway** (opens browser)
3. **Creates new project**
4. **Sets environment variables** (asks for your Kite credentials)
5. **Deploys your code**
6. **Provides app URL and management commands**

---

## 🌐 Method 2: Web Interface Deployment

### Step 1: Create Account
1. Go to https://railway.app/
2. Click "Login" → "Sign up with GitHub" (or email)

### Step 2: Create Project
1. Click "New Project"
2. Select "Empty Project"
3. Give it a name like "nse-tracker"

### Step 3: Upload Code
1. In your project dashboard
2. Click "Deploy from GitHub repo" or look for upload option
3. If no direct upload, you can:
   - Create a GitHub repo and upload there
   - Use Railway CLI (Method 1 is easier)

### Step 4: Set Environment Variables
1. Go to "Variables" tab in your project
2. Add these variables:
   - `KITE_API_KEY`: your_kite_api_key
   - `KITE_API_SECRET`: your_kite_api_secret  
   - `NODE_ENV`: production
   - `PORT`: 3000

### Step 5: Deploy
1. Railway will automatically detect it's a Node.js app
2. It will run `npm install` and `npm start`
3. Your app will be live in 1-2 minutes

---

## 💰 Railway Pricing

### Free Tier
- **$5 credit per month** (usually enough for small apps)
- **No sleeping** (unlike Heroku free tier)
- **Custom domains**
- **Automatic HTTPS**

### Pay-as-you-go
- **~$0.000463 per GB-hour**
- **Estimated cost**: $2-8/month for typical usage
- **Much cheaper than Heroku paid tiers**

---

## 🔧 Management Commands

Once deployed, you can manage your app with:

```bash
# View logs
railway logs

# Redeploy
railway up

# Open dashboard
railway open

# Check status
railway status

# Set environment variables
railway variables set KEY=value

# Connect to database (if added)
railway connect
```

---

## 📊 Railway vs Heroku

| Feature | Railway | Heroku |
|---------|---------|--------|
| **Free Tier** | $5 credit/month | 550 hours/month |
| **Sleeping** | Never sleeps | Sleeps after 30min |
| **Git Required** | No | Yes |
| **Setup Time** | 2 minutes | 5-10 minutes |
| **Custom Domains** | ✅ Free | ❌ Paid only |
| **Automatic HTTPS** | ✅ Yes | ✅ Yes |
| **Database** | Built-in PostgreSQL | Add-on required |

---

## 🔐 Environment Variables

Your app needs these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `KITE_API_KEY` | Your Kite Connect API Key | `abc123xyz` |
| `KITE_API_SECRET` | Your Kite Connect API Secret | `def456uvw` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3000` |

Set them in Railway dashboard under "Variables" tab.

---

## 📈 Monitoring Your App

### Railway Dashboard
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Deployments**: History of all deployments
- **Variables**: Environment variable management

### Health Checks
```bash
# Check if app is running
curl https://your-app.railway.app/api/health

# Test data endpoint  
curl https://your-app.railway.app/api/nifty-data
```

### Logs
```bash
# Real-time logs
railway logs

# Or check in Railway dashboard
```

---

## 🛠️ Troubleshooting

### App Won't Start
1. **Check logs**: `railway logs` or Railway dashboard
2. **Verify environment variables**: Check Variables tab
3. **Check package.json**: Ensure `start` script exists

### Environment Variables Not Working
1. **Check spelling**: Variable names are case-sensitive
2. **Restart deployment**: `railway up`
3. **Check in dashboard**: Variables tab should show your vars

### App is Slow
1. **Check metrics**: Railway dashboard shows resource usage
2. **Upgrade plan**: If hitting resource limits
3. **Optimize code**: Check for memory leaks or inefficient code

### Deployment Fails
1. **Check build logs**: Railway dashboard → Deployments
2. **Verify dependencies**: All packages in package.json
3. **Check Node.js version**: Railway uses latest stable

---

## 🔄 Continuous Deployment

### GitHub Integration
1. Connect your Railway project to GitHub repo
2. Enable automatic deployments
3. Every git push triggers new deployment

### Manual Deployment
```bash
# After making changes
railway up
```

---

## 🌐 Custom Domain

### Add Custom Domain
1. Go to Railway dashboard
2. Click "Settings" → "Domains"
3. Add your domain (e.g., `nse-tracker.yourdomain.com`)
4. Update your DNS records as shown
5. SSL certificate is automatic

### DNS Configuration
```
Type: CNAME
Name: nse-tracker (or @)
Value: your-app.railway.app
```

---

## 📊 Features Your App Gets

### Automatic Features
- ✅ **HTTPS/SSL**: Automatic certificates
- ✅ **Custom Domains**: Free custom domains
- ✅ **Environment Variables**: Secure credential storage
- ✅ **Monitoring**: Built-in metrics and logs
- ✅ **Auto-restart**: App restarts on crashes
- ✅ **Health Checks**: Automatic health monitoring

### Your NSE Tracker Features
- ✅ **Periodic Data Fetch**: Every 30 seconds during market hours
- ✅ **Market Hours Awareness**: Automatically starts/stops
- ✅ **Fast API Responses**: Data served from memory
- ✅ **Historical Data**: Excel file storage
- ✅ **Monitoring Endpoints**: Health checks and status
- ✅ **Error Handling**: Graceful error recovery

---

## 🎯 Production Checklist

- [ ] Deploy app successfully
- [ ] Test all API endpoints
- [ ] Verify environment variables
- [ ] Check logs for errors
- [ ] Set up custom domain (optional)
- [ ] Monitor resource usage
- [ ] Set up alerts (optional)
- [ ] Test during market hours

---

## 📞 Support

### Railway Resources
- **Documentation**: https://docs.railway.app/
- **Discord Community**: https://railway.app/discord
- **Status Page**: https://status.railway.app/

### Common Issues
- **Build failures**: Check build logs in dashboard
- **Environment variables**: Verify in Variables tab
- **Performance**: Monitor metrics in dashboard
- **Billing**: Check usage in Settings

---

## 🚀 Quick Start Summary

```bash
# 1. Run deployment script
./deploy-railway.sh

# 2. Provide Kite API credentials when prompted

# 3. Access your app at the provided URL

# 4. Test endpoints:
# - https://your-app.railway.app/api/health
# - https://your-app.railway.app/api/nifty-data

# 5. Monitor in Railway dashboard
```

---

## 🎊 Success!

Once deployed, your NSE Tracker will be available 24/7 with:

- **Real-time data fetching** during market hours
- **Fast API responses** from cached data
- **Automatic scaling** based on traffic
- **Built-in monitoring** and logging
- **No sleeping** (unlike Heroku free tier)
- **Custom domain support**

Your app will automatically:
1. Start fetching data when market opens (9:30 AM IST)
2. Stop fetching when market closes (3:30 PM IST)
3. Serve the latest data to all API requests
4. Handle errors gracefully
5. Restart if it crashes

Happy trading! 📈🚀
