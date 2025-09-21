const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const CARS_JSON_PATH = path.join(app.getPath('userData'), 'cars.json');
const CARS_TSV_PATH = path.join(__dirname, 'car-list.tsv');

let cars = [];

// Sanitize memo input
const sanitizeMemo = (memo) => {
  if (typeof memo !== 'string') return '';
  return memo.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\t|\n|\r/g, ' ');
};

function initializeData() {
  // Prioritize cars.json as it contains user's modifications.
  if (fs.existsSync(CARS_JSON_PATH)) {
    const jsonData = fs.readFileSync(CARS_JSON_PATH, 'utf-8');
    cars = JSON.parse(jsonData);
    console.log('Loaded existing data from cars.json');
  } 
  // If cars.json doesn't exist, initialize from tsv as a one-time setup.
  else if (fs.existsSync(CARS_TSV_PATH)) {
    console.log('cars.json not found. Initializing from car-list.tsv...');
    const tsvData = fs.readFileSync(CARS_TSV_PATH, 'utf-8');
    const lines = tsvData.trim().split(/\r?\n/);
    const headers = lines[0].split('\t').map(h => h.trim().toLowerCase().replace(' ', '_'));

    cars = lines.slice(1).map((line, index) => {
      const values = line.split('\t');
      const car = { id: index };
      
      // Explicitly map columns to fix parsing bug
      car.year = values[0] ? parseInt(values[0].trim(), 10) || null : null;
      car.car_model = values[1] ? values[1].trim() : '';
      car.car_type = values[2] ? values[2].trim() : '';
      car.collect = values[3] ? values[3].trim() : '';
      car.added = values[4] ? values[4].trim() : '';
      car.owned = values[5] ? values[5].trim() : 'N';
      car.price = values[6] ? parseFloat(values[6].trim()) || 0 : 0;
      car.memo = values[7] ? sanitizeMemo(values[7].trim()) : '';

      return car;
    });

    fs.writeFileSync(CARS_JSON_PATH, JSON.stringify(cars, null, 2));
    console.log('Successfully initialized and created cars.json from car-list.tsv');

  } else {
      console.error('FATAL: No data source found. Neither cars.json nor car-list.tsv exist.');
  }
}

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('public/index.html');
}

app.whenReady().then(() => {
  initializeData();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-cars', async (event, args) => {
  let results = [...cars];
  const { q, sortBy, sortOrder = 'asc' } = args;

  if (q) {
    const searchTerm = q.toLowerCase();
    results = results.filter(car =>
      Object.values(car).some(val =>
        String(val).toLowerCase().includes(searchTerm)
      )
    );
  }

  if (sortBy) {
    results.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      
      let comparison = 0;
      if (valA > valB) {
        comparison = 1;
      } else if (valA < valB) {
        comparison = -1;
      }
      return sortOrder === 'desc' ? comparison * -1 : comparison;
    });
  }

  return results;
});

const updateCarData = (carData) => {
    const newCar = {};
    newCar.year = carData.year ? parseInt(carData.year, 10) || null : null;
    newCar.car_model = carData.car_model || '';
    newCar.car_type = carData.car_type || '';
    newCar.collect = carData.collect || '';
    newCar.added = carData.added || '';
    newCar.owned = carData.owned || 'N';
    newCar.price = parseFloat(carData.price) || 0;
    newCar.memo = sanitizeMemo(carData.memo);
    return newCar;
}

ipcMain.handle('add-car', async (event, carData) => {
  const newCar = updateCarData(carData);
  newCar.id = cars.length > 0 ? Math.max(...cars.map(c => c.id)) + 1 : 0;
  cars.push(newCar);
  fs.writeFileSync(CARS_JSON_PATH, JSON.stringify(cars, null, 2));
  return newCar;
});

ipcMain.handle('update-car', async (event, carData) => {
  const carId = parseInt(carData.id, 10);
  const carIndex = cars.findIndex(c => c.id === carId);

  if (carIndex === -1) {
    return { message: 'Car not found' };
  }

  const originalCar = cars[carIndex];
  const updatedCar = { ...originalCar, ...carData };

  if (carData.hasOwnProperty('year')) {
    updatedCar.year = carData.year ? parseInt(carData.year, 10) || null : null;
  }
  if (carData.hasOwnProperty('price')) {
    updatedCar.price = parseFloat(carData.price) || 0;
  }
  if (carData.hasOwnProperty('memo')) {
    updatedCar.memo = sanitizeMemo(carData.memo);
  }

  cars[carIndex] = updatedCar;
  fs.writeFileSync(CARS_JSON_PATH, JSON.stringify(cars, null, 2));
  return cars[carIndex];
});