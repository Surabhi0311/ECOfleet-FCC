require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const api = require('./routes/api');
const M = require('./models');
const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL || true
}));
app.use(express.json({
  limit: '1mb'
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', api);
app.get('/api/health', (req, res) => res.json({
  ok: true,
  service: 'ECOfleet API'
}));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500).json({
    error: err.code === 11000 ? 'That value already exists.' : err.message || 'Server error'
  });
});
// Seed a small demo city only when the MongoDB database has no users.
async function seed() {
  if (await M.User.countDocuments()) return;
  const [zone] = await M.Zone.create([{
    name: 'Central',
    area: 'Central District'
  }, {
    name: 'North',
    area: 'North District'
  }, {
    name: 'South',
    area: 'South District'
  }]);
  const cat = await M.Category.create([{
    name: 'Organic',
    handling: 'Compost'
  }, {
    name: 'Recyclable',
    handling: 'Sort and recycle'
  }, {
    name: 'General',
    handling: 'Municipal processing'
  }, {
    name: 'Biomedical',
    handling: 'Licensed facility'
  }, {
    name: 'Electronic',
    handling: 'E-waste facility'
  }, {
    name: 'Chemical',
    handling: 'Hazardous waste facility'
  }]);
  const gen = await M.Generator.create({
    name: 'City General Hospital',
    type: 'Hospital',
    contact: '+91 98765 43210',
    email: 'hospital@example.com',
    address: 'Central District',
    zone: zone._id
  });
  const passwordHash = await bcrypt.hash('Password@123', 10);
  const users = await M.User.create([{
    name: 'System Administrator',
    username: 'admin',
    passwordHash,
    role: 'ADMIN'
  }, {
    name: 'Dispatch Operator',
    username: 'operator1',
    passwordHash,
    role: 'OPERATOR'
  }, {
    name: 'Collection Driver',
    username: 'driver1',
    passwordHash,
    role: 'DRIVER'
  }, {
    name: 'City General Hospital',
    username: 'hospital_gen',
    passwordHash,
    role: 'GENERATOR',
    generator: gen._id
  }]);
  gen.user = users[3]._id;
  await gen.save();
  await M.Vehicle.create([{
    registration: 'MH12-EF-1042',
    capacityKg: 2500,
    zone: zone._id,
    driver: users[2]._id
  }, {
    registration: 'MH12-EF-2088',
    capacityKg: 1800,
    zone: zone._id
  }]);
  await M.Facility.create([{
    name: 'GreenCycle Recovery',
    address: 'North Industrial Estate',
    categories: cat.slice(0, 3).map(c => c._id)
  }, {
    name: 'SecureMed Disposal',
    address: 'East Medical Park',
    categories: [cat[3]._id, cat[5]._id]
  }, {
    name: 'E-Loop Center',
    address: 'West Reuse Park',
    categories: [cat[4]._id]
  }]);
  await M.Request.create([{
    generator: gen._id,
    items: [{
      category: cat[0]._id,
      estimatedKg: 120
    }, {
      category: cat[1]._id,
      estimatedKg: 35
    }],
    preferredDate: new Date(Date.now() + 86400000),
    notes: 'Demo pickup'
  }]);
}
const configuredPort = Number(process.env.PORT || 5050);
// macOS commonly reserves port 5000 for its AirPlay/Control Center service.
const port = configuredPort === 5000 ? 5050 : configuredPort;
// Connect first so API requests never run against an unavailable database.
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecofleet').then(async () => {
  if (process.env.SEED_DEMO !== 'false') await seed();
  if (fs.existsSync(path.join(__dirname, '../client/dist'))) {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));
  }
  app.listen(port, () => {
    if (configuredPort === 5000) console.warn('Port 5000 is busy on this Mac; using 5050 instead.');
    console.log(`ECOfleet API listening on ${port}`);
  });
}).catch(e => {
  console.error('MongoDB connection failed:', e.message);
  process.exit(1);
});
