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

var d3              = require('d3');
var _               = require('lodash');
var BaseMap         = require('./BaseMap.js');
var MapBackgrounds  = require('./MapBackgrounds.js');
var TrafficLayer    = require('./TrafficLayer.js');
var SingleTubeLayer = require('./SingleTubeLayer.js');
var MINI_MAP_TYPE   = require('../util/Enums.js').MAP_TYPES.MINI;

/**
* ```
MiniMap({
    containerId: "map",
    backgroundMap: "world",
    scale:   480,
    lat: 40,
    lng: -60,
    networkLayers: [{
        name: "Network",
        lineWidth: 5,
        mapSource: "../networks/network.json",
        map2dataSource: {
            type: 'atlasUsage',
            source: 'http://a-snapp-host.iu.edu/manlan/services/graphing.cgi'
        }
    }]
})
});```
* @class MiniMap
* @extends BaseMap
* @constructor MiniMap
* @static 
* @param {Object} config - The configuration object for the MiniMap
* @param {String} config.containerId - The container id of the DOM element to render the map into 
* @param {String} config.backgrounMap - The map background to use, see [MapBackgrounds](MapBackgrounds.html) for all background options 
* @param {Number} config.scale - The scale of the map
* @param {Number} config.width - The pixel width of the map
* @param {Number} config.height - The pixel height of the map
* @param {Number} config.lat - The latitude coordinate to center the map on
* @param {Number} config.lng - The longitude coordiante to center the map on 
* the full list of options 
*/
var MiniMap = function(config){
    config.mapType = MINI_MAP_TYPE;

    if(!config.backgroundMap){
        console.error("Must pass in a background map for the MiniMap!");
        return;
    }

    // based on the string passed in the config find the corresponding map background
    var bg;

    var svg = d3.select("#"+config.containerId).append("svg");

    var map = BaseMap(_.merge(config, {
        onInit: function() {
            svg.attr("width", map.width())
                .attr("height", map.height());
            bg = MapBackgrounds[config.backgroundMap]({
                containerId: config.containerId,
                svg: svg,
                scale: config.scale,
                width: map.width(),
                height: map.height(),
                lat: config.lat,
                lng: config.lng
            });
        },
        onAddNetworkLayer: function(layer){
            var layer_options = {
                map: map,
                svg: svg.append("g"),
                active: layer.active,
                lineColor: layer.lineColor,
                name: layer.name,
                onLatLngToXy: map.onLatLngToXy(),
            };

            var network_layer;
            //if we don't have a way to get topology data just show the single tube layers
            if(layer.map2dataSource === undefined){
               network_layer = SingleTubeLayer(layer_options)
                    .lineWidth(layer.lineWidth)
                    .loadMap(layer.mapSource);
            }
            //otherwise load the traffic layer with live updates
            else {
                layer_options.maxBps = layer.maxBps;
                network_layer = TrafficLayer(layer_options).lineWidth(layer.lineWidth)
                    .map2dataSource(layer.map2dataSource)
                    .loadMap(layer.mapSource);
            }

            return network_layer;
        },
        onUpdate: function() {
            var networkLayers = map.layers({layerTypes: [map.LAYER_TYPES.NETWORK]});
            _.forEach(networkLayers, function(l) {
                l.update();
            });
        },
        onLatLngToXy: function(latlng){
            return bg.projection()([latlng[1], latlng[0]]);
        }
    }));

    map.init();

    return map;
};
module.exports = MiniMap;
