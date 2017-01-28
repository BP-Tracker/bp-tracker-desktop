'use strict';

module.exports = function(req, res, next){
  if(req.user){ //TODO: check token
    return next();
  }

  res.status(401).end();
}
