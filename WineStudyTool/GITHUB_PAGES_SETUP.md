# GitHub Pages Deployment Guide

## Quick Setup Steps

1. **Commit and Push Your Changes**
   ```bash
   git add .
   git commit -m "Update static site"
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

The application is fully static — no server required:

### Static Version (in `/static` folder)
- **Fully static**: Runs entirely in the browser
- **Download/Upload**: Save polygon data as JSON files to your computer
- **Pre-loaded data**: Polygon data is loaded from JSON files in `/polyregions/`
- **Hierarchical menus**: France and Italy are top-level categories with sub-region flyout menus
- **Auto-deployed**: GitHub Actions automatically deploys the `/static` folder on every push to master

## GitHub Actions Workflow

The deployment is automated using GitHub Actions (`.github/workflows/deploy.yml`):
- Triggers automatically on push to `master` branch
- Can also be triggered manually via workflow_dispatch
- Deploys the `/static` folder contents to GitHub Pages
- No build step required - deploys static files directly

## How It Works

The GitHub Pages version:
1. GitHub Actions workflow deploys the `/static` folder on every push
2. Loads map images from `./maps/` (with country subfolders)
3. Loads polygon data from `./polyregions/` (with country subfolders)
4. All data is stored in browser memory
5. You can download/upload polygon configurations as JSON files

## Adding More Maps

1. Add image files to `static/maps/<Country>/`
2. Add JSON files to `static/polyregions/<Country>/` (or empty placeholder `{ "regions": [] }`)
3. Update `AVAILABLE_MAPS` in `static/app.js` under the appropriate country entry
4. Commit and push changes - GitHub Actions will auto-deploy

## Troubleshooting

**Site not loading?**
- Check that GitHub Pages source is set to "GitHub Actions" in repository settings
- Go to Actions tab and verify the workflow ran successfully
- Wait a few minutes after the workflow completes

**Maps not showing?**
- Check browser console (F12) for errors
- Verify image files are in the correct `static/maps/<Country>/` folder
- Check that file names match in `AVAILABLE_MAPS` array

**JSON data not loading?**
- Verify JSON files are valid (use a JSON validator)
- Check that `dataFile` paths in `AVAILABLE_MAPS` match actual files in `static/polyregions/`

## Files Structure

```
WineStudyTool/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions workflow
├── static/                     # GitHub Pages folder (deployed)
│   ├── .nojekyll              # Prevents Jekyll processing
│   ├── index.html             # Main page
│   ├── app.js                 # Client-side JavaScript
│   ├── styles.css             # Styles
│   ├── maps/                  # Map images
│   │   ├── France.png         # France overview
│   │   ├── Italy.png          # Italy overview
│   │   ├── France/            # France sub-region maps
│   │   │   ├── Bordeaux.png
│   │   │   ├── Burgundy.png
│   │   │   └── ...
│   │   └── Italy/             # Italy sub-region maps
│   │       ├── Tuscany.png
│   │       ├── Veneto.png
│   │       └── ...
│   └── polyregions/           # Polygon data
│       ├── France.json        # France overview regions
│       ├── Italy.json         # Italy overview regions
│       ├── France/            # France sub-region data
│       │   ├── Bordeaux.json
│       │   ├── Burgundy.json
│       │   └── ...
│       └── Italy/             # Italy sub-region data
│           ├── Tuscany.json
│           ├── Veneto.json
│           └── ...
└── README.md
```
