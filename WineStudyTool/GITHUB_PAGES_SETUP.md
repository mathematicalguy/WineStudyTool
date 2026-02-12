# GitHub Pages Deployment Guide

## Quick Setup Steps

1. **Commit and Push Your Changes**
   ```bash
   git add .
   git commit -m "Add GitHub Pages support"
   git push origin master
   ```

2. **Enable GitHub Pages with GitHub Actions**
   - Go to: https://github.com/mathematicalguy/WineStudyTool/settings/pages
   - Under "Source", select: **GitHub Actions**
   - The workflow will automatically trigger on push to master
    
3. **Monitor Deployment**
   - Go to the Actions tab: https://github.com/mathematicalguy/WineStudyTool/actions
   - Watch the "Deploy to GitHub Pages" workflow run
   - Deployment typically takes 1-2 minutes
   
4. **Access Your Site**
   - Visit: https://mathematicalguy.github.io/WineStudyTool/
   - The site will be live once the workflow completes successfully

## What Changed

The application has been converted to work without a Node.js server:

### Client-Side Version (in `/static` folder)
- **Fully static**: No server required, runs entirely in the browser
- **Download/Upload**: Save polygon data as JSON files to your computer
- **Pre-loaded data**: Polygon data is loaded from JSON files in `/polyregions/`
- **Auto-deployed**: GitHub Actions automatically deploys the `/static` folder on every push to master

### Server Version (in `/public` folder)
- Original Node.js/Express version still available for local development
- Run with: `npm start`

## GitHub Actions Workflow

The deployment is automated using GitHub Actions (`.github/workflows/deploy.yml`):
- Triggers automatically on push to `master` branch
- Can also be triggered manually via workflow_dispatch
- Deploys the `/static` folder contents to GitHub Pages
- No build step required - deploys static files directly

## How It Works

The GitHub Pages version:
1. GitHub Actions workflow deploys the `/static` folder on every push
2. Loads map images from `./maps/`
3. Loads polygon data from `./polyregions/`
4. All data is stored in browser memory
5. You can download/upload polygon configurations as JSON files

## Adding More Maps

1. Add image files to `static/maps/`
2. Add JSON files to `static/polyregions/` (optional)
3. Update `AVAILABLE_MAPS` in `static/app.js`:
   ```javascript
   const AVAILABLE_MAPS = [
     { name: 'France11.png', dataFile: 'France11.json' },
     { name: 'YourMap.png', dataFile: 'YourMap.json' }
   ];
   ```
4. Commit and push changes - GitHub Actions will auto-deploy

## Troubleshooting

**Site not loading?**
- Check that GitHub Pages source is set to "GitHub Actions" in repository settings
- Go to Actions tab and verify the workflow ran successfully
- Wait a few minutes after the workflow completes
- Check the workflow logs for any errors

**Workflow failing?**
- Ensure the `/static` folder exists and contains all necessary files
- Check the Actions tab for detailed error messages
- Verify permissions are set correctly in repository settings

**Maps not showing?**
- Check browser console (F12) for errors
- Verify image files are in `static/maps/` folder
- Check that file names match in `AVAILABLE_MAPS` array

**JSON data not loading?**
- Verify JSON files are valid (use a JSON validator)
- Check that file names in `AVAILABLE_MAPS` match actual files in `static/polyregions/`

## Manual Workflow Trigger

You can manually trigger a deployment without pushing code:
1. Go to: https://github.com/mathematicalguy/WineStudyTool/actions
2. Click on "Deploy to GitHub Pages" workflow
3. Click "Run workflow" button
4. Select the `master` branch
5. Click "Run workflow"


## Files Structure

```
WineStudyTool/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions workflow
├── static/                 # GitHub Pages folder (deployed)
│   ├── .nojekyll          # Prevents Jekyll processing
│   ├── index.html         # Main page
│   ├── app.js             # Client-side JavaScript
│   ├── styles.css         # Styles
│   ├── maps/              # Map images
│   │   ├── France11.png
│   │   └── Bordeaux.png
│   └── polyregions/       # Polygon data
│       ├── France11.json
│       └── Bordeaux.json
├── public/                # Original server version
├── server.js              # Node.js server
├── package.json
└── README.md
```
