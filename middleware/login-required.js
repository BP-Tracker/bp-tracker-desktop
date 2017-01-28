'use strict';

module.exports = function(req, res, next){
  if(req.session.user){ //TODO: check token
    return next();
  }

  res.redirect('/login');
}
