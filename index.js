const { CronJob } = require('cron');
const express = require('express');
const axios = require('axios');
const moment = require('moment');
const { v4: uuid } = require('uuid');

require('dotenv-flow').config();
require('./server/initDB')();

const SMS = require('./server/model/sms');
const WeatherInfo = require('./server/model/weatherInfo');

const app = express();
const { env } = process;

const updateDB = async (result, smsContent, destination = env.PHONE_NUM_DEFAULT) => {
  const sms = new SMS({
    _id: uuid(),
    content: smsContent,
    destination,
  });

  const smsPromise = await sms.save()
    .catch(
      (err) => {
        console.log('SMS is not updated to DB', err);
      },
    );

  const weatherInfo = new WeatherInfo({
    _id: uuid(),
    weather: JSON.stringify(result),
  });

  const weatherInfoPromise = await weatherInfo.save()
    .catch(
      (err) => {
        console.log('weatherInfo is not updated to DB', err);
      },
    );

  Promise.all([smsPromise, weatherInfoPromise]);
};

const getNotification = async () => {
  const now = moment().tz(env.CRON_JOB_TIMEZONE);
  console.log(`Cron job run at ${now.toString()}`);
  const result = await axios.get(`http://api.weatherapi.com/v1/forecast.json?key=${env.WEATHER_API_KEY}&q=${env.WEATHER_API_CITY}&days=1`).then((response) => response.data);
  let smsContent = '';
  const today = result.forecast.forecastday[0].day;

  smsContent = `${smsContent}Max: ${today.maxtemp_c}C. Min: ${today.mintemp_c}C. `;

  smsContent = `${smsContent}Wind: ${today.maxwind_kph}km per hour. `;

  if(today.daily_will_it_rain) {
    smsContent = `${smsContent}${today.daily_chance_of_rain}% chance to rain. `;
   } else {
    smsContent = `${smsContent}No rain. `;
  }

  smsContent = `${smsContent}UV level: ${today.uv}. (Max is 11).`;

  console.log(smsContent)
  if (smsContent !== '') {
    await axios.post('http://textbelt.com/text', {
      phone: env.PHONE_NUM_DEFAULT,
      message: smsContent,
      key: env.SMS_API_KEY,
    }).then((response) => {
      
      if(response.data.success){
        updateDB();
      } else {
        console.log(response.data);
      }
    });

  }
};
const job = new CronJob(env.CRON_JOB_SCHEDULE, async () => {
  const existingSMS = await SMS.findOne({
    destination: env.PHONE_NUM_DEFAULT,
    createdAt: { $gt: new Date(Date.now() - 12 * 60 * 60 * 1000) },
  });
  if (existingSMS === null) {
    getNotification();
  }
}, null, true, env.CRON_JOB_TIMEZONE);
console.log(`---Running cron job on ${env.PHONE_NUM_DEFAULT} on schedule ${env.CRON_JOB_SCHEDULE}`);
job.start();

app.listen(3000);
