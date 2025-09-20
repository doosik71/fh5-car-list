
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const CARS_JSON_PATH = path.join(__dirname, 'cars.json');
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

app.use(express.json());
app.use(express.static('public'));

app.get('/api/cars', (req, res) => {
  let results = [...cars];
  const { q, sortBy, sortOrder = 'asc' } = req.query;

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

  res.json(results);
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

app.post('/api/cars', (req, res) => {
  const carData = updateCarData(req.body);
  carData.id = cars.length > 0 ? Math.max(...cars.map(c => c.id)) + 1 : 0;
  cars.push(carData);
  fs.writeFileSync(CARS_JSON_PATH, JSON.stringify(cars, null, 2));
  res.status(201).json(carData);
});

app.put('/api/cars/:id', (req, res) => {
  const carId = parseInt(req.params.id, 10);
  const carIndex = cars.findIndex(c => c.id === carId);

  if (carIndex === -1) {
    return res.status(404).json({ message: 'Car not found' });
  }

  // 기존 데이터에 요청받은 데이터(req.body)를 덮어쓰기하여 부분 업데이트 처리
  const originalCar = cars[carIndex];
  const updatedCar = { ...originalCar, ...req.body };

  // 데이터 타입 및 유효성 검사 (요청에 해당 필드가 있을 경우에만)
  if (req.body.hasOwnProperty('year')) {
    updatedCar.year = req.body.year ? parseInt(req.body.year, 10) || null : null;
  }
  if (req.body.hasOwnProperty('price')) {
    updatedCar.price = parseFloat(req.body.price) || 0;
  }
  if (req.body.hasOwnProperty('memo')) {
    updatedCar.memo = sanitizeMemo(req.body.memo);
  }

  cars[carIndex] = updatedCar;
  fs.writeFileSync(CARS_JSON_PATH, JSON.stringify(cars, null, 2));
  res.json(cars[carIndex]);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  initializeData();
  console.log(`Server is running on http://localhost:${PORT}`);
});
