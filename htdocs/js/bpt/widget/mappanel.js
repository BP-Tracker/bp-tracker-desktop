/**
 * A map designed to plot device movements
 *  requires leaflet.js (1.0.2), jQuery (1.12.x) and util.js
 *
 * Uses openstreetmap.org data
 *
 * Example usage:
 *   var panel = $('#map-panel').bpt_mappanel({});
 *   panel.addDevice('123', 'My Device');
 *   panel.addPoint('123', [33.6839, -78.8954]);
 *   panel.recenter();
 *
 */
!function($){
  "use strict";

  if(!$.bpt){
    $.bpt = new Object();
  }

  $.bpt.MapPanel = function(el, opts){
    var base = this;

    base.$el = $(el);
    base.$el.data('bpt.mappanel', base);

    base.el = el.get(0);

    // device_id => { name => '', addedToMap => true/false, marker => L.Marker,
    //                polyline => L.polyLine, c => true|false, id => device_id
    //                path = [{ location: [lat,lon], time => 1234, point => L.circle }]
    //                lastLocTime => 12345, lastLoc => [lat, lon] }
    base._devices = {}

    base._init = function(){
      this.opts = $.extend({}, $.bpt.MapPanel.defaultOptions, opts);

      this.$el.addClass('bpt-map-panel');
      if(this.$el.height() <= 0){
        this.$el.height(base.opts.height);
      }

      var map = L.map(this.el);
      map.setView(this.opts.initialCenter, this.opts.initialZoom);

      var layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
         attribution: 'Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
         maxZoom: 18,
      });
      map.addLayer(layer);

      var recenterAction = L.control.actionbutton({
        position: 'topleft',
        actionTitle: 'Re-center Map',
        actionName: 'recenter'
      });
      map.addControl(recenterAction);

      map.on('actionclick', this._onActionClick, this);
      this.map = map;
    }

    /**
     * Adds a geo point on the map
     * @param {[String]} deviceId    [device ID]
     * @param {[Array]} location     [lat and lng]
     * @param {[type]} locationTime  [time point was taken] (optiona)
     *                               NB: function expects the time to arrive
     *                               in order (for now)
     */
    base.addPoint = function(deviceId, location, locationTime){
      var device = this._devices[deviceId];
      var time = locationTime || new Date().getTime();

      if(!device){
          throw 'Device: ' + deviceId + ' unknown.';
      }

      device.lastLocTime = time;
      device.lastLoc = location;

      if(!device.addedToMap){
        this._addDeviceToMap(deviceId, location, locationTime);
        this._addPoint(device, location, locationTime, true);
        return;
      }

      device.marker.setLatLng(location);
      device.polyline.addLatLng(location);
      this._addPoint(device, location, locationTime);
    }

    /**
     * Re-centers the map to show the start and current positions of the
     * device
     *
     * @param {[String]} deviceId    [pass a deviceId to re-center on that
     *                               device only] (optional) TODO
     *
     */
    base.recenter = function(deviceId){
      var bounds = [];

      if(deviceId){
        bounds.push(this._devices[deviceId].lastLoc);
      }else{
        $.each(this._devices, function(deviceId, device){
          if(device.path.length > 0){
            bounds.push(device.path[0].location);
          }
          if(device.lastLoc){
              bounds.push(device.lastLoc);
          }
        });
      }
      this.map.fitBounds(L.latLngBounds(bounds));
    }

    /**
     * Adds a device to track
     * @param {[String]} deviceId         [device ID]
     * @param {[String]} name             [name of the device]
     * @param {[String]} color            [color of the route] (optional)
     * @param {[Array]} initialLocation   [initial lat and lng point of the device]
     *                                   (optional)
     */
    base.addDevice = function(deviceId, name, color, initialLocation){
      if(this._devices[deviceId]){
        throw 'Device ' + deviceId + ' already added';
      }

      console.log('a', color);

      this._devices[deviceId] = {
        name: name,
        id: deviceId,
        polyline: null,
        routeOptions: $.extend({}, this.opts.routeOptions, {color: color}),
        pointOptions: $.extend({}, this.opts.pointOptions, {color: color}),
        marker:  null,
        addedToMap: false,
        time: new Date().getTime(),
        path: []
      };

      if(initialLocation){
        this.addPoint(deviceId, initialLocation);
      }
    }

    base.getMap = function(){
      return this.map;
    }

    base._onActionClick = function(actionControl){
      console.log('onActionClick', actionControl.getName());

      var name = actionControl.getName();
      if(name.startsWith('device-')){
        this.recenter(name.split('device-')[1]);
      }else{
        this.recenter();
      }
    }

    // TODO: keep the device path array sorted by time
    base._addPoint = function(device, location, time){
      var point;

      if(device.path.length <= 0){ // first point
        point = L.circle(location, { color: 'black', radius: 6 });
      }else{
        point = L.circle(location, device.pointOptions);
      }

      var $content = $('<div>');
      $content.append($('<p>').text(device.name));
      $content.append($('<span>').text(time));

      var popup = L.popup().setContent($content.get(0));
      point.bindPopup(popup);

      device.path.push({ location: location, time: time, point : point });

      if(this.opts.drawPoints){
        point.addTo(this.map);
      }
    }

    // TODO: embellish popup
    base._onDevicePopupOpen = function(popupEvent, device){
      var popup = popupEvent.popup;
      popup.setContent($('<div>').text(device.name).get(0));
    }

    base._addDeviceToMap = function(deviceId, location, time){
      var device = this._devices[deviceId];
      if(device.addedToMap){
        return;
      }
      device.addedToMap = true;

      device.marker = L.marker(location, { title: device.name });

      device.polyline = L.polyline([location], device.routeOptions);

      device.marker.bindPopup(L.popup());
      device.marker.on('popupopen',
        this._onDevicePopupOpen.createDelegate(this, [device], true));

      var pathTooltip = L.tooltip().setContent($('<div>').text(device.name).get(0));
      device.polyline.bindTooltip(pathTooltip);

      var deviceAction = L.control.actionbutton({
        position: 'topright',
        actionClass: '',
        actionText: device.name,
        actionTitle: 'Re-center ' + device.name,
        actionName: 'device-' + deviceId
      });
      this.map.addControl(deviceAction);

      device.marker.addTo(this.map);
      device.polyline.addTo(this.map);
    }

    base._init();
  };

  $.bpt.MapPanel.defaultOptions = {

    initialZoom: 13,

    initialCenter: [33.6839, -78.8954],

    // enable/disable drawing the path a device takes
    drawRoutes: true,

    // used on L.polyline
    routeOptions: {
      weight: 2,
      color: 'red' //TODO: make this dynamic
    },

    // enable/disable drawing path points
    drawPoints: true,

    // used when drawPoints is enabled
    // used on L.circe
    pointOptions: {
      radius: 4
    },

    showBreadcrumb: true, // TODO

    /**
     * the title of the panel
     * @type {String}
     */
    title: 'Map',

    // use this height if none is specified on the element
    defaultHeight: 200,
  };

  $.fn.bpt_mappanel = function(options){
    return new $.bpt.MapPanel(this, options);
  }

  $.fn.get_bpt_mappanel = function(){
    return this.data('bpt.mappanel');
  };
}(jQuery);


/**
 * Generic action button. Fires 'actionclick' when the button is clicked
 * @type {L.Control.ActionButton}
 */
L.Control.ActionButton = L.Control.extend({
  options: {
    position: 'topleft',

    actionTitle: "Action",

    actionText: "X",

    /**
     * The name of the action
     * @type {String}
     */
    actionName: 'action',

    /**
     * HTML applied to the button
     * @type {String|HTML}
     */
    htmlTemplate: '',

    actionClass: 'leaflet-bar'
  },

  onAdd: function(map) {
    options = this.options;
    container = L.DomUtil.create('div', this.options.actionClass);

    this._actionButton = this._createButton(options.actionText, options.actionTitle,
            container, this._onActionClick);

    return container;
  },

  getActionText: function(){
    // TODO

  },

  setActionText: function(){
    // TODO

  },

  getName: function(){
    return this.options.actionName;
  },

  disable: function () {
		this._disabled = true;
    L.DomUtil.addClass(this._actionButton, 'leaflet-disabled');

		return this;
	},

	enable: function () {
		this._disabled = false;
    L.DomUtil.removeClass(this._actionButton, 'leaflet-disabled');
		return this;
  },

  onRemove: function(map) {
  },

  _onActionClick: function(e){
    this._map.fireEvent('actionclick', this, false);
  },

  _createButton: function (html, title, container, fn) {
  	var link = L.DomUtil.create('a', '', container);
  	link.innerHTML = html;
  	link.href = '#';
  	link.title = title;

  	link.setAttribute('role', 'button');
  	link.setAttribute('aria-label', title);

  	L.DomEvent.on(link, 'mousedown dblclick', L.DomEvent.stopPropagation);
  	L.DomEvent.on(link, 'click', L.DomEvent.stop);
  	L.DomEvent.on(link, 'click', fn, this);
  	L.DomEvent.on(link, 'click', this._refocusOnMap, this); // TODO: refactor

  	return link;
  }

});

L.control.actionbutton = function(opts) {
    return new L.Control.ActionButton(opts);
}















    /*
    var latlngs = [
        [45.51, -122.68],
    ];
    //this.paths[deviceId].push({ location: location, time: time });
    //
    ///L.marker(initialLocation || this.opts.initialCenter, { title: name }),
    var polyline = L.polyline(latlngs, {color: 'red'}).addTo(map);
    */

    // zoom the map to the polyline
    //map.fitBounds(polyline.getBounds());
