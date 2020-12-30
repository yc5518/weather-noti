const mongoose = require('mongoose');

const smsSchema = mongoose.Schema({
  _id: String,
  content: {
    type: String,
    required: true,
  },
  destination: {
    type: String,
    required: true,
    index: true,
  },
  isSent: {
    type: Boolean,
    required: true,
  },
  reason: {
    type: String,
    required: false,
  },
}, {
  timestamps: true,
});
const SMS = module.exports = mongoose.model('sms', smsSchema);
module.exports.get = (callback, limit) => {
  SMS.find(callback).limit(limit);
};
