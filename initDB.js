const { connect, connection } = require('mongoose');
const { config } = require('dotenv'); 

module.exports = () => {
 config(); //invoking the dotenv config here
 const uri = process.env.DB_HOST;

 connect(uri, {
        dbName: process.env.DB_NAME,
        user: process.env.DB_USER,
        pass: process.env.DB_PASS,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true
    })
        .then(() => {
            console.log('Connection estabislished with MongoDB');
        })
        .catch(error => console.error(error.message));

    connection.on('connected', () => {
        console.log('Mongoose connected to DB Cluster');
    })

    connection.on('error', (error) => {
        console.error(error.message);
    })

    connection.on('disconnected', () => {
        console.log('Mongoose Disconnected');
    })

    process.on('SIGINT', () => {
        connection.close(() => {
            console.log('Mongoose connection closed on Application Timeout');
            process.exit(0);
        })
    })
}