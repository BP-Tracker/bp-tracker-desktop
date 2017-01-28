var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('./middleware/logger');
var debug = require('debug')('dashboard:app');
var bodyParser = require('body-parser');
var helmet = require('helmet');
var dotenv = require('dotenv');

// opts:
//  session : express-session object (required)
//  port: port (required)
//  logStream : log stream (optional)
function App(opts){

  var app = express();

  app.set('port', opts.port);

  dotenv.load();

  app.locals.pretty = true; // pretty HTML output

  app.use(require('morgan')('common',
    opts.logStream ? {stream: opts.logStream} : {}));

  //app.use(require('morgan')('common'));

  // view engine setup
  app.set('views', path.join(__dirname, 'view'));
  app.set('view engine', 'pug');

  //app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
  app.use(helmet());
  app.use(require('stylus').middleware(path.join(__dirname, 'htdocs')));
  app.use(express.static(path.join(__dirname, 'htdocs')));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  debug(opts);

  app.use(opts.session);

  // controllers
  app.use('/', require('./controller/index'));
  app.use('/users', require('./controller/users'));
  app.use('/events', require('./controller/socket-events'));
  app.use('/profile', require('./controller/profile'));
  app.use('/login', require('./controller/login'));
  app.use('/dashboard', require('./controller/dashboard'));



  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  // error handler
  app.use(function(err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    res.status(err.status || 500);
    res.render('error'); // render the error page
  });

  app.set("has_access", function(){
    console.log('has_access called');
  });

  this.app = app;
  this.session = opts.session;

}

App.prototype = {
  getExpress: function(){
    return this.app;
  },

  getSessionMiddleware: function(){
    return this.session;
  },

  registerSocket: function(socket){
    //TODO
  }
};


module.exports = App;


//app.use(logger('dev'));
//app.use(require('morgan')("combined", { "stream" : logger.stream }));
////var cookieParser = require('cookie-parser');s
