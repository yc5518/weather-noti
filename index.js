const express = require('express');
const log4js = require('log4js');

const logger = log4js.getLogger();
logger.level = 'trace';

const standardCronJob = require('./server/cronjob/standardCronJob');

require('dotenv-flow').config();
const connectDB = require('./server/initDB');

const app = express();
const { env } = process;
const port = env.PORT || 8080;

const start = async () => {
  logger.trace(`---Running cron job on standard schedule ${env.CRON_JOB_SCHEDULE}`);
  // TODO: need to make sure cron job starts after db connected
  await connectDB();
  standardCronJob.start();

  // Use Api routes in the App
  app.use('/api/v1', apiRoutes);
  app.listen(port, () => {
    logger.trace(`Running Weather-naughty on port ${port}`);
  });
};

start();
