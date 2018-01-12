/*
Copyright 2018 The Trustees of Indiana University

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var _                = require('lodash');
var ds               = require('../util/DataSource.js');
var d3               = require('d3');
var BaseMap          = require('./BaseMap.js');
var BaseLayer        = require('./BaseLayer.js');
var GoogleMapsLoader = require('google-maps');
var TrafficLayer     = require('../map/TrafficLayer');
var SingleTubeLayer  = require('../map/SingleTubeLayer');
var GOOGLE_MAP_TYPE  = require('../util/Enums.js').MAP_TYPES.GOOGLE;

/**
* An extension of the BaseMap that renders onto the Google Maps platform
* ```
var map = GoogleMap({
    containerId: "map",
    api_key: 'AIzaSyD3DDKZk9WgDfO5dV0vDAxqLL1LGAT9OwU',
    zoom: 4,
    lat: 37,
    lng: -97,
    networkLayers: [{
        name: "AL2S",
        lineWidth: 4,
        mapSource: "../networks/al2s.json",
        map2dataSource: {
            type: 'atlasUsage',
            source: '../data/al2s.xml'
        }
    }]
});
```
* @class GoogleMap
* @extends BaseMap
* @constructor GoogleMap
* @static
* @param {Object} config - The configuration object for the GoogleMap
* @param {String:Required} config.containerId - The map's container id
* @param {String:Required} config.api_key - A Google Maps API key 
* @param {Integer:Required} config.zoom - The zoom level the map should be intialized at
* @param {Integer:Required} config.lat - The latitude coordinate the map should be initialized at  
* @param {Integer:Required} config.lng - The longitude coordinate the map should be initialized at  
*/
var GoogleMap = function(params) {
    params.mapType = GOOGLE_MAP_TYPE;
    var map = BaseMap(params);

    if(!params.api_key){
        console.error("Must provide a Google API Key!");
        return;
    }
    GoogleMapsLoader.KEY = params.api_key; 

    var gmap;
    var goverlay;
    var google;
   
    //helper function to convert an altitude in meters to a google maps zoom level 
    function _convertAltitudeToZoom(altitude) {
        //estimates retrieved by doing a trial and error 
        //side by side with cesium
        if(altitude >= 50000000){
            return 1;
        }
        if(altitude >= 25000000){
            return 2; 
        }
        else if(altitude >= 12500000){
            return 3;
        }
        else if(altitude >= 7500000){
            return 4;
        }
        else if(altitude >= 3750000){
            return 5;
        }
        else if(altitude >= 1875000){
            return 6;
        }
        else if(altitude >= 937500) {
            return 7;
        }
        else if(altitude >= 468750) {
            return 8;
        }
        else if(altitude >= 234375) {
            return 9;
        }
        else if(altitude >= 117187.5) {
            return 10;
        }
        else if(altitude >= 58593.75){
            return 11;
        }
        else if(altitude >= 29296.875){
            return 12;
        }
        else if(altitude >= 14648.4375){
            return 13
        }
        else if(altitude >= 7324.21875){
            return 14;
        }
        else if(altitude >= 3662.109375){
            return 15;
        }
        return 16;
    }

    //get the styles of the features given the state of the feature boolean flags
    map.getStyles = function(){
        return [{
            featureType: "road",
            elementType: "all",
            stylers: [
                { visibility: (map.roadsActive()) ? "on" : "off" }
            ]
        },{
            featureType: "poi",
                elementType: "all",
                stylers: [
                    { visibility: (map.poiActive()) ? "on" : "off" }
                ]
        },{
            featureType: "administrative",
            elementType: "all",
            stylers: [
                { visibility: (map.bordersActive()) ? "on" : "off" }
            ]
        }];
    };

    //define how to convert from lat/lng to xy coords
    map.onLatLngToXy(function(latlng){
        var point = goverlay.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(latlng[0],latlng[1]));
        return [point.x, point.y];
    });

    //define hot to convert from xy to lat/ong coords
    map.onXyToLatLng(function(xy){
        var latlng = proj.fromDivPixelToLatLng(new google.maps.Point(xy[0], xy[1]));
        return [latlng.lat(), latlng.lng()];
    });

    //define how to pan to a lat/lng coordinate on the map
    map.onPanTo(function(params){
        var latlng = params.latlng;
        gmap.setCenter({ lat: latlng[0], lng: latlng[1] });
    });

    //define how to zoom the camera
    map.onZoom(function(params){
        console.log(params.zoom);
        var zoom;
        if(params.zoom){
            zoom = params.zoom;
        }
        else if(params.height){
            zoom = _convertAltitudeToZoom(params.height);
        }
        gmap.setZoom(zoom);
    });

    // make the line width a fucntion of the zoom level
    map.onLineWidth(function(){
        var zoom = gmap.getZoom();
        var width = 1;
        if(zoom < 3){
            width = 1;
        }
        else if(zoom < 4){
            width = 3;
        }
        else if(zoom < 6){
            width = 5;
        }
        else if(zoom < 8){
            width = 8;
        }
        else if(zoom < 12){
            width = 12;
        }
        else {
            width = 18;
        }

        console.log('zoom = '+zoom+', line = '+width);
        return width;
    });
   
    map.onAddGeoJsonLayer(function(layer){
	    var geo_json_layer = BaseLayer({
		    layerType: map.LAYER_TYPES.GEOJSON,
		    active: layer.active,
		    name: layer.name
		});

	    var google_kml_layer = new google.maps.Data();
	    google_kml_layer.loadGeoJson(layer.url);

	    //define how to remove the kml layer
	    geo_json_layer.onRemove(function(l){
		    google_kml_layer.setMap(null);
		    google_kml_layer = undefined;
		});

	    //define how to toggle the kml layer
	    geo_json_layer.onToggle(function(active){
		    if(active) {
			google_kml_layer.setMap(gmap);
		    }else {
			google_kml_layer.setMap(null);
		    }
		});

	    if(geo_json_layer.active()){
		google_kml_layer.setMap(gmap);
	    }

	    return geo_json_layer;
	});

    //define how to add a network layer to the map 
    map.onAddNetworkLayer(function(layer){
        var layer_options = {
            map: map,
            svg: bg,
            lineColor: layer.lineColor,
            active: layer.active,
            name: layer.name,
            onLatLngToXy: map.onLatLngToXy(),
            onAdjacencyEvent: layer.onAdjacencyEvent,
            onPopEvent: layer.onPopEvent
        };

        var network_layer;
        //if we don't have a way to get topology data just show the single tube layers
        if(layer.map2dataSource === undefined){ 
	    layer_options.svg = bg.append("g");
            network_layer = SingleTubeLayer(layer_options)
                .lineWidth(map.lineWidth())
                .loadMap(layer.mapSource);
        }
        //otherwise load the traffic layer with live updates
        else {
            layer_options.maxBps = layer.maxBps;
            network_layer = TrafficLayer(layer_options).lineWidth(map.lineWidth())
                .map2dataSource(layer.map2dataSource)
                .loadMap(layer.mapSource);
        }

        return network_layer;
    });

    //define how to add a kml layer to the map
    map.onAddKmlLayer(function(layer){
        var kml_layer = BaseLayer({
            layerType: map.LAYER_TYPES.KML,
            active: layer.active,
            name: layer.name
        });
        
        var google_kml_layer = new google.maps.KmlLayer(layer.url, {preserveViewport: true});

        //define how to remove the kml layer
        kml_layer.onRemove(function(l){
            google_kml_layer.setMap(null);
            google_kml_layer = undefined;  
        });

        //define how to toggle the kml layer
        kml_layer.onToggle(function(active){
            if(active) {
                google_kml_layer.setMap(gmap);
            }else {
                google_kml_layer.setMap(null);
            }
        });

        if(kml_layer.active()){
            google_kml_layer.setMap(gmap);
        }

        return kml_layer;
    });

    //define how to add a tile layer to the map
    map.onAddTileLayer(function(layer){
        var tile_layer = BaseLayer({
            layerType: map.LAYER_TYPES.TILE,
            active: layer.active,
            name: layer.name
        });

        var compiled_url = _.template(layer.url, {
            //make consistent with leaflet interpolation string
            interpolate: /{([xyz])}/g,
            evaluate: /{=([xyz])}/g,
            escape: /{-([xyz])}/g,
        });

        var google_tile_layer = new google.maps.ImageMapType({
            getTileUrl: function(tile, zoom) {
                var url = compiled_url({
                    x: tile.x,
                    y: tile.y,
                    z: zoom
                }); 
                if(layer.disableCache){
                    url += "?"+(new Date()).getTime(); //stop caching
                }
                return url;
            },
            tileSize: new google.maps.Size(256, 256),
            opacity: 0,
            name : layer.name,
            isPng: true,
            maxZoom: 16
        });
        var length = gmap.overlayMapTypes.push(google_tile_layer);

        //define how to remove the tile layer
        tile_layer.onRemove(function(){
            gmap.overlayMapTypes.removeAt(length - 1); 
            google_tile_layer = undefined;
        });

        //define how to toggle the tile layer
        tile_layer.onToggle(function(active){
            if(active){
                google_tile_layer.setOpacity(layer.opacity);
            }else {
                google_tile_layer.setOpacity(0);
            }
        });

        if(tile_layer.active()){
            google_tile_layer.setOpacity(layer.opacity);
        }

        return tile_layer;
    });

    //define how to toggle road features
    map.onToggleRoads(function(){
        gmap.setOptions({ styles: map.getStyles() });
    });
   
    //define how to toggle point of interest features 
    map.onTogglePoi(function(){
        gmap.setOptions({ styles: map.getStyles() });
    });
   
    //define how to toggle border features 
    map.onToggleBorders(function(){
        gmap.setOptions({ styles: map.getStyles() });
    });

    //define how to resize the map
    map.onResize(function(active){
	google.maps.event.trigger(gmap, 'resize'); 
    });

    //define how to update the map components
    map.onUpdate(function(active){
        goverlay.draw();
    });

    //fetch google code
    GoogleMapsLoader.load(function(g){
        google = g;
        
        //must add an overlay to render our network objects into
        goverlay = new google.maps.OverlayView();
        goverlay.onAdd = function(){
            bg = d3.select(goverlay.getPanes().overlayMouseTarget)
                .append('svg')
                .style('position', 'relative')
                .style('overflow', 'visible', 'important');

            //define what should be done when our overlay needs to be redrawn
            goverlay.draw = function(){
                //draw each of our network layers
                var active_network_layers = map.layers({
                    layerTypes: [map.LAYER_TYPES.NETWORK],
                    active: true
                });
                _.forEach(active_network_layers, function(layer, name){
                    layer.lineWidth(map.lineWidth());
                    layer.update();
                });
            };
            //initialize the map
            map.init();
        };
        
        var zoom;
        if(params.zoom){
            zoom = params.zoom;
        }
        else if(params.height){
            zoom = _convertAltitudeToZoom(params.height);
        }

        //initialize the google maps object
        var gmapOptions = {
            center: {lat: params.lat, lng: params.lng},
            mapTypeId: "hybrid",
            minZoom: 3,
            zoom: zoom,
            streetViewControl: false,
            mapTypeControlOptions: {
                mapTypeIds: []
            },
            styles: map.getStyles() 
        };
        gmap = new google.maps.Map(document.getElementById(map.containerId()), gmapOptions);
        
        //apply the networks overlay to the gmap
        google.maps.event.addListenerOnce(gmap,"projection_changed", function() {
            goverlay.setMap(gmap);
        });
    });

    return map;
};

module.exports = GoogleMap;
