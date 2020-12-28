const mongoose = require('mongoose');
const moment = require('moment');

const standardScheduleSchema = mongoose.Schema({
  _id: String,
  city: {
    type: String,
    required: true,
  },
  destination: {
    type: String,
    required: true,
  },
  timezone: {
    type: String,
    enum: moment.tz.names(),
    required: true,
  },
  nextRunTime: {
    type: Date,
    required: true,
  },
  conditions: {
    type: Array,
    required: true,
  },
  disabled: {
    type: Boolean,
    required: true,
  },
}, {
  timestamps: true,
});
const StandardSchedule = module.exports = mongoose.model('standardSchedule', standardScheduleSchema);
module.exports.get = (callback, limit) => {
  StandardSchedule.find(callback).limit(limit);
};
