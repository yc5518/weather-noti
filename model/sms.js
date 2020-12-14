const mongoose = require('mongoose');

const smsSchema= mongoose.Schema({
  _id: String,
  content: {
      type: String,
      required: true,
  },
  destination: {
      type: String,
      require: true,
  },
}, {
  timestamps: true,
});
const SMS = module.exports = mongoose.model('sms', smsSchema);
module.exports.get = function (callback, limit) {
  SMS.find(callback).limit(limit);
};
