var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var csurf = require('csurf');
var express = require('express');
var extend = require('xtend');
var forms = require('forms');
var logger = require('../middleware/logger');
var debug = require('debug')('dashboard:login');
var router = express.Router();

var Particle = require('particle-api-js');


var profileForm = forms.create({
  email: forms.fields.string({ required: true }),
  password: forms.fields.string({ required: true }),
});

function renderForm(req, res, locals){
  res.render('login', extend({
    title: 'Login',
    csrfToken: req.csrfToken(),
  },locals || {}));
}

router.use(csurf());

router.all('/', function(req, res) {
  profileForm.handle(req, {
    success: function(form){
      // The form library calls this success method if the
      // form is being POSTED and does not have errors
      //logger.error('success');
      debug('login form post');

      // TODO: validate args
      var pw = form.data.password;
      var email = form.data.email;

      //TODO: remove later
      /**
      if(form.data.email === 'test@test.com'){
        req.session.user = {
          username: form.data.email,
          token_type: 'bearer', // bearer
          access_token: '1fe2', // '1fe2...
          expires_in: 7776000, // 7776000
          login_time:  new Date().getTime(), // 1485202802978s
          refresh_token: 'd0833c', // 'd0833c
        };
        res.redirect('/dashboard');
        return;
      }
      **/

      // particle uses https to login (see particle-api-js/Defaults.js)
      // https://api.particle.io
      var particle = new Particle();
      particle.login({
        username: form.data.email,
        password: form.data.password}).then(function(data){
          debug('saving access token in session');

          req.session.user = {
            username: form.data.email,
            token_type: data.body.token_type, // bearer
            access_token: data.body.access_token, // '1fe2...
            expires_in: data.body.expires_in, // 7776000
            login_time:  new Date().getTime(), // 1485202802978s
            refresh_token: data.body.refresh_token, // 'd0833c
          };

          res.redirect('/dashboard');
        },
        function(err){
          logger.info("Login unsuccessful: " + err);

          renderForm(req, res, {
            errors: [{
              error: err
            }]
          });
        });
    },
    error: function(form){

      var errors = [];
      Object.keys(form.fields).forEach(function (key) {
        if (form.fields.hasOwnProperty(key)) {
          var field = form.fields[key];
          var error = field.error;

          if (error) {
            errors.push({ field: key, error: error });
          }
        }
      });

      renderForm(req, res, { errors: errors });
    },
    empty: function(){
      renderForm(req, res); // GET method call
    }
  });
});


router.use(function (err, req, res, next) {
  if (err.code === 'EBADCSRFTOKEN'){ // invalid csrf token
    logger.info('invalid CSRF token found');

    // session token is invalid or expired.
    renderForm(req, res, {
      errors:[{error:'Your form has expired.  Please try again.'}]
    });

    return;
  }

  return next(err);
});

module.exports = router;
