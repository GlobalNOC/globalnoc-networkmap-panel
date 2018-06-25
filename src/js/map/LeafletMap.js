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
var L                = require('leaflet');
var omnivore         = require('leaflet-omnivore');
var bing             = require('leaflet-bing-layer');
var plugins          = require('leaflet-plugins/layer/vector/KML');
var TrafficLayer     = require('../map/TrafficLayer');
var SingleTubeLayer  = require('../map/SingleTubeLayer');
var LAYER_TYPES = require('../util/Enums.js').LAYER_TYPES;
/**
* An extension of the BaseMap that renders onto the Google Maps platform
* ```
var map = LeafletMap({
    bing_api_key: "API KEY",
    containerId: "map",
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
* @class LeafletMap
* @extends BaseMap
* @constructor LeafletMap
* @static
* @param {Object} config - The configuration object for the GoogleMap
* @param {String:Required} config.containerId - The map's container id
* @param {Integer:Required} config.zoom - The zoom level the map should be intialized at
* @param {Integer:Required} config.lat - The latitude coordinate the map should be initialized at  
* @param {Integer:Required} config.lng - The longitude coordinate the map should be initialized at
* @param {String:Required} config.bing_api_key
* @param {String:Required} config.map_tile_url
*/
var LeafletMap = function(params) {
    params.mapType = 'leaflet';
    var map = BaseMap(params);

    var zoom,lat,lng;
    lat = params.lat;
    lng = params.lng;
    if(params.zoom){
        zoom = params.zoom;
    }
    else if(params.height){
        zoom = _convertAltitudeToZoom(params.height);
    }
    var tooltip;
    if(params.tooltip){
        tooltip = params.tooltip;
    }
    var legend;
    if(params.legend){
        legend = params.legend;
    }

    //initialize the leaflet map object
    var lmapOptions;
    var lmap;
    var mapTileURL = params.map_tile_url;
    var tiles;
    var image;
 

    if(mapTileURL){
        lmapOptions = {
            center: {lat: lat, lng: lng},
            preferCanvas: false,
            mapTypeId: "hybrid",
            minZoom: 1,
            zoom: zoom,
            zoomAnimation: true,
            worldCopyJump: true,
            scrollWheelZoom: false
        };

        lmap = L.map(document.getElementById(params.containerId), lmapOptions);
        tiles = L.tileLayer(mapTileURL, { attribution: '&copy GlobalNOC' }).addTo(lmap);
        
    }else {
        lmapOptions = {
            minZoom: 1,
            maxZoom: 4,
            zoom: 3,
            scrollWheelZoom: false,
            center: [0,0]
        };

        lmap = L.map(document.getElementById(params.containerId), lmapOptions);

        let img_width = params.width;
        let img_height = params.height;

        let southWest = lmap.unproject([0,img_height], lmap.getMaxZoom()-1);
        let northEast = lmap.unproject([img_width, 0], lmap.getMaxZoom()-1);
        
        let sw = L.latLng(-90, -180);
        let ne = L.latLng(90,-180);

        let imageBounds = new L.latLngBounds(southWest, northEast);
        image = L.imageOverlay(params.image_url, imageBounds).addTo(lmap); 
        lmap.setMaxBounds(imageBounds);
     }

    map.setMapUrl = function(map_tile_url){
        tiles.setUrl(map_tile_url);
    }
    map.setImageUrl = function(image_url){
        image.setUrl(image_url);
    }
    map.setBounds = function(img_width, img_height){
        let southWest = lmap.unproject([0,img_height], lmap.getMaxZoom()-1);
        let northEast = lmap.unproject([img_width, 0], lmap.getMaxZoom()-1);
        
        let sw = L.latLng(-90,-180);
        let ne = L.latLng(90,-180);

        let imageBounds = new L.latLngBounds(southWest, northEast);
        image.setBounds(imageBounds);
    }

    //setup our svg layer to drawn on
    var svgLayer = L.svg();
    svgLayer.addTo(lmap);

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
        var point = lmap.latLngToLayerPoint(L.latLng(latlng[0],latlng[1]));
        return [point.x, point.y];
    });

    //define hot to convert from xy to lat/ong coords
    map.onXyToLatLng(function(xy){
        var latlng = lmap.PointToLatLng(L.point(xy[0],xy[1]));
        return [latlng.lat(), latlng.lng()];
    });

    //define how to pan to a lat/lng coordinate on the map
    map.onPanTo(function(params){
        var latlng = params.latlng;
        lmap.panTo(L.latLng(latlng[0], latlng[1]));
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
        lmap.setZoom(zoom);
    });

    // make the line width a fucntion of the zoom level
    map.onLineWidth(function(){
        var zoom = lmap.getZoom();
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

	    var geoJSON_layer = L.geoJSON([],{
		    pointToLayer: function (feature, latlng) {
			var color,
			mag,
			radius;
			mag = feature.properties.mag;
			if (mag === null) {
			    color = '#fff';
			    radius = 2;
			} else {
			    color = '#00f';
			    radius = 2 * Math.max(mag, 1);
			}
			if (feature.properties.type === 'quarry blast') {
			    color = '#f00';
			}
			return L.circleMarker(latlng, {
				color: color,
				radius: radius
			    });
		    }
		});
	    
	    //define how to remove the kml layer
	    geo_json_layer.onRemove(function(l){
                    geoJSON_layer.remove();
		});

	    //define how to toggle the kml layer
	    geo_json_layer.onToggle(function(active){
		    if(active) {
			geoJSON_layer.addTo(lmap);
		    }else {
                        geoJSON_layer.remove();
		    }
		});

	    if(geo_json_layer.active()){
		geoJSON_layer.addTo(lmap);
	    }


	    var xhr = new XMLHttpRequest();
	    xhr.onload = function () {
		var results = JSON.parse(xhr.responseText);
		geoJSON_layer.addData(results);
	    };
	    xhr.open('GET',layer.url, true);
	    xhr.send();
	    

	    return geo_json_layer;
	});

    //define how to add a network layer to the map 
    map.onAddNetworkLayer(function(layer){
        var layer_options = {
            map: map,
            svg: bg,
            lineColor: layer.lineColor,
            lineOpacity: layer.lineOpacity,
            endpointColor: layer.endpointColor,
            endpointOpacity: layer.endpointOpacity,
            active: layer.active,
            name: layer.name,
            onLatLngToXy: map.onLatLngToXy(),
            onLinkEvent: layer.onLinkEvent,
            onEndpointEvent: layer.onEndpointEvent,
            tooltip: tooltip,
            max: layer.max,
            min: layer.min,
            offsets: [-360,0,360]
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


    map.onAddKmzLayer(function(layer){
	    var kml_layer = BaseLayer({
		    layerType: map.LAYER_TYPES.KML,
		    active: layer.active,
		    name: layer.name
		});


	    return kml_layer;
	});

    //define how to add a kml layer to the map
    map.onAddKmlLayer(function(layer){
        var kml_layer = BaseLayer({
            layerType: map.LAYER_TYPES.KML,
            active: layer.active,
            name: layer.name
        });
        
        var lkml_layer = new L.KML(layer.url, { async: true });

        //define how to remove the kml layer
        kml_layer.onRemove(function(l){
                lkml_layer.remove();
        });

        //define how to toggle the kml layer
        kml_layer.onToggle(function(active){
            if(active) {
                lkml_layer.addTo(lmap);
            }else {
                lkml_layer.remove();
            }
        });

        if(kml_layer.active()){
            lkml_layer.addTo(lmap);
        }

        return kml_layer;
    });

    map.onAddTileLayerWMS(function(layer){
	    var tile_layer = BaseLayer({
		    layerType: map.LAYER_TYPES.TILE_WMS,
		    active: layer.active,
		    name: layer.name
		});

	    var leaflet_tile_layer = L.tileLayer.wms( layer.url, {
            layers: layer.params.layers,
            version: layer.params.version,
            format: layer.params.format,
            transparent: true,
            updateWhenZooming: false,
            updateInterval: 900,
            zoomAnimation: false,
            interactive: false,
            opacity: 0
		});
	    
	    //remove the SVG layer cause suck!
	    svgLayer.remove();
	    leaflet_tile_layer.addTo(lmap);
	    svgLayer.addTo(lmap);

	    //define how to remove the tile layer
	    tile_layer.onRemove(function(){
		    leaflet_tile_layer.remove();
		});

	    //define how to toggle the tile layer
	    tile_layer.onToggle(function(active){
		    if(active){
			leaflet_tile_layer.setOpacity(1);
		    }else {
			leaflet_tile_layer.setOpacity(0);
		    }
		});

	    return tile_layer;
	    
	});

    //define how to add a tile layer to the map
    map.onAddTileLayer(function(layer){
        var tile_layer = BaseLayer({
            layerType: map.LAYER_TYPES.TILE,
            active: layer.active,
            name: layer.name
        });

        var leaflet_tile_layer = L.tileLayer( layer.url, {
                name: layer.name,
                maxZoom: 16,
                opacity: 0,
                updateWhenZooming: false,
                updateInterval: 900,
                cacheBuster: function() { return Math.random().toString().replace(/^[^.]*\./, ''); } //used to defeat overzealous browser caching
        });

	svgLayer.remove();
	leaflet_tile_layer.addTo(lmap);
	svgLayer.addTo(lmap);

        //optionally, periodically refresh the layer
        var timerId = null;
        if(_.isFinite(layer.refreshInterval) && layer.refreshInterval >= 1){
            timerId = setInterval(function(){
                leaflet_tile_layer.redraw();
            }, layer.refreshInterval * 1000);
        }

        //define how to remove the tile layer
        tile_layer.onRemove(function(){
                if(!_.isNull(timerId)){
                    clearInterval(timerId);
                }
                leaflet_tile_layer.remove();
        });

        //define how to toggle the tile layer
        tile_layer.onToggle(function(active){
            if(active){
		leaflet_tile_layer.setOpacity(1);
            }else {
                leaflet_tile_layer.setOpacity(0);
            }
        });

        return tile_layer;
    });

    //define how to toggle road features
    map.onToggleRoads(function(){
            if(this.roadsActive()){
		tiles.setOpacity(0);
		satTiles.setOpacity(1);
            }else{
		satTiles.setOpacity(0);
		tiles.setOpacity(1);
	    }
    });
  
    map.removeMap = function() {
        lmap.remove();
    };

    map.adjustZoom = function(zoom){
        lmap.setZoom(zoom);
    } 
    
    map.setCenter = function(lat,lng){
        lmap.panTo(L.latLng(lat,lng));
    }
   
    // svg element to hold layers
    var bg;
    map.onInit(function(){
            var container = d3.select("#" + map.containerId());
            bg = container.select("svg");
            bg.attr("pointer-events","auto");
            bg.classed(map.containerId(), true);
        });

    lmap.on("viewreset", function(d){
            map.update();
        });

    lmap.on("zoomend", function(e){
            map.update();
        });

    lmap.on("moveend", function(e){
            map.update();
        });

    map.onUpdate(function(){
            var layers = map.layers({layerTypes: [LAYER_TYPES.NETWORK]});
            _.forEach(layers, function(l){
		    l.lineWidth(map.lineWidth());
		    l.update();
                });
        });

    //define how to resize the map
    map.onResize(function(active){
	    lmap.invalidateSize();
	});


    map.init();

    return map;
};

module.exports = LeafletMap;
