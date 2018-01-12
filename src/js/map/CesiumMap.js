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

var _                  = require('lodash');
var d3                 = require('d3');
var BaseMap            = require('./BaseMap.js');
var BaseLayer          = require('./BaseLayer.js');
var CesiumTrafficLayer = require('./CesiumTrafficLayer.js');
var CESIUM_MAP_TYPE    = require('../util/Enums.js').MAP_TYPES.CESIUM;
/**
* ```
CesiumMap({
    containerId: "map",
    height: 4 ,
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
* @class CesiumMap
* @extends BaseMap
* @constructor CesiumMap
* @static 
* @param {Object} config - The configuration object for the MiniMap
* @param {String} config.containerId - The container id of the DOM element to render the map into 
* @param {Number} config.zoom - The zoom level of the map
* @param {Number} config.lat - The latitude coordinate to center the map on
* @param {Number} config.lng - The longitude coordiante to center the map on 
* the full list of options 
*/
var CesiumMap = function(config){
    config.mapType = CESIUM_MAP_TYPE;


    //if a bing maps api key was passed in, use it
    //otherwise just use the default
    if(config.bing_api_key){
        Cesium.BingMapsApi.defaultKey = config.bing_api_key;
    }

    var latlng;
    var map = BaseMap(config);
    
    var cesiumViewer = new Cesium.Viewer('map', {
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false//,
        //sceneMode : Cesium.SceneMode.SCENE2D
    });
    
    cesiumViewer.infoBox.frame.sandbox = "allow-same-origin allow-top-navigation allow-pointer-lock allow-popups allow-forms allow-scripts";


    var roadsBordersImageryProvider = cesiumViewer.imageryLayers.addImageryProvider(new Cesium.BingMapsImageryProvider({
        url : '//dev.virtualearth.net',
        mapStyle: Cesium.BingMapsStyle.AERIAL_WITH_LABELS
    }));
    roadsBordersImageryProvider.show = map.bordersActive() && map.roadsActive();
    

    var projection = d3.geo.equirectangular()
        .scale(100)
        .precision(.0001)
        .center([0,5])
        .rotate([60,0,0]);

    var path = d3.geo.path()
        .projection(projection);

    var svg = d3.select(d3.select('#'+map.containerId()).node().parentNode)
        .insert('div', '#'+map.containerId())
        .attr('class', 'cesium-layout-helper')
        .append("svg")
        .attr("width", map.width())
        .attr("height", map.height());

    var graticule = d3.geo.graticule();
    svg.append("path")
        .datum(graticule)
        .attr("class", "graticule")
        .attr("d", path);


    // make the line width a fucntion of the zoom level
    map.onLineWidth(function(){});
   
    //define how to convert from lat/lng coordinates to xy
    map.onLatLngToXy(function(latlng){
        var points = projection([latlng[1], latlng[0]]);
        return [points[0], points[1]];
    });

    //define how to convert from xy coordinate to latlng
    map.onXyToLatLng(function(xy){
        var points = projection.invert([xy[0], xy[1]]);
        return [points[0], points[1]];
    });

    //define how ta add a network layer
    map.onAddNetworkLayer(function(layer){
        var network_layer = CesiumTrafficLayer({
            map: map,
            svg: svg,
            active: layer.active,
            lineColor: layer.lineColor,
            cesiumViewer: cesiumViewer,
            maxBps: layer.maxBps,
            name: layer.name,
            onLatLngToXy: map.onLatLngToXy(),
            onXyToLatLng: map.onXyToLatLng(),
            onAdjacencyEvent: layer.onAdjacencyEvent,
            onPopEvent: layer.onPopEvent
        }).lineWidth(map.lineWidth())
            .map2dataSource(layer.map2dataSource)
            .loadMap(layer.mapSource);

        return network_layer;
    });

    //define how to pan the camera
    map.onPanTo(function(params){
        latlng = params.latlng;
        var currentPosition = cesiumViewer.camera.positionCartographic;

        cesiumViewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                latlng[1],
                latlng[0],
                currentPosition.height
            ),
            orientation : {
                roll: (params.roll !== undefined) ? params.roll : 0.0,
                pitch: (params.pitch !== undefined) ? params.pitch : -Cesium.Math.PI_OVER_TWO,
                heading: (params.heading  !== undefined) ? params.heading : 0.0
            }
        });
    });

    //define how to zoom the camera
    map.onZoom(function(params){
        var currentPosition = cesiumViewer.camera.positionCartographic;

        var height = params.height;
        if(!height){
            console.error("Must pass in height in meters or a zoom level!");
            return;
        }

        cesiumViewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                latlng[1],
                latlng[0],
                height 
            )
        });
    });

    //define how to add a kml layer to the map
    map.onAddKmlLayer(function(layer){
        var kml_layer = BaseLayer({
            layerType: map.LAYER_TYPES.KML,
            active: layer.active,
            name: layer.name
        });
        var kmlDataSource;
        var kmlDataSourcePromise = Cesium.KmlDataSource.load(layer.url);

        //define how to remove the kml layer
        kml_layer.onRemove(function(l){
            //remove and destroy the dataSource
            cesiumViewer.dataSources.remove(kmlDataSource, true);
        });

        var callbacks = [
            function (k){
                kmlDataSource = k;
                // hack to get around the following issue
                // https://github.com/AnalyticalGraphicsInc/cesium/issues/3459
                // tldr: kml file with transparent png images won't appear transparent unless you
                // explicitly set the alpha property
                _.forEach(k.entities.values, function(entity){
                    if(entity.rectangle !== undefined && entity.rectangle.material.image !== undefined){
                        entity.rectangle.material.alpha = 0.99;
                    }
                    var e = entity;
                });
            },
            function (error) { //failure
                console.error("Error loading kml layer, "+layer.name+": " + error);
                // failure is often a result of CORS Security Policies
                // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS
            }
        ];

        //define how to toggle the kml layer
        kml_layer.onToggle(function(active){
            //suspend updates to cesium unitl the entire layer is updated
            cesiumViewer.entities.suspendEvents();

            if(active){
                if(!kmlDataSource){
                    cesiumViewer.dataSources.add(kmlDataSourcePromise).then.apply(null, callbacks);
                } else {
                    cesiumViewer.dataSources.add(kmlDataSource)
                }
            }else {
                cesiumViewer.dataSources.remove(kmlDataSource);
            }
            
            //now resumeEvents updates 
            cesiumViewer.entities.resumeEvents();
        });

        if(kml_layer.active()){
            cesiumViewer.dataSources.add(kmlDataSourcePromise).then.apply(null, callbacks);
        }

        return kml_layer;
    });

    //define how to add a geoJson layer to the map
    map.onAddGeoJsonLayer(function(layer){
        var onUpdate = function(params){
            var func = layer.onUpdate || function(params){
                var entities = params.entities;
                _.forEach(entities.values, function(entity){
                    entity.polygon.material     = Cesium.Color.fromCssColorString(entity._properties.color_rgba);
                    entity.polygon.outlineColor = Cesium.Color.fromCssColorString(entity._properties.color);
                });
            }
            //suspend updates to cesium unitl the entire layer is updated
            cesiumViewer.entities.suspendEvents();

            //execute provided function or default behavior
            func(params);

            //now resumeEvents updates
            cesiumViewer.entities.resumeEvents();
        };

        var geo_json_layer = BaseLayer({
            layerType: map.LAYER_TYPES.GEOJSON,
            active: layer.active,
            name: layer.name
        });
        var geoJsonDataSource;
        var geoJsonDataSourcePromise = Cesium.GeoJsonDataSource.load(layer.url);

        //define how to remove the geoJson layer
        geo_json_layer.onRemove(function(l){
            //remove and destroy the dataSource
            cesiumViewer.dataSources.remove(geoJsonDataSource, true);
        });

        var callbacks = [
            function (g){
                geoJsonDataSource = g;
                onUpdate({
                    entities: geoJsonDataSource.entities
                });
            },
            function (error) { //failure
                console.error("Error loading geojson layer, "+layer.name+": " + error);
                // failure is often a result of CORS Security Policies
                // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS
            }
        ];

        //define how to toggle the geoJson layer
        geo_json_layer.onToggle(function(active){
            if(active){
                if(!geoJsonDataSource){
                    cesiumViewer.dataSources.add(geoJsonDataSourcePromise).then.apply(null, callbacks);
                } else {
                    cesiumViewer.dataSources.add(geoJsonDataSource)
                }
            }else {
                cesiumViewer.dataSources.remove(geoJsonDataSource);
            }
        });

        if(geo_json_layer.active()){
            cesiumViewer.dataSources.add(geoJsonDataSourcePromise).then.apply(null, callbacks);
        }

        return geo_json_layer;
    });

    //define how to add a tile layer to the map
    map.onAddTileLayer(function(layer){
        var tile_layer = BaseLayer({
            layerType: map.LAYER_TYPES.TILE,
            active: layer.active,
            name: layer.name
        });

        var imageryLayer;
        var imageryProvider = new Cesium.WebMapServiceImageryProvider({
          url: layer.url,
          layers: layer.name,
          parameters: {
            transparent: true,
            format: 'image/png'
          }
        });
        imageryProvider.alpha = layer.opacity;
        imageryProvider.brightness = 1;

        //define how to remove the tile layer
        tile_layer.onRemove(function(l){
            //remove and destroy the imageryLayer
            cesiumViewer.imageryLayers.remove(imageryLayer, true);
        });

        //define how to toggle the tile layer
        tile_layer.onToggle(function(active){
            if(active){
                if(!imageryLayer){
                    imageryLayer = cesiumViewer.imageryLayers.addImageryProvider(imageryProvider)
                } else {
                    imageryLayer.show = true;
                }
            }else {
                imageryLayer.show = false;
            }
        });

        if(tile_layer.active()){
            imageryLayer = cesiumViewer.imageryLayers.addImageryProvider(imageryProvider)
        }

        return tile_layer;
    });

    //define how to toggle road features
    map.onToggleRoads(function(active){
        roadsBordersImageryProvider.show = active;
        // flip borders flag to keep flags in sync since you can't 
        // toggle borders without roads in the bing service provider
        map.bordersActive(active);
    });
    
    //define how to toggle the borders features
    map.onToggleBorders(function(active){
        roadsBordersImageryProvider.show = active;
        // flip road flag to keep flags in sync since you can't 
        // toggle borders without roads in the bing service provider
        map.roadsActive(active);
    });

    map.onResize(function(){});

    map.onUpdate(function(){});
    
    map.onInit(function(){
        map.panTo({
            latlng: [config.lat, config.lng]
        });
        map.zoom({ height: config.height });
    });
    map.init();

    return map;
};
module.exports = CesiumMap;
