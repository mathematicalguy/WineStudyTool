# Wine Study Tool

An interactive map study tool for learning wine regions. Click polygons to study regional locations.

## GitHub Pages Setup

This application is configured to run on GitHub Pages, deployed from the `/static` folder.

### To enable GitHub Pages:

1. Go to your repository settings on GitHub
2. Navigate to "Pages" in the left sidebar
3. Under "Source", select "GitHub Actions"
4. Your site will be published at: `https://mathematicalguy.github.io/WineStudyTool/`

## Features

- **Setup Mode**: Draw polygon regions on wine maps and label them
- **Study Mode**: Test your knowledge by clicking on the correct regions
- **Download/Upload**: Save and load your polygon data as JSON files
- **Hierarchical Map Selection**: France and Italy each have an overview map plus flyout sub-region maps

## Adding New Maps

1. Add your map image to the appropriate subfolder in `static/maps/` (e.g. `static/maps/France/`)
2. Add a corresponding JSON file in `static/polyregions/` with pre-defined regions (or an empty `{ "regions": [] }` placeholder)
3. Update the `AVAILABLE_MAPS` array in `static/app.js`

## How to Use

### Setup Mode
1. Select a map from the flyout menu
2. Click on the canvas to add points for a polygon
3. Double-click to close the polygon
4. Enter a name for the region
5. Click "Download" to save your polygon data

### Study Mode
1. Click "Study mode" button
2. Read the region name displayed
3. Click on the correct region on the map
4. Get instant feedback on your answer

## License

ISC
