const mongoose = require('mongoose');
const moment = require('moment');

const scheduleSchema = mongoose.Schema({
  _id: String,
  city: {
    type: String,
    required: true,
  },
  destination: {
    type: String,
    require: true,
  },
  timezone: {
    type: String,
    enum: moment.tz.names(),
    required: true,
  },
  conditions: {
    type: Array,
    required: true,
  },
  scheduledTime: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});
const Schedule = module.exports = mongoose.model('schedule', scheduleSchema);
module.exports.get = (callback, limit) => {
  Schedule.find(callback).limit(limit);
};
