# GitHub Pages Deployment Guide

## Quick Setup Steps

1. **Commit and Push Your Changes**
   ```bash
   git add .
   git commit -m "Add GitHub Pages support"
   git push origin master
   ```

2. **Enable GitHub Pages**
   - Go to: https://github.com/mathematicalguy/WineStudyTool/settings/pages
   - Under "Source", select: **Deploy from a branch**
   - Branch: **master**
   - Folder: **/docs**
   - Click **Save**

3. **Wait for Deployment**
   - GitHub will build and deploy your site (takes 1-2 minutes)
   - Visit: https://mathematicalguy.github.io/WineStudyTool/

## What Changed

The application has been converted to work without a Node.js server:

### Client-Side Version (in `/docs` folder)
- **Fully static**: No server required, runs entirely in the browser
- **Download/Upload**: Save polygon data as JSON files to your computer
- **Pre-loaded data**: Polygon data is loaded from JSON files in `/polyregions/`

### Server Version (in `/public` folder)
- Original Node.js/Express version still available for local development
- Run with: `npm start`

## How It Works

The GitHub Pages version:
1. Loads map images from `./maps/`
2. Loads polygon data from `./polyregions/`
3. All data is stored in browser memory
4. You can download/upload polygon configurations as JSON files

## Adding More Maps

1. Add image files to `docs/maps/`
2. Add JSON files to `docs/polyregions/` (optional)
3. Update `AVAILABLE_MAPS` in `docs/app.js`:
   ```javascript
   const AVAILABLE_MAPS = [
     { name: 'France11.png', dataFile: 'France11.json' },
     { name: 'YourMap.png', dataFile: 'YourMap.json' }
   ];
   ```
4. Commit and push changes

## Troubleshooting

**Site not loading?**
- Check that GitHub Pages is enabled in repository settings
- Verify the `/docs` folder contains all files
- Wait a few minutes after enabling GitHub Pages

**Maps not showing?**
- Check browser console (F12) for errors
- Verify image files are in `docs/maps/` folder
- Check that file names match in `AVAILABLE_MAPS` array

**JSON data not loading?**
- Verify JSON files are valid (use a JSON validator)
- Check that file names in `AVAILABLE_MAPS` match actual files in `docs/polyregions/`


## Files Structure

```
WineStudyTool/
├── docs/                    # GitHub Pages folder
│   ├── .nojekyll           # Prevents Jekyll processing
│   ├── index.html          # Main page
│   ├── app.js              # Client-side JavaScript
│   ├── styles.css          # Styles
│   ├── maps/               # Map images
│   │   ├── France11.png
│   │   └── Bordeaux.png
│   └── polyregions/        # Polygon data
│       ├── France11.json
│       └── Bordeaux.json
├── public/                 # Original server version
├── server.js               # Node.js server
├── package.json
└── README.md
```
