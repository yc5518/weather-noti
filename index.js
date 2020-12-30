const { CronJob } = require('cron');
const express = require('express');
const axios = require('axios');
const moment = require('moment');
const { v4: uuid } = require('uuid');
const log4js = require('log4js');

const logger = log4js.getLogger();
logger.level = 'trace';

const sendSMSViaTextBelt = require('./server/utils/textBeltSMSSender');

require('dotenv-flow').config();
const connectDB = require('./server/initDB');

const SMS = require('./server/model/sms');
const WeatherInfo = require('./server/model/weatherInfo');
const StandardSchedule = require('./server/model/standardSchedule');

// const app = express();
const { env } = process;
// const port = env.PORT || 8080;

// eslint-disable-next-line max-len
const updateDB = async (result, smsContent, isSent = true, reason, destination = env.PHONE_NUM_DEFAULT) => {
  const sms = new SMS({
    _id: uuid(),
    content: smsContent,
    destination,
    isSent,
    reason,
  });

  const smsPromise = await sms.save()
    .catch(
      (err) => {
        logger.error(`SMS is not updated to DB: ${err}`);
      },
    );

  const weatherInfo = new WeatherInfo({
    _id: uuid(),
    weather: JSON.stringify(result),
  });

  const weatherInfoPromise = await weatherInfo.save()
    .catch(
      (err) => {
        logger.error(`weatherInfo is not updated to DB: ${err}`);
      },
    );

  Promise.all([smsPromise, weatherInfoPromise]);
};

const sendNotification = async () => {
  const result = await axios.get(`http://api.weatherapi.com/v1/forecast.json?key=${env.WEATHER_API_KEY}&q=${env.WEATHER_API_CITY}&days=1`).then((response) => response.data);
  let smsContent = '';
  const today = result.forecast.forecastday[0].day;

  smsContent = `${smsContent}Max: ${today.maxtemp_c}C. Min: ${today.mintemp_c}C. `;

  if (today.maxtemp_c > env.WEATHER_INCLEMENT_WEATHER_ALLOWANCE_THRESHOLD) {
    smsContent = `${smsContent}(Take care and may be eligible for inclement weather allowance:-P) `;
  }

  smsContent = `${smsContent}Wind: ${today.maxwind_kph}km per hour. `;

  if (today.daily_will_it_rain) {
    smsContent = `${smsContent}${today.daily_chance_of_rain}% chance to rain. `;
  } else {
    smsContent = `${smsContent}No rain. `;
  }

  smsContent = `${smsContent}UV level: ${today.uv}. (Max is 11). Stay safe.`;

  if (smsContent !== '') {
    await sendSMSViaTextBelt({
      destination: env.PHONE_NUM_DEFAULT,
      message: smsContent,
      key: env.SMS_API_KEY,
    }).then((response) => {
      if (response.data.success) {
        logger.trace(`SMS sent to ${env.PHONE_NUM_DEFAULT}.`);
        updateDB(result, smsContent, true);
      } else {
        logger.warn(`SMS to ${env.PHONE_NUM_DEFAULT} is not sent: ${JSON.stringify(response.data)}`);
        updateDB(result, smsContent, false, response.data.error);
      }
    });
  }
};
const job = new CronJob(env.CRON_JOB_SCHEDULE, async () => {
  const now = moment().tz(env.CRON_JOB_TIMEZONE);
  logger.trace(`Cron job ran at ${now.toString()}`);

  // Find schedule
  // StandardSchedule.find({nextRunTime: })

  const recent12HoursInMilSec = 12 * 60 * 60 * 1000;
  const existingSentSMS = await SMS.findOne({
    destination: env.PHONE_NUM_DEFAULT,
    isSent: true,
    createdAt: { $gt: new Date(Date.now() - recent12HoursInMilSec) },
  });

  // Not a good idea to use "env.NODE_ENV === 'production'" here, will improve later.
  if (existingSentSMS === null && env.NODE_ENV !== 'production') {
    await sendNotification();
  }
}, null, true, env.CRON_JOB_TIMEZONE);

const start = async () => {
  logger.trace(`---Running cron job on ${env.PHONE_NUM_DEFAULT} on schedule ${env.CRON_JOB_SCHEDULE}`);
  // TODO: need to make sure cron job starts after db connected
  await connectDB();
  job.start();
};

start();

// app.listen(port, () => {
//   logger.trace(`Running Weather-naughty on port ${port}`);
// });
