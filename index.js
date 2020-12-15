const { CronJob } = require('cron');
const express = require('express');
const axios = require('axios');
const moment = require('moment');
const { v4: uuid } = require('uuid');

require('dotenv-flow').config();
require('./initDB')();

const SMS = require('./model/sms');
const WeatherInfo = require('./model/weatherInfo');

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

  if (today.maxtemp_c >= env.WEATHER_MAX_TEMPERATURE_THRESHOLD_C) {
    smsContent = `${smsContent}Hot day! Max temperature is ${today.maxtemp_c}. `;
  }

  if (today.maxwind_kph >= env.WEATHER_MAX_WIND_THRESHOLD_KPH) {
    smsContent = `${smsContent}A bit windy today. `;
  }

  if (today.avgvis_km <= env.WEATHER_MIN_VIS_THRESHOLD_KM) {
    smsContent = `${smsContent}Low visibility warning! Be careful when driving! `;
  }

  if (today.daily_will_it_rain) {
    smsContent = `${smsContent}It may rain today with chance of ${today.daily_chance_of_rain}%. `;
  }

  if (today.daily_will_it_snow) {
    smsContent = `${smsContent}It may snow today with chance of ${today.daily_chance_of_snow}%. `;
  }

  // if(today.uv >= 6) {
  //     smsContent = smsContent + `High UV alert. `;
  //     // await smsContent.concat(smsContent, `High UV alert. `);
  // }

  if (smsContent !== '') {
    await axios.post('http://textbelt.com/text', {
      phone: env.PHONE_NUM_DEFAULT,
      message: smsContent,
      key: env.SMS_API_KEY,
    }).then((response) => {
      console.log(response.data);
    });

    await updateDB(result, smsContent);
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

job.start();

app.listen(3000);
