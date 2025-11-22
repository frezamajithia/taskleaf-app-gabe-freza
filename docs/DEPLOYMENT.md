# TaskLeaf Deployment Guide

## Prerequisites

- GitHub account
- Vercel account (free tier)
- Railway account (free trial)
- OpenWeatherMap API key (free)

## Step-by-Step Deployment

### 1. Prepare Your Code

```bash
# Ensure all environment files are NOT committed
echo ".env" >> .gitignore
echo "*.env" >> .gitignore

# Commit your code
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy Backend to Railway

#### A. Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your TaskLeaf repository

#### B. Add PostgreSQL Database
1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically provision the database
4. Copy the `DATABASE_URL` from the database settings

#### C. Configure Backend Service
1. Click "+ New" → "GitHub Repo"
2. Select your repository
3. Set root directory to `/backend`
4. Add environment variables:
```env
DATABASE_URL=<copied from PostgreSQL service>
SECRET_KEY=<generate 32+ character random string>
OPENWEATHER_API_KEY=<your OpenWeatherMap API key>
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
```

5. Railway will automatically:
   - Detect Python
   - Install dependencies from requirements.txt
   - Start the FastAPI server

#### D. Get Backend URL
- Your backend will be available at: `https://your-app.up.railway.app`
- Copy this URL for frontend configuration

### 3. Deploy Frontend to Vercel

#### A. Connect GitHub Repository
1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Select the repository

#### B. Configure Build Settings
1. Framework Preset: **Next.js**
2. Root Directory: **frontend**
3. Build Command: `npm run build`
4. Output Directory: `.next`

#### C. Add Environment Variables
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app/api
```

#### D. Deploy
1. Click "Deploy"
2. Vercel will build and deploy your app
3. Your app will be available at: `https://your-app.vercel.app`

### 4. Update CORS Settings

After getting your Vercel URL, update Railway environment variables:

```env
ALLOWED_ORIGINS=https://your-app.vercel.app,https://*.vercel.app
```

Redeploy the backend service on Railway.

### 5. Verify Deployment

Test your deployed application:

1. **Frontend**: Visit your Vercel URL
2. **Backend API**: Visit `https://your-backend.up.railway.app/health`
3. **API Docs**: Visit `https://your-backend.up.railway.app/api/docs`

### 6. Set Up Custom Domain (Optional)

#### Vercel (Frontend)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

#### Railway (Backend)
1. Go to Service Settings → Networking
2. Add custom domain
3. Update DNS records

## Environment Variables Reference

### Backend (.env)
```env
# Required
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=min-32-chars-random-string
OPENWEATHER_API_KEY=your_openweather_key

# Optional
ALLOWED_ORIGINS=https://yourdomain.com
DEBUG=False
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

### Frontend
```env
# Required
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api
```

## Database Migrations

If you need to run database migrations:

```bash
# SSH into Railway service (if available) or use Railway CLI
railway login
railway link
railway run alembic upgrade head
```

Or create a migration script in Railway's deploy settings.

## Monitoring & Logging

### Railway
- View logs in the Railway dashboard
- Set up webhooks for deployment notifications
- Monitor resource usage

### Vercel
- View function logs in Vercel dashboard
- Analytics available in the Analytics tab
- Error tracking with Vercel Integrations

## Troubleshooting

### Backend Issues

**Problem**: 500 errors on API calls  
**Solution**: Check Railway logs, verify DATABASE_URL is correct

**Problem**: CORS errors  
**Solution**: Ensure frontend URL is in ALLOWED_ORIGINS

**Problem**: Database connection fails  
**Solution**: Verify PostgreSQL service is running, check DATABASE_URL

### Frontend Issues

**Problem**: API calls fail with 404  
**Solution**: Verify NEXT_PUBLIC_API_URL is correct and includes `/api`

**Problem**: Build fails on Vercel  
**Solution**: Check build logs, ensure all dependencies are in package.json

**Problem**: "Module not found" errors  
**Solution**: Delete `.next` folder and rebuild locally first

## Performance Optimization

### Backend
- Enable connection pooling (SQLAlchemy)
- Add Redis for caching (optional)
- Use Railway's autoscaling (paid tier)

### Frontend
- Vercel automatically optimizes images
- Enable Vercel Analytics for monitoring
- Use Next.js Image component

## Security Checklist

- Change default SECRET_KEY
- Use strong passwords for database
- Enable HTTPS (automatic on Vercel/Railway)
- Set proper CORS origins
- Don't commit .env files
- Use environment variables for secrets
- Enable Railway service authentication
- Set up API rate limiting (production)

## Backup & Recovery

### Database Backups (Railway)
- Railway automatically backs up PostgreSQL databases
- Download manual backup: Railway Dashboard → Database → Backups

### Code Backups
- GitHub repository serves as code backup
- Tag releases: `git tag -a v1.0.0 -m "Release 1.0.0"`

## Cost Estimate

### Free Tier Limits
- **Railway**: $5 credit/month (trial), then paid
- **Vercel**: Unlimited deployments, 100GB bandwidth
- **OpenWeatherMap**: 60 calls/min, 1M calls/month

### Estimated Monthly Cost
- Railway (Hobby): ~$5-10/month
- Vercel (Free tier): $0
- OpenWeatherMap (Free tier): $0
- **Total**: ~$5-10/month

## Continuous Deployment

Your GitHub Actions workflow automatically:
1. Runs tests on every push
2. Builds Docker images
3. Deploys to production on main branch

No additional setup needed after initial deployment!

## Support

For deployment issues:
- Railway: https://railway.app/help
- Vercel: https://vercel.com/support
- GitHub Actions: Check workflow logs

---

