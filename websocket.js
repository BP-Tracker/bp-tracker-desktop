var debug = require('debug')('dashboard:socket');
var io = require('socket.io');

var Particle = require('particle-api-js');
var Esapi = require('node-esapi');

// ws://localhost:3000/socket.io/?EIO=3&transport=websocket&sid=5JhHyx_wrk0xoSGLAAAB

module.exports = WebSocket;

/**
 * Creates a websocket to communicate with the particle cloud
 * and relays event stream data to authorized clients
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
    this.io.on('connection', this.onConnect.bind(this));
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
              coreid: data.coreid, // "particle-internal"
              coreid_html: encoder.encodeForHTML(data.coreid || ''),
              published_at: data.published_at, // "2017-01-27T23:10:33.928Z"
              published_at_html: encoder.encodeForHTML(data.published_at || ''),
              ttl: data.ttl, // "60"
              ttl_html: encoder.encodeForHTML(data.ttl || ''),
              data: data.data, // "data":"{\"message_id\":9154353012622088000"
              data_html: encoder.encodeForHTML(data.data || ''),
              name: data.name, // 'hook-sent/bpt:event',
              name_html: encoder.encodeForHTML(data.name || '')
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

  onConnect: function(socket){
    debug('onConnect called');

    var user = this.getUser(socket);
    var eventsRoom = this.getEventsRoom(socket);

    if(this.isRoomEmpty(socket, eventsRoom)){
      this.streamParticleEvents(socket, eventsRoom);
    }

    socket.join(eventsRoom.name, function(){
      debug('%s joined room %s', user, eventsRoom.name);

    });

    socket.on('request', createDelegate(this.onRequest, this, [socket], true));
    socket.on('disconnect', createDelegate(this.onDisconnect, this, [socket], true));
  },

  onDisconnect: function(reason, socket){ // TODO: test
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

  isRoomEmpty(socket, ns){ // TODO: test
    // console.log('isRoomEmpty', socket.adapter.rooms[ns.name]);
    var room = socket.adapter.rooms[ns.name]; // GAH API!!
    if(!room){
      return true;
    }

    return room.length <= 0;
  },

  onRequest: function(type, nullval, fn){ // TODO: why is 2nd arg null?
    debug('onRequest called (args %s)', arguments.length);

    var socket = arguments[arguments.length - 1];
    var user = this.getUser(socket);
    debug('request from %s: %s', user, type);

    if(typeof fn !== 'function'){
      socket.emit('apperror', 'request event expects a function callback');
      return;
    }


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
  }
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







//this.getEventsRoom(socket).emit('events', {'a': 'b'});
//this.io.emit('events', {'a': 'b'});
//socket.emit('events', {'a': 'c'});

// io.configure(function(){
//   debug('io.configure');
//
//   io.set('authorization', function(handshake, callback){
//     debug('authorization called');
//
//     console.log(handshake);
//     callback(null, true);
//   });
//
// });
//
/*
  io.on('connection', function(socket){
    debug('11connected to socket');
    console.log(socket.handshake.session);
    debug('connected to socket1');

    socket.on('message', function(msg){
      debug('message from client: ' + msg);
      console.log(socket.request.session);
    });

    socket.on('disconnect', function(){
      debug('client disconnected from client');

    });

  });
  */
