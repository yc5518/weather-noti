const { CronJob } = require('cron');
const axios = require('axios');
const moment = require('moment');
const { v4: uuid } = require('uuid');
const log4js = require('log4js');

const logger = log4js.getLogger();
logger.level = 'trace';

const sendSMSViaTextBelt = require('../sender/textBeltSMSSender');

require('dotenv-flow').config();

const SMS = require('../model/sms');
const WeatherInfo = require('../model/weatherInfo');
const StandardSchedule = require('../model/standardSchedule');

const { env } = process;

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
    city: result.location.name,
  });

  const weatherInfoPromise = await weatherInfo.save()
    .catch(
      (err) => {
        logger.error(`weatherInfo is not updated to DB: ${err}`);
      },
    );

  Promise.all([smsPromise, weatherInfoPromise]);
};

const sendNotification = async (notificationInfo) => {
  // eslint-disable-next-line no-underscore-dangle
  const result = await axios.get(`http://api.weatherapi.com/v1/forecast.json?key=${env.WEATHER_API_KEY}&q=${notificationInfo._id.city}&days=1`).then((response) => response.data);
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
      // eslint-disable-next-line max-len
      destination: env.PHONE_NUM_DEFAULT, // TODO: NEED to change to bulk message accessing list of destination by `notificationInfo.destinationList`
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
    }).catch((err) => {
      logger.error(`----weather api error:${err}`);
    });
  }
};
const standardCronJob = new CronJob(env.CRON_JOB_SCHEDULE, async () => {
  const now = moment().tz(env.CRON_JOB_TIMEZONE);
  logger.trace(`Cron job ran at ${now.toString()}`);

  const recent12HoursInMilSec = 12 * 60 * 60 * 1000;
  const nextCronJobIntervalPlus5MinsInMilSec = env.CRON_JOB_SCHEDULE + 5 * 60 * 1000;

  const sendListGroupedByCity = StandardSchedule.aggregate([
    {
      $match: {
        $and: [
          {
            nextRunTime: {
              $lte: new Date(Date.now() + nextCronJobIntervalPlus5MinsInMilSec),
              $gte: Date.now(),
            },
          },
          {
            lastSentTime: {
              $lt: new Date(Date.now() - recent12HoursInMilSec),
            },
          },
          {
            disabled: false,
          },
        ],
      },
    },
    {
      $group: {
        _id: {
          city: '$city',
        },
        destinationList: {
          $addToSet: '$destination',
        },
      },
    },
  ]);

  // Not a good idea to use "env.NODE_ENV !== 'production'" here, will improve later.
  if (sendListGroupedByCity !== null || env.NODE_ENV !== 'production') {
    let sendNotificationPromiseArray;

    // eslint-disable-next-line max-len
    await sendListGroupedByCity.map((pair) => sendNotificationPromiseArray.push(sendNotification(pair)));

    await Promise.all(sendListGroupedByCity);
  }
}, null, true, env.CRON_JOB_TIMEZONE);

module.exports = standardCronJob;
