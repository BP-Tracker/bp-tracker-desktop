$(function(){

  function errorHandler(err){
    console.error(err);
    alertPanel.addEntry(err, "danger");
  }

  var deviceMapColors = ['#55aaee', '#bb77ee', '#55aaee', '#bb77ee']; // '#110099'
  var devicesInfo = {}; // deviceId => name => {raw, html}, id => {raw, html}, color =>


  // FOR DEMO
  var mapPanel = $('#map-panel').bpt_mappanel({});

  mapPanel.addDevice('123', 'Motorcycle', deviceMapColors.shift());
  mapPanel.addPoint('123', [33.6839, -78.8954]);
  mapPanel.addPoint('123', [33.7439, -78.8954]);
  mapPanel.addPoint('123', [33.7478, -79.0000]);

  mapPanel.addDevice('456', 'Car', deviceMapColors.shift());
  mapPanel.addPoint('456', [33.7502, -78.8934]);
  mapPanel.addPoint('456', [33.7502, -78.8994]);
  mapPanel.addPoint('456', [33.7486, -78.9060]);
  mapPanel.recenter();

  var eventsPanel = $('#event-panel').bpt_infopanel({
    tabs: true,
    title: 'Events'
  });

  var alertPanel = $('#alert-panel').bpt_infopanel({
    showTabs: true,
    allTabTitle: "Updates",
    showHeader: false,
    height: 20,
    title: 'Alerts',
    // add data.text, data.cls: [info|danger|warn..} to override the default style
    entryTemplate: function(panel, tabId, data){
      var text = typeof data === 'string' ? data : data.text;
      var type = 'alert-' +  (data.cls || tabId || 'info');

      return '<div class="alert ' + type + '" role="alert">' + text + '</div>';
    },
  });
  alertPanel.addTab("Warning", "warning");
  alertPanel.addTab("Alerts", "danger");


  var socket = io();
  socket.on('apperror', errorHandler);
  socket.on('error', errorHandler);

  // get devicess
  socket.emit('request', 'devices', function(devices){
    console.info('devices loaded', devices);

    var runningBpt = false;
    devices.forEach(function(device){
      var deviceId = device.id.raw;
      var deviceName = device.name.html;

      eventsPanel.addTab(deviceName, deviceId);
      devicesInfo[deviceId] = device;
      if(device.running_bpt){
        runningBpt = true;

        // request device status
        /* WIP
        socket.emit('request', 'status:' + deviceId, function(res){
            console.info('request status result', res);
            if(res !== 0){
              alertPanel.addEntry("Could not retrieve status from " +
                deviceName, "warning");
            }
        });
         */
      }
    });

    if(runningBpt){
      alertPanel.addEntry("Requesting device status ...");
    }else{
      alertPanel.addEntry("No devices have the required firmware loaded. " +
        "GPS tracking has been disabled.", "warning");
    }
  });

  // get device events
  socket.on('event', function(data){
    console.info('received device event', data);
    var event = data.name.raw;
    var value = data.data.raw;

    var deviceId = data.coreid.raw;
    var deviceName = devicesInfo[deviceId] ?
      devicesInfo[deviceId].name.raw : deviceId;


    if(!event.startsWith('bpt')){ // ignore non-bpt events
      return;
    }
    eventsPanel.addEntry(data, deviceId);

    switch(event){
      case 'bpt:event':
        var tokens = value.split(",");
        // TODO: refactor - put spec logic somewhere else
        var eventCode = tokens.shift();
        var ack = tokens.shift();

        if(eventCode == 10){ // bpt:status
          // controller_mode_t,controller_state_t,batt(%),
          // signal_strength(%),is_armed,[satellite,lat,lon]
          // 3,7,87.93,80.00,0,0,23.000000,23.000000
          var controllerMode = tokens.shift();
          var controllerState = tokens.shift();
          var battPercent = tokens.shift();
          var signalPercent = tokens.shift();
          var isArmed = tokens.shift();
          var satellites = tokens.shift();
          var lat = tokens.shift();
          var lon = tokens.shift();

          var text = deviceName + ": " + " battery " + battPercent
            + "%, GPS signal " + signalPercent + "%";
          alertPanel.addEntry({ cls: 'success', text: text });
          mapPanel.addPoint(deviceId, [lat, lon]);
        };

      break;
      case 'bpt:gps':

      break;
    }
  });

  // testing
  document.eventsPanel = eventsPanel;
  document.alertPanel = alertPanel;

  console.info('dashboard loaded');
});





































  /*
    eventsPanel.addTab('H', '123');

    eventsPanel.addEntry({
      published_at: {
        html: '1',
      },
      name: {
        html: 'sample'
      },
      data: {
        html: 'data'
      }
    }, '123');
    */

  /*
  alertPanel.addEntry({ cls: 'success', text: "2 devices retrieved" });
  alertPanel.addEntry("Lippy Loaded", "warning");
  alertPanel.addEntry({ text: "Lippy triggered panic event" }, 'danger');
  alertPanel.addEntry("Lippy Loaded");
  */

/*
  var map = L.map("geo-map").setView([33.6839, -78.8954], 13);
  console.log(map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  L.marker([33.6839, -78.8954]).addTo(map);

  */



/*


  eventsPanel.addTab('Lippy', '123');

  eventsPanel.addEntry({
    published_at: {
      html: '1',
    },
    event: {
      html: 'sample'
    },
    data: {
      html: 'data'
    }
  }, '123');

  eventsPanel.addEntry({
    published_at: {
      html: '2',
    },
    event: {
      html: 'sample'
    },
    data: {
      html: 'data'
    }
  }, '123');
*/

    /**
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: 'pk.eyJ1IjoidG9uaWN0dCIsImEiOiJ...'
    }).addTo(map);
    **/




//events.startStream();

/*
var popup = L.popup()
  .setLatLng([51.5, -0.09])
  .setContent("Test")
  .openOn(map);
  */


    //var events = new bpt.widget.Events({ id: 'bpt-event-panel', hidden : true });
    //console.log('start');
