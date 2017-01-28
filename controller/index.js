var express = require('express');
var router = express.Router();
var logger = require('../middleware/logger');
var debug = require('debug')('dashboard:index');

/* home page */
router.get('/', function(req, res, next) {
  debug('index called')

  if(req.session.user && req.session.user.access_token){
    res.redirect('/dashboard');
    return;
  }

  res.render('index', { title: 'BP Tracker' });
});

module.exports = router;
