# Economic Dashboard Deployment Guide

This guide will help you deploy your Economic Dashboard to a public domain for external access.

## 🚀 Quick Deployment Options

### Option 1: Netlify (Recommended - Easiest)

1. **Create Netlify Account**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub, GitLab, or email

2. **Deploy via Drag & Drop (Fastest)**
   - Zip your project folder (exclude `.git` if present)
   - Go to Netlify dashboard
   - Drag and drop the zip file
   - Your site will be live at `https://random-name.netlify.app`

3. **Deploy via Git (Recommended for updates)**
   ```bash
   # Initialize git repository
   git init
   git add .
   git commit -m "Initial deployment"

   # Push to GitHub (create repo first)
   git remote add origin https://github.com/yourusername/economic-dashboard.git
   git push -u origin main
   ```
   - In Netlify, click "New site from Git"
   - Connect to GitHub and select your repository
   - Deploy settings: Build command: (leave empty), Publish directory: `.`

4. **Custom Domain (Optional)**
   - In Netlify dashboard → Domain settings
   - Add custom domain and follow DNS instructions

### Option 2: Vercel

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Deploy**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy from project directory
   vercel

   # Follow prompts, then your site is live!
   ```

### Option 3: GitHub Pages (Free)

1. **Create GitHub Repository**
   - Go to [github.com](https://github.com)
   - Create new public repository named `economic-dashboard`

2. **Push Code**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/economic-dashboard.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to repository → Settings → Pages
   - Source: Deploy from a branch → main → / (root)
   - Your site will be at `https://yourusername.github.io/economic-dashboard`

## 🔐 Environment Variables Setup

Your dashboard uses API keys that should be kept secure:

1. **For Netlify:**
   - Dashboard → Site settings → Environment variables
   - Add: `FRED_API_KEY` = `7b2b5891d1e72a3dff72e1806e851d20`

2. **For Vercel:**
   - Dashboard → Project → Settings → Environment Variables
   - Add the same variable

3. **For GitHub Pages:**
   - API keys are embedded in the code (already set up)
   - Consider moving to environment variables for security

## 🌐 Custom Domain Setup

### For Any Platform:

1. **Buy a Domain** (optional)
   - Namecheap, GoDaddy, Google Domains, etc.
   - Example: `economic-data.com`

2. **Configure DNS**
   - Point your domain to the hosting platform
   - Each platform provides specific DNS instructions

## 🔧 Troubleshooting

### CORS Issues in Production
- ✅ Should be resolved automatically on hosted domains
- APIs work differently when served from `https://` vs `localhost`

### API Rate Limits
- FRED API: 120 requests/minute
- Consider upgrading API plans for heavy usage

### Performance Optimization
- All static files are cached automatically
- Charts load on-demand
- Data caches for 5 minutes to reduce API calls

## 📱 Features That Work in Production

✅ **Real-time Economic Data**
- Federal Reserve (FRED) data
- Banking H.8 reports
- Rate curves and spreads

✅ **Interactive Charts**
- Click to switch between tabs
- Hover for detailed data points
- Responsive design for mobile

✅ **Automatic Updates**
- Data refreshes automatically
- Charts update with new data
- Error handling for API failures

## 🎯 Next Steps After Deployment

1. **Test on Multiple Devices**
   - Desktop, tablet, mobile
   - Different browsers

2. **Monitor API Usage**
   - Check API quotas
   - Monitor for errors

3. **Custom Branding** (Optional)
   - Update site title in `index.html`
   - Modify colors in `css/styles.css`
   - Add your logo

4. **Analytics** (Optional)
   - Add Google Analytics
   - Monitor visitor usage

## 🆘 Need Help?

If you encounter issues during deployment:
1. Check the browser console for errors
2. Verify API keys are correctly set
3. Ensure all files are uploaded
4. Check platform-specific documentation

Your dashboard is now ready for public use! 🎉