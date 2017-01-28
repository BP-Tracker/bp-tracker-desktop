var express = require('express');
var router = express.Router();
var logger = require('../middleware/logger');
var debug = require('debug')('dashboard:socket');

//var io = require('socket.io')(router.app);

router.get('/', function(req, res, next) {
  debug('called events');

  // var socket = res.app.get("socket");
  // socket.test();

  //res.send('respond with a resource');
  res.render('socket-events', { title: 'BP Tracker' });
});

/*
io.on('connection', function(socket){
  debug('connected to socket');
});
*/



module.exports = router;
