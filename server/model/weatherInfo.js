const mongoose = require('mongoose');

const weatherInfoSchema = mongoose.Schema({
  _id: String,
  weather: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});
const WeatherInfo = module.exports = mongoose.model('weatherInfo', weatherInfoSchema);
module.exports.get = (callback, limit) => {
  WeatherInfo.find(callback).limit(limit);
};
