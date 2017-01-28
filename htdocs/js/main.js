$(function(){
  console.log('loaded');

  var map = L.map("geo-map").setView([33.6839, -78.8954], 13);
  console.log(map);

  /**
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1IjoidG9uaWN0dCIsImEiOiJ...'
  }).addTo(map);
  **/

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  L.marker([33.6839, -78.8954]).addTo(map);

/*
  var popup = L.popup()
    .setLatLng([51.5, -0.09])
    .setContent("Test")
    .openOn(map);
    */


});
