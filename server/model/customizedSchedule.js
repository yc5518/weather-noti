const mongoose = require('mongoose');
const moment = require('moment');

const customizedScheduleSchema = mongoose.Schema({
  _id: String,
  city: {
    type: String,
    required: true,
    index: true,
  },
  destination: {
    type: String,
    required: true,
    unique: true,
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
  cronJobSchedule: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    required: true,
  },
}, {
  timestamps: true,
});
const CustomizedSchedule = module.exports = mongoose.model('cutomizedSchedule', customizedScheduleSchema);
module.exports.get = (callback, limit) => {
  CustomizedSchedule.find(callback).limit(limit);
};
