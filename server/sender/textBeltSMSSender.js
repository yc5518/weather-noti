const axios = require('axios');

const sendSMSViaTextBelt = async ({ destination, message, key }) => axios.post('http://textbelt.com/text', {
  phone: destination,
  message,
  key,
});

module.exports = sendSMSViaTextBelt;
