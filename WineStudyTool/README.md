# Wine Study Tool

An interactive map study tool for learning wine regions. Click polygons to study regional locations.

## GitHub Pages Setup

This application is configured to run on GitHub Pages from the `/docs` folder.

### To enable GitHub Pages:

1. Go to your repository settings on GitHub
2. Navigate to "Pages" in the left sidebar
3. Under "Source", select "Deploy from a branch"
4. Select the `master` branch and `/docs` folder
5. Click "Save"
6. Your site will be published at: `https://mathematicalguy.github.io/WineStudyTool/`

## Features

- **Setup Mode**: Draw polygon regions on wine maps and label them
- **Study Mode**: Test your knowledge by clicking on the correct regions
- **Download/Upload**: Save and load your polygon data as JSON files

## Local Development

To run locally with the Node.js server:

```bash
cd WineStudyTool
npm install
npm start
```

The server will run at http://localhost:3000

## Adding New Maps

1. Add your map image (PNG, JPG, etc.) to the `docs/maps/` folder
2. Update the `AVAILABLE_MAPS` array in `docs/app.js` with the new map name
3. Optionally, add a corresponding JSON file in `docs/polyregions/` with pre-defined regions

Example:
```javascript
const AVAILABLE_MAPS = [
  { name: 'France11.png', dataFile: 'France11.json' },
  { name: 'Bordeaux.png', dataFile: 'Bordeaux.json' },
  { name: 'YourNewMap.png', dataFile: 'YourNewMap.json' }
];
```

## How to Use

### Setup Mode
1. Select a map from the dropdown
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
