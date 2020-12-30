const { connect, connection } = require('mongoose');

const log4js = require('log4js');

const logger = log4js.getLogger();
logger.level = 'trace';

const connectDB = async () => {
  const uri = process.env.DB_HOST;

  await connect(uri, {
    dbName: process.env.DB_NAME,
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
    .then(() => {
      logger.trace('Connection estabislished with MongoDB');
    })
    .catch((error) => logger.error(error.message));

  connection.on('connected', () => {
    logger.trace('Mongoose connected to DB Cluster');
  });

  connection.on('error', (error) => {
    logger.error(error.message);
  });

  connection.on('disconnected', () => {
    logger.error('Mongoose Disconnected');
  });

  process.on('SIGINT', () => {
    connection.close(() => {
      logger.warn('Mongoose connection closed on Application Timeout');
      process.exit(0);
    });
  });
};

module.exports = connectDB;
