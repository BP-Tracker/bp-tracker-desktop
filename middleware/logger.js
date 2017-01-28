var Winston = require('winston');
require('winston-daily-rotate-file');

Winston.emitErrs = true;

var logger = new Winston.Logger({
    transports: [
        new Winston.transports.File({
            level: 'info',
            filename: './logs/error.log',
            json: false,
            maxSize: 5242880, //5 MB
            colorize: false,
            maxFiles: 5
        }),
        new Winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

module.exports = logger;
module.exports.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};


/*
new Winston.transports.DailyRotateFile({
    level: 'info',
    filename: './logs/error-',
    datePattern: 'yyyyMMdd.log',
    json: false,
    handleExceptions: true,
    colorize: false
}),
new Winston.transports.Console({
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true
})
 */
