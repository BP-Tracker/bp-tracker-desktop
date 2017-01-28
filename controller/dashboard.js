var express = require('express');
var router = express.Router();
var m = require('../middleware');
var logger = require('../middleware/logger');
var debug = require('debug')('dashboard:dashboard');


router.get('/', m.loginRequired, function(req, res, next) {

  res.render('dashboard', { title: 'BP Tracker Dashboard' });


  /*
  //logger.debug('test')
  debug('index called')

  var f = res.app.get("has_access");
  f();

  //console.log(req.session);
  */

});

module.exports = router;
