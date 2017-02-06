var debug = require('debug')('dashboard:socket');
var io = require('socket.io');

/**
 * particle-api-js uses this via babel-runtime
 * TODO: ensure the version used in particle-api-js matches this
 */
var Promise = require("core-js/library/fn/promise");
var Particle = require('particle-api-js');
var Esapi = require('node-esapi');

// ws://localhost:3000/socket.io/?EIO=3&transport=websocket&sid=5JhHyx_wrk0xoSGLAAAB

module.exports = WebSocket;

/**
 * Creates a websocket to communicate with the particle cloud
 * and relay event stream data to authorized clients
 *
 * Socket Events
 * 'request': 'devices' -> get a list of devices
 *
 * Socket Output Event
 * event: private event data from particle.io devices
 * devices: returns the list of particle.io devices
 *
 *
 * @param {http.Server|Number|Object} srv http server, port or options
 * @param {Object} [opts] session -> session middlewares
 */
// session required
function WebSocket(server, serverOpts, opts){
  this.opts = opts;
  this.serverOpts = serverOpts;
  this.io = io(server, serverOpts);
  this.esapiEncoder = Esapi.encoder();

  this.init();
}

WebSocket.prototype = {
  init: function(){

    // middleware order matters
    this.io.use(this.sessionMiddleware(this.opts.session));
    this.io.use(this.authMiddleware());

    // contains username => event stream
    this.particleSub = {};
    this.particle = new Particle();

    // register event handlers
    this.io.on('connection', this._onConnect.bind(this));
  },


  streamParticleEvents: function(socket, roomNs){
    debug('streamParticleEvents called');

    var user = this.getUser(socket);
    var auth = this.getUserAuthToken(socket);

    if(this.particleSub[user]){
      debug('warning: particle event stream for %s already started', user);
      return;
    }

    //this.particle.listDevices({ auth: auth }).then(console.log, console.error);
    var particleSub = this.particleSub;
    var encoder = this.esapiEncoder;

    this.particle.getEventStream({ auth: auth, deviceId: 'mine' }).then(
      function(stream){
          debug('connected to particle.io events stream');
          particleSub[user] = stream;

          stream.on('event', function(data){
            console.log('particle event data: ', data.name);

            if(!data){
              data = {};
            }

            socket.emit('event', {
              coreid: {
                raw: data.coreid, // "particle-internal"
                html: encoder.encodeForHTML(data.coreid || '')
              },
              published_at: {
                raw: data.published_at, // "2017-01-27T23:10:33.928Z"
                html: encoder.encodeForHTML(data.published_at || '')
              },
              ttl : {
                raw: data.ttl, // "60"
                html: encoder.encodeForHTML(data.ttl || '')
              },
              data: {
                raw: data.data, // "data":"{\"message_id\":9154353012622088000"
                html: encoder.encodeForHTML(data.data || '')
              },
              name: {
                raw: data.name, // 'hook-sent/bpt:event',
                html: encoder.encodeForHTML(data.name || '')
              }
            });
          });

          stream.on('end', function(){
            debug('error: stream ended');
            socket.emit('apperror', 'particle.io stream ended unexpectedly');
          });

          stream.on('abort', function(){
            debug('error: stream aborted');
            socket.emit('apperror', 'particle.io stream aborted unexpectedly');
          });

          stream.on('error', function(err){
            console.log('error from event stream', err);
            socket.emit('apperror', 'particle.io error: ' + err);
          })

      },function(err){
        debug('warning: particle.io connect error', err);
        var msg = 'could not connect to particle.io';
        if(err && err.errorDescription){
          msg += ' ' + err.errorDescription;
        }
        socket.emit('apperror', msg); // TODO: how to emit an error event?
      }
    );
  },

  isRoomEmpty(socket, ns){ // TODO: test
    // console.log('isRoomEmpty', socket.adapter.rooms[ns.name]);
    var room = socket.adapter.rooms[ns.name]; // GAH API!!
    if(!room){
      return true;
    }
    return room.length <= 0;
  },

  /**
   * Returns the session object bound to the socket.
   */
  getSession(socket){
    return socket.handshake.session;
  },

  /**
   * Returns a private user room which contains particle.io event data
   *
   * @return {Namespace} the namespace of the room
   */
  getEventsRoom(socket){
    var ns = 'private/' + this.getUser(socket) + '/events';
    return this.io.of(ns);
  },

  /**
   * is the room private?
   *
   * @param {String|Namespace} the room
   */
  isRoomPrivate(room){
    var s = typeof room === 'string' ? room : room.name;
    return s.startsWith('/private');
  },

  /**
   * Returns user object with keys
   * username, access_token, ...
   */
  getUser(socket){
    return this.getSession(socket).user.username;
  },

  getUserAuthToken(socket){
    return this.getSession(socket).user.access_token;
  },

  // Add session object to socket
  sessionMiddleware: function(session){
    // Credit: https://github.com/xpepermint/socket.io-express-session
    return function(socket, next){
      session(socket.handshake, {}, next);
    }
  },

  authMiddleware: function(){
    return function(socket, next){ // TODO
      debug('socket authMiddleware called');

      var s = socket.handshake.session;

      if(!s){
        debug('warning: session object not found for auth');
        return next(new Error('Login required'));
      }

      if(!s.user || !s.user.access_token){
          debug('warning: user or access_token is missing in session');
      }

      if(s.user && s.user.access_token){ // TODO: implement better check
        return next();
      }

      return next(new Error('Authentication required'));
    }
  },

  _onConnect: function(socket){
    debug('onConnect called');

    var user = this.getUser(socket);
    var eventsRoom = this.getEventsRoom(socket);

    if(this.isRoomEmpty(socket, eventsRoom)){
      this.streamParticleEvents(socket, eventsRoom);
    }

    socket.join(eventsRoom.name, function(){
      debug('%s joined room %s', user, eventsRoom.name);

    });

    socket.on('request', createDelegate(this._onRequest, this, [socket], true));
    socket.on('disconnect', createDelegate(this._onDisconnect, this, [socket], true));
  },

  _onDisconnect: function(reason, socket){ // TODO: test
    debug('onDisconnect called');

    var eventsRoom = this.getEventsRoom(socket);

    // close particlce events stream (if no more clients are connected)
    if(this.isRoomEmpty(socket, eventsRoom)){
      debug('events room is empty, closing open particle.io steam');

      var user = this.getUser(socket);
      var stream = this.particleSub[user];
      //console.log('user=', stream);
      if(stream){
          debug('closing particle.io event stream for user %s', user);
          stream.abort();
          delete this.particleSub[user];
      }
    }
  },

  /**
   * Process requests from clients
   * @param  {String} what       Accepts: 'devices|status:<deviceId>|gps:<deviceId>'
   * @param  {Function} callbackFn The callback function
   */
  _onRequest: function(what, callbackFn){
    var socket = arguments[arguments.length - 1];
    if(typeof callbackFn !== 'function'){
      socket.emit('apperror', 'request event expects a callback function');
      return;
    }

    if(typeof what !== 'string'){
      socket.emit('apperror', 'request name is invalid');
      return;
    }

    var type, data;
    var index = what.indexOf(":");
    if(index < 0){
      type = what;
      data = null;
    }else{
      type = what.substring(0, index);
      data = what.substring(index+1);
    }

    switch(type){
      case 'status':
        return this._requestDeviceStatus(socket, data, callbackFn);
      case 'devices':
        return this._requestDevices(socket, data, callbackFn);
      case 'location':
        return this._requestDeviceLocation(socket, data, callbackFn);
      default:
        socket.emit('apperror', 'unknown socket request');
    }
  },

  // bpt:status includes GPS data
  _requestDeviceStatus: function(socket, deviceId, callbackFn){
    var user = this.getUser(socket);
    var auth = this.getUserAuthToken(socket);

    var args = { // TODO: deny arbitrary deviceId?
      deviceId: deviceId, name: 'bpt:status', argument: '1', auth: auth
    };
    debug('device status request from %s', user);

    this.particle.callFunction(args).then(function(resp){
      callbackFn(resp.body.return_value);
    }).catch(function(err){
      debug('warning: could not request device status', err);

      var msg = 'could not retrieve device status';
      if(err && err.errorDescription){
        msg += ': ' + err.errorDescription;
      }
      socket.emit('apperror', msg);
    });
  },

  _requestDeviceLocation: function(socket, deviceId, callbackFn){
    var user = this.getUser(socket);
    var auth = this.getUserAuthToken(socket);
    debug('device location request from %s', user);

    var encoder = this.esapiEncoder;
    var particle = this.particle;

    //TODO: complete
  },

  // saves and/or retrives device info into session
  // before emitting the data
  _requestDevices: function(socket, command, callbackFn){
    var user = this.getUser(socket);
    var auth = this.getUserAuthToken(socket);
    debug('devices request from %s', user);

    var encoder = this.esapiEncoder;
    var particle = this.particle;

    var cached = this.getSession(socket).devices;
    if(cached){
      callbackFn(cached);
      return;
    }

    particle.listDevices({ auth: auth }).then(
      function(devices){
        var d = [];
        devices.body.forEach(function(device){
          d.push(
            new Promise(function(resolve, reject){
              // ask particle.io for function signatures
              // NB: need to this because listDevices does not contain function info
              particle.getDevice({auth: auth, deviceId: device.id }).then(
                function(resp){
                  debug('received metadata for device %s', device.id);
                  var attrs = resp.body;
                  var isBpt = attrs.functions
                    && attrs.functions[0].startsWith("bpt") ? true : false

                  var dev = {
                    id: {
                      raw: attrs.id,
                      html: encoder.encodeForHTML(attrs.id)
                    },
                    name: {
                      raw: attrs.name,
                      html: encoder.encodeForHTML(attrs.name)
                    },
                    running_bpt: isBpt
                  };
                  resolve(dev);
                }, reject
              )
            })
          );
        });
        return Promise.all(d);
    }).then(function(data){ // save device data to session
      return new Promise(function(resolve, reject){
        socket.handshake.session.devices = data;
        socket.handshake.session.save(function(err){
          if(err){
            reject(err);
          }else{
            resolve(data);
          }
        });
      });

    }).then(callbackFn).catch(function(err){
      debug('warning: particle.io connect error', err);

      var msg = 'could not connect to particle.io';
      if(err && err.errorDescription){
        msg += ' ' + err.errorDescription;
      }
      socket.emit('apperror', msg);
    });
  },

};


/**
 * ExtJS 2.2
 * Creates a delegate (callback) that sets the scope to obj.
 * Will create a function that is automatically scoped to obj so that the <tt>this</tt> variable inside the
 * callback points to obj.

 * @param {Object} obj (optional) The object for which the scope is set
 * @param {Array} args (optional) Overrides arguments for the call. (Defaults to the arguments passed by the caller)
 * @param {Boolean/Number} appendArgs (optional) if True args are appended to call args instead of overriding,
 *                                             if a number the args are inserted at the specified position
 * @return {Function} The new function
 */
function createDelegate(fn, obj, args, appendArgs){
    var method = fn;
    return function() {
        var callArgs = args || arguments;
        if(appendArgs === true){
            callArgs = Array.prototype.slice.call(arguments, 0);
            callArgs = callArgs.concat(args);
        }else if(typeof appendArgs == "number"){
            callArgs = Array.prototype.slice.call(arguments, 0); // copy arguments first
            var applyArgs = [appendArgs, 0].concat(args); // create method call params
            Array.prototype.splice.apply(callArgs, applyArgs); // splice them in
        }
        return method.apply(obj || window, callArgs);
    };
};


/* particle.io listDevices sample output:
{ body: [
  { id: '3a001e001447341234567890',
   name: 'Device1',
   last_app: null,
   last_ip_address: '23.233.49.174',
   last_heard: '2016-11-14T21:14:38.615Z',
   product_id: 6,
   connected: false,
   platform_id: 6,
   cellular: true,
   status: 'normal',
   last_iccid: '8934076501234567890', // celluar only
   imei: '353161234567890',           // celluar only
   current_build_target: '0.5.3',     // celluar only
   default_build_target: '0.5.3' }    // celluar only
   status: 'normal' }
 ],
 statusCode: 200 }
*/





/*
particle.listDevices({ auth: auth }).then(
function(devices){
  var d = [];
  devices.body.forEach(function(device){
    d.push({
      id: {
        raw: device.id,
        html: encoder.encodeForHTML(device.id)
      },
      name: {
        raw: device.name,
        html: encoder.encodeForHTML(device.name)
      }
    });
  });
  return d;

}).then(callbackFn).catch(function(err){
  debug('warning: particle.io connect error', err);

  var msg = 'could not connect to particle.io';
  if(err && err.errorDescription){
    msg += ' ' + err.errorDescription;
  }
  socket.emit('apperror', msg);
});
*/
