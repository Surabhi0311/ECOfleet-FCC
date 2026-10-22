const mongoose = require('mongoose');
const schema = (fields, options = {}) => new mongoose.Schema(fields, {
  timestamps: true,
  ...options
});
const Zone = mongoose.model('Zone', schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  area: String
}));
const Category = mongoose.model('Category', schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  handling: String
}));
const Generator = mongoose.model('Generator', schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Hospital', 'Housing Society', 'Factory', 'Hotel', 'School'],
    required: true
  },
  contact: String,
  email: String,
  address: String,
  zone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}));
const User = mongoose.model('User', schema({
  name: String,
  username: {
    type: String,
    unique: true
  },
  email: String,
  passwordHash: String,
  role: {
    type: String,
    enum: ['ADMIN', 'OPERATOR', 'DRIVER', 'GENERATOR'],
    required: true
  },
  generator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Generator'
  },
  active: {
    type: Boolean,
    default: true
  }
}));
const Vehicle = mongoose.model('Vehicle', schema({
  registration: {
    type: String,
    unique: true
  },
  capacityKg: Number,
  zone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone'
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  active: {
    type: Boolean,
    default: true
  }
}));
const Facility = mongoose.model('Facility', schema({
  name: String,
  address: String,
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }]
}));
const Request = mongoose.model('PickupRequest', schema({
  generator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Generator',
    required: true
  },
  items: [{
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    },
    estimatedKg: {
      type: Number,
      min: 0
    },
    actualKg: {
      type: Number,
      min: 0
    }
  }],
  preferredDate: Date,
  status: {
    type: String,
    enum: ['Pending', 'Planned', 'In Progress', 'Collected', 'Disposed', 'Cancelled'],
    default: 'Pending'
  },
  notes: String,
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  }
}));
const Route = mongoose.model('Route', schema({
  date: {
    type: Date,
    default: Date.now
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  stops: [{
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PickupRequest'
    },
    sequence: Number,
    status: {
      type: String,
      default: 'Pending'
    },
    arrivedAt: Date,
    completedAt: Date,
    skipReason: String
  }],
  status: {
    type: String,
    enum: ['Planned', 'In Progress', 'Completed'],
    default: 'Planned'
  }
}));
const Disposal = mongoose.model('DisposalRecord', schema({
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  },
  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  quantityKg: Number,
  checkedInBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  checkedInAt: {
    type: Date,
    default: Date.now
  }
}));
module.exports = {
  Zone,
  Category,
  Generator,
  User,
  Vehicle,
  Facility,
  Request,
  Route,
  Disposal
};
