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

  smsContent = `${smsContent}Max: ${today.maxtemp_c}C. Min: ${today.mintemp_c}C. %0a`;

  smsContent = `${smsContent}Wind: ${today.maxwind_kph}km/h. `;

  smsContent = `${smsContent}It may rain today with chance of ${today.daily_chance_of_rain}%. `;

  smsContent = `${smsContent}UV level: ${today.uv}. (Max is 11). `;

  if (smsContent !== '') {
    // await axios.post('http://textbelt.com/text', {
    //   phone: env.PHONE_NUM_DEFAULT,
    //   message: smsContent,
    //   key: env.SMS_API_KEY,
    // }).then((response) => {
    //   console.log(response.data);
    // });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ZGVqczU4NTk6WjczOVRDR3g=', // env.SMS_AUTHORIZATION,
    };

    await axios.post('https://rest-api.d7networks.com/secure/send', {
      to: env.PHONE_NUM_DEFAULT,
      content: smsContent,
      from: 'Chao',
    }, {
      headers,
    }).then((response) => {
      console.log(response.data);
      updateDB(result, smsContent);
    }).catch((err) => {
      console.log(`---${err.response.status}: ${err.response.statusText}`);
    });

    // await updateDB(result, smsContent);
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
