const express = require('express');
const {
  URL
} = require('node:url');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const nodemailer = require('nodemailer');
const {
  auth,
  allow
} = require('../middleware/auth');
const M = require('../models');
const events = require('../services/events');
const router = express.Router();
const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
// Sign in, register generator accounts, and expose simple connection checks.
router.post('/auth/login', wrap(async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = await M.User.findOne({
    username,
    active: true
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({
    error: 'Username or password is incorrect.'
  });
  const requestedRole = String(req.body.role || '').trim().toUpperCase();
  if (requestedRole && requestedRole !== user.role) return res.status(403).json({
    error: `This account is registered as ${user.role}. Select the matching role to sign in.`
  });
  const token = jwt.sign({
    id: user.id,
    role: user.role,
    name: user.name,
    generator: user.generator
  }, process.env.JWT_SECRET, {
    expiresIn: '12h'
  });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role
    }
  });
}));
router.post('/auth/register', wrap(async (req, res) => {
  const {
    name,
    username,
    email,
    password,
    organization,
    type,
    contact,
    address,
    zone
  } = req.body;
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!name || !cleanUsername || !cleanEmail || typeof password !== 'string' || password.length < 8 || !organization || !type || !zone) return res.status(400).json({
    error: 'Complete all fields and use a password of at least 8 characters.'
  });
  if (!/^[a-z0-9._-]{3,30}$/.test(cleanUsername) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({
    error: 'Enter a valid username and email.'
  });
  const existingUser = await M.User.findOne({
    $or: [{ username: cleanUsername }, { email: cleanEmail }]
  });
  if (existingUser) return res.status(409).json({
    error: 'That username or email is already registered. Sign in or choose another.'
  });
  if (!await M.Zone.exists({ _id: zone })) return res.status(400).json({
    error: 'Choose an available service zone.'
  });
  const generator = await M.Generator.create({
    name: String(organization).trim().slice(0, 100),
    type,
    contact: String(contact || '').slice(0, 80),
    email: cleanEmail,
    address: String(address || '').slice(0, 240),
    zone
  });
  let user;
  try {
    user = await M.User.create({
      name: String(name).trim().slice(0, 80),
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'GENERATOR',
      generator: generator._id
    });
  } catch (error) {
    await M.Generator.deleteOne({ _id: generator._id });
    if (error.code === 11000) return res.status(409).json({
      error: 'That username or email is already registered. Sign in or choose another.'
    });
    throw error;
  }
  generator.user = user._id;
  await generator.save();
  const token = jwt.sign({
    id: user.id,
    role: user.role,
    name: user.name,
    generator: user.generator
  }, process.env.JWT_SECRET, {
    expiresIn: '12h'
  });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role
    }
  });
}));
router.get('/public/zones', wrap(async (req, res) => res.json(await M.Zone.find().select('name area'))));
router.get('/auth/me', auth, (req, res) => res.json({
  user: req.user
}));
router.get('/diagnostics/url', auth, (req, res) => res.json({
  pathname: new URL(req.originalUrl, 'http://localhost').pathname,
  query: Object.fromEntries(new URL(req.originalUrl, 'http://localhost').searchParams)
}));
// Read-only data used by the dashboard and reference-data dropdowns.
router.get('/dashboard', auth, wrap(async (req, res) => {
  const [requests, routes, vehicles, generators, disposed] = await Promise.all([M.Request.countDocuments(), M.Route.countDocuments({
    status: {
      $ne: 'Completed'
    }
  }), M.Vehicle.countDocuments({
    active: true
  }), M.Generator.countDocuments(), M.Disposal.aggregate([{
    $group: {
      _id: null,
      kg: {
        $sum: '$quantityKg'
      }
    }
  }])]);
  res.json({
    requests,
    activeRoutes: routes,
    vehicles,
    generators,
    disposedKg: disposed[0]?.kg || 0
  });
}));
router.get('/catalog', auth, wrap(async (req, res) => {
  const [zones, categories, vehicles, facilities, generators] = await Promise.all([M.Zone.find(), M.Category.find(), M.Vehicle.find().populate('zone driver'), M.Facility.find().populate('categories'), M.Generator.find().populate('zone')]);
  res.json({
    zones,
    categories,
    vehicles,
    facilities,
    generators
  });
}));
// A request belongs to one generator and can include several waste categories.
router.get('/requests', auth, wrap(async (req, res) => {
  let q = {};
  if (req.user.role === 'GENERATOR') {
    const g = await M.Generator.findOne({
      user: req.user.id
    });
    if (g) q.generator = g._id;
  }
  res.json(await M.Request.find(q).populate('generator items.category route').sort({
    createdAt: -1
  }));
}));
router.post('/requests', auth, allow('ADMIN', 'OPERATOR', 'GENERATOR'), wrap(async (req, res) => {
  let generator = req.body.generator;
  if (req.user.role === 'GENERATOR') {
    const g = await M.Generator.findOne({
      user: req.user.id
    });
    if (!g) return res.status(400).json({
      error: 'Your generator profile is not linked.'
    });
    generator = g._id;
  }
  const preferredDate = req.body.preferredDate ? new Date(req.body.preferredDate) : null;
  if (!preferredDate || Number.isNaN(preferredDate.getTime())) return res.status(400).json({
    error: 'Choose a valid preferred pickup date and time.'
  });
  if (preferredDate.getTime() <= Date.now()) return res.status(400).json({
    error: 'Pickup date and time must be in the future (India Standard Time).'
  });
  if (!Array.isArray(req.body.items) || !req.body.items.length) return res.status(400).json({
    error: 'Add at least one waste category and estimated quantity.'
  });
  for (const item of req.body.items) {
    if (!item.category || !Number.isFinite(Number(item.estimatedKg)) || Number(item.estimatedKg) <= 0) return res.status(400).json({
      error: 'Each waste stream must have a category and a positive estimated quantity.'
    });
  }
  const request = await M.Request.create({
    generator,
    items: req.body.items.map(item => ({
      category: item.category,
      estimatedKg: Number(item.estimatedKg)
    })),
    preferredDate,
    notes: String(req.body.notes || '').slice(0, 1000)
  });
  events.emit('request:created', {
    requestId: request.id
  });
  res.status(201).json(request);
}));
router.patch('/requests/:id/cancel', auth, wrap(async (req, res) => {
  const r = await M.Request.findById(req.params.id);
  if (!r) return res.status(404).json({
    error: 'Request not found'
  });
  if (req.user.role === 'GENERATOR') {
    const g = await M.Generator.findOne({
      user: req.user.id
    });
    if (String(r.generator) !== String(g?._id)) return res.status(403).json({
      error: 'Not your request'
    });
  }
  if (!['Pending', 'Planned'].includes(r.status)) return res.status(409).json({
    error: 'Only pending or planned requests can be cancelled.'
  });
  r.status = 'Cancelled';
  await r.save();
  res.json(r);
}));
// Operator planning: group by zone, fit requests to vehicle capacity, then save stops.
router.post('/routes/plan', auth, allow('ADMIN', 'OPERATOR'), wrap(async (req, res) => {
  const date = req.body.date ? new Date(req.body.date) : new Date();
  const requests = await M.Request.find({
    status: 'Pending',
    ...(req.body.date ? {
      preferredDate: {
        $lte: new Date(req.body.date + 'T23:59:59')
      }
    } : {})
  }).populate('generator items.category');
  const vehicles = await M.Vehicle.find({
    active: true
  }).populate('driver');
  if (!requests.length) return res.status(400).json({
    error: 'There are no pending requests to plan.'
  });
  if (!vehicles.length) return res.status(400).json({
    error: 'Add an active vehicle before planning.'
  });
  const groups = new Map();
  for (const r of requests) {
    const key = String(r.generator.zone);
    groups.set(key, [...(groups.get(key) || []), r]);
  }
  const created = [],
    unassigned = [],
    orderedVehicles = vehicles.slice().sort((a, b) => b.capacityKg - a.capacityKg);
  let vehicleCursor = 0;
  for (const group of groups.values()) {
    const batches = [];
    for (const request of group) {
      const weight = request.items.reduce((sum, item) => sum + (Number(item.estimatedKg) || 0), 0);
      const available = batches.find(batch => batch.load + weight <= batch.vehicle.capacityKg);
      if (available) {
        available.requests.push(request);
        available.load += weight;
        continue;
      }
      let selected = null;
      for (let offset = 0; offset < orderedVehicles.length; offset++) {
        const index = (vehicleCursor + offset) % orderedVehicles.length;
        const candidate = orderedVehicles[index];
        if (weight <= candidate.capacityKg) {
          selected = candidate;
          vehicleCursor = (index + 1) % orderedVehicles.length;
          break;
        }
      }
      if (!selected) {
        unassigned.push(request.id);
        continue;
      }
      batches.push({
        vehicle: selected,
        requests: [request],
        load: weight
      });
    }
    for (const batch of batches) {
      const stops = batch.requests.map((item, n) => ({
        request: item._id,
        sequence: n + 1
      }));
      const route = await M.Route.create({
        date,
        vehicle: batch.vehicle._id,
        driver: batch.vehicle.driver?._id,
        stops
      });
      for (const item of batch.requests) {
        item.status = 'Planned';
        item.route = route._id;
        await item.save();
      }
      created.push(route);
    }
  }
  events.emit('route:planned', {
    routeCount: created.length
  });
  res.status(201).json({
    created: created.length,
    routes: created,
    unassigned
  });
}));
// Drivers only receive routes assigned to their user account.
router.get('/routes', auth, wrap(async (req, res) => {
  const q = req.user.role === 'DRIVER' ? {
    driver: req.user.id
  } : {};
  res.json(await M.Route.find(q).populate('vehicle driver').populate({
    path: 'stops.request',
    populate: [{
      path: 'generator'
    }, {
      path: 'items.category'
    }]
  }).sort({
    date: -1
  }));
}));
router.patch('/routes/:routeId/stops/:stopId', auth, allow('ADMIN', 'OPERATOR', 'DRIVER'), wrap(async (req, res) => {
  const route = await M.Route.findById(req.params.routeId);
  if (!route) return res.status(404).json({
    error: 'Route not found'
  });
  if (req.user.role === 'DRIVER' && String(route.driver) !== req.user.id) return res.status(403).json({
    error: 'This route is assigned to another driver.'
  });
  const stop = route.stops.id(req.params.stopId);
  if (!stop) return res.status(404).json({
    error: 'Stop not found'
  });
  if (req.body.action === 'arrive') {
    stop.status = 'In Progress';
    stop.arrivedAt = new Date();
    route.status = 'In Progress';
    const r = await M.Request.findById(stop.request);
    if (r) {
      r.status = 'In Progress';
      await r.save();
    }
  } else if (req.body.action === 'complete') {
    stop.status = 'Completed';
    stop.completedAt = new Date();
    const r = await M.Request.findById(stop.request);
    if (r) {
      if (Array.isArray(req.body.actualKg)) r.items.forEach((it, i) => {
        if (req.body.actualKg[i] != null) it.actualKg = Number(req.body.actualKg[i]);
      });
      r.status = 'Collected';
      await r.save();
    }
  } else if (req.body.action === 'skip') {
    stop.status = 'Skipped';
    stop.skipReason = String(req.body.reason || 'No reason supplied').slice(0, 200);
  } else return res.status(400).json({
    error: 'Unknown stop action'
  });
  if (route.stops.every(s => ['Completed', 'Skipped'].includes(s.status))) route.status = 'Completed';
  await route.save();
  res.json(route);
}));
// Disposal closes the pickup lifecycle and checks facility categories.
router.post('/disposals', auth, allow('ADMIN', 'OPERATOR'), wrap(async (req, res) => {
  const facility = await M.Facility.findById(req.body.facility);
  if (!facility) return res.status(400).json({
    error: 'Choose an existing disposal facility.'
  });
  if (!facility.categories.some(id => String(id) === String(req.body.category))) return res.status(400).json({
    error: 'This facility does not accept that waste category.'
  });
  const d = await M.Disposal.create({
    ...req.body,
    checkedInBy: req.user.id
  });
  events.emit('disposal:recorded', {
    recordId: d.id
  });
  const route = await M.Route.findById(req.body.route);
  if (route && route.status === 'Completed') {
    for (const stop of route.stops) {
      const r = await M.Request.findById(stop.request);
      if (r) {
        r.status = 'Disposed';
        await r.save();
      }
    }
  }
  res.status(201).json(d);
}));
// Aggregation pipelines calculate reports from stored operational records.
router.get('/reports', auth, allow('ADMIN', 'OPERATOR'), wrap(async (req, res) => {
  const [status, byCategory, byZone, weekly] = await Promise.all([M.Request.aggregate([{
    $group: {
      _id: '$status',
      count: {
        $sum: 1
      }
    }
  }]), M.Disposal.aggregate([{
    $lookup: {
      from: 'categories',
      localField: 'category',
      foreignField: '_id',
      as: 'cat'
    }
  }, {
    $unwind: '$cat'
  }, {
    $group: {
      _id: '$cat.name',
      kg: {
        $sum: '$quantityKg'
      }
    }
  }, {
    $sort: {
      kg: -1
    }
  }]), M.Request.aggregate([{
    $lookup: {
      from: 'generators',
      localField: 'generator',
      foreignField: '_id',
      as: 'gen'
    }
  }, {
    $unwind: '$gen'
  }, {
    $lookup: {
      from: 'zones',
      localField: 'gen.zone',
      foreignField: '_id',
      as: 'zone'
    }
  }, {
    $unwind: '$zone'
  }, {
    $group: {
      _id: '$zone.name',
      count: {
        $sum: 1
      }
    }
  }]), M.Disposal.aggregate([{
    $group: {
      _id: {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$checkedInAt'
        }
      },
      kg: {
        $sum: '$quantityKg'
      }
    }
  }, {
    $sort: {
      _id: 1
    }
  }, {
    $limit: 14
  }])]);
  res.json({
    status,
    byCategory,
    byZone,
    weekly
  });
}));
// Admin-only setup and account management.
router.get('/admin/users', auth, allow('ADMIN'), wrap(async (req, res) => res.json(await M.User.find().select('name username email role active generator').populate('generator', 'name').sort({
  role: 1,
  username: 1
}))));
router.post('/admin/users', auth, allow('ADMIN'), wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const role = String(req.body.role || '').trim().toUpperCase();
  if (!name || !/^[a-z0-9._-]{3,30}$/.test(username) || password.length < 8 || !['OPERATOR', 'DRIVER'].includes(role)) {
    return res.status(400).json({ error: 'Enter a name, a valid username (3–30 letters/numbers/._-), a password of at least 8 characters, and Operator or Driver role.' });
  }
  if (await M.User.findOne({ username })) return res.status(409).json({ error: 'That username already exists.' });
  const user = await M.User.create({
    name: name.slice(0, 80),
    username,
    passwordHash: await bcrypt.hash(password, 10),
    role
  });
  res.status(201).json({ id: user.id, name: user.name, username: user.username, role: user.role, active: user.active });
}));
router.patch('/admin/users/:id/active', auth, allow('ADMIN'), wrap(async (req, res) => {
  if (req.user.id === req.params.id && req.body.active === false) return res.status(400).json({
    error: 'You cannot deactivate your own account.'
  });
  const user = await M.User.findByIdAndUpdate(req.params.id, {
    active: Boolean(req.body.active)
  }, {
    new: true
  }).select('name username role active');
  if (!user) return res.status(404).json({
    error: 'User not found'
  });
  res.json(user);
}));
router.post('/admin/catalog/:type', auth, allow('ADMIN'), wrap(async (req, res) => {
  const models = {
    zones: M.Zone,
    categories: M.Category,
    vehicles: M.Vehicle,
    facilities: M.Facility,
    generators: M.Generator
  };
  const model = models[req.params.type];
  if (!model) return res.status(404).json({
    error: 'Unknown catalog'
  });
  res.status(201).json(await model.create(req.body));
}));
// Course demonstrations: uploads, filesystem, email, and Node URL parsing.
router.post('/files', auth, allow('ADMIN', 'OPERATOR', 'GENERATOR'), upload.single('file'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({
    error: 'Select a file'
  });
  const name = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
  const target = path.join(path.dirname(req.file.path), `${Date.now()}-${name}`);
  await fs.rename(req.file.path, target);
  res.status(201).json({
    name,
    url: `/uploads/${path.basename(target)}`
  });
}));
router.post('/admin/notify', auth, allow('ADMIN', 'OPERATOR'), wrap(async (req, res) => {
  if (!process.env.EMAIL_HOST) return res.status(503).json({
    error: 'Configure EMAIL_HOST and credentials to enable email.'
  });
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: req.body.to,
    subject: req.body.subject || 'ECOfleet update',
    text: req.body.message
  });
  res.json({
    sent: true
  });
}));
module.exports = router;
