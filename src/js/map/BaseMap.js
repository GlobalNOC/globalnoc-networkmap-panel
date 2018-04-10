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

/**
* The Base Map that all maps should inherit from
* ```
var map = BaseMap(config)
```
* @class BaseMap
* @constructor BaseMap
* @static
* @param {Object} config - The configuration object for the BaseMap
* @param {String:Required} config.containerId - The map's container id
* @param {String:Required} config.mapType - The maps' type
* @param {Boolean:Optional(false)} config.bordersActive - Whether or not the border features are active
* @param {Boolean:Optional(false)} config.roadsActive - Whether or not the road features are active
* @param {Boolean:Optional(false)} config.poiActive - Whether or not the point of interest features are active
* @param {Array:Optional} config.kmlLayers - An array of KML Layers to be added on instatiation 
mport' and 'export' may appear only with 'sourceType: module'* @param {Array:Optional} config.tileLayers - An array of Tile Layers to be added on instatiation 
* @param {Array:Optional} config.networkLayers - An array of Network Layers to be added on instatiation 
* @param {Function:Optional} config.onInit - A function to be called once the map has initialized
*/

var _           = require('lodash');
var d3          = require('d3');
var ds          = require('../util/DataSource.js');
var LAYER_TYPES = require('../util/Enums.js').LAYER_TYPES;
var MAP_TYPES   = require('../util/Enums.js').MAP_TYPES;
var InfoDiv     = require('../widget/InfoDiv.js');
var Legend      = require('../widget/Legend.js');
var Functions   = require('../util/Functions.js');

var BaseMap = function(config){
    config = config || {};
    //var legend = config.legend;
    if(!config.containerId){
        console.error('Must pass in a containerId');
        return;
    }

    if(!config.mapType || (_.indexOf(_.values(MAP_TYPES), config.mapType) === -1)){
        console.error('Must pass in a valid map type, ('+_.values(MAP_TYPES).join(', ')+')');
        return;
    }

    var map = {};
    map.__baseFactory__ = 'Map';
    map.MAP_TYPES   = MAP_TYPES;
    map.LAYER_TYPES = LAYER_TYPES;
    //verifies the parameter is a layer
    function _assertIsLayer(layer){
        if(layer.constructor      !== Object  ||
           layer.__baseFactory__  === undefined ||
           layer.__baseFactory__  !== 'Layer' ){
            console.error("Argument must extend BaseLayer!");
            return false;
        }
        return true;
    }

    //verifies the layer is of the passed in type
    function _assertLayerIsType(layer, type){
        if(layer.layerType() === undefined){
            console.error("Must set a layerType for the added layer!");
            return false;  
        }
        if(layer.layerType() !== type){
            console.error("'"+layer.layerType()+"' incorrect, expected "+type+"!");
            return false;
        }
        return true;
    }

    /** 
     * The client's latitude and logitude coordinates. (Only Available if client allows it)
     * @property {Array} clientLatLng
     * @private 
     */
    var clientLatLng;
    /** 
     * Whether or not the border features are active 
     * @property {Boolean} bordersActive
     * @default false
     * @private 
     */
    var bordersActive = (config.bordersActive !== undefined) ? config.bordersActive : false;
    /** 
     * Whether or not the road features are active 
     * @property {Boolean} roadsActive
     * @default false
     * @private 
     */
    var roadsActive   = (config.roadsActive !== undefined) ? config.roadsActive : false;
    /** 
     * Whether or not the point of interest features are active 
     * @property {Boolean} poiActive
     * @default false
     * @private 
     */
    var poiActive     = (config.poiActive !== undefined) ? config.poiActive   : false;
    /** 
     * The maps' type
     * @property {String} mapType
     * @private 
     */
    var mapType       = config.mapType;
    /** 
     * The container id of the map
     * @property {String} containerId
     * @private 
     */
    var containerId = config.containerId;
    /** 
     * The d3 selection of the maps container
     * @property {D3 Selection} container
     * @private 
     */
    var container   = d3.select('#'+containerId);
    /** 
     * The d3 selection of the div that wraps the whole base map
     * @property {D3 Selection} wrapper
     * @private 
     */
    var wrapper     = d3.select(document.createElement('div')).classed('map-wrapper', true);

    /**
     * The infoDiv utility used for displaying map info
     * @property {InfoDiv} infoDiv 
     * @private
     */
    var infoDiv;

    /** 
     * The maps' width 
     * @property {Integer} width
     * @private 
     */
    var width;
    /** 
     * The maps' height
     * @property {Integer} height
     * @private 
     */
    var height;
    /** 
     * The maps' layers
     * @property {Object} layers
     * @private 
     */
    var layers = {};

    /** 
     * The function to be called when retrieving the maps' lineWidth
     * @property {Funciton} onLineWidth
     * @private 
     */
    var onLineWidth;
    /** 
     * The function to be called when adding a tile layer
     * @property {Function} onAddTileLayer
     * @private 
     */
    var onAddTileLayer;
    /**
     * The function to be called when adding a tile layer
     * @property {Function} onAddTileLayerWMS
     * @private
     */
    var onAddTileLayerWMS;

    /** 
     * The function to be called when adding a network layer
     * @property {Function} onAddNetworkLayer
     * @private 
     */
    var onAddNetworkLayer = (config.onAddNetworkLayer !== undefined) ? config.onAddNetworkLayer : null;
    /** 
     * The function to be called when adding a kml layer
     * @property {Function} onAddKmlLayer
     * @private 
     */
    var onAddKmlLayer;
    /**
     * The function to be called when adding a kml layer
     * @property {Function} onAddKmlLayer
     * @private
     */
    var onAddKMZLayer;
    /**
     * The function to be called when adding a geo json layer
     * @property {Function} onAddGeoJsonLayer
     * @private
     */
    var onAddGeoJsonLayer;
    /** 
     * The function to be called when panTo is called on a map
     * @property {Function} onPanTo
     * @private 
     */
    var onPanTo = function(){ console.error("Set the onPanTo function in the extended map class!"); };
    /** 
     * The function to be called when zoom is called on a map
     * @property {Function} onZoom
     * @private 
     */
    var onZoom = function(){ console.error("Set the onZoom function in the extended map class!"); };
    /** 
     * The function to be called when init is called on a map
     * @property {Function} onInit
     * @private 
     */
    var onInit = function(){ console.info("Doing default initialization routine only"); };
    /** 
     * The function to be called when latLngToXy is called on a map
     * @property {Function} onLatLngToXy
     * @private 
     */
    var onLatLngToXy    = (config.onLatLngToXy !== undefined) ? config.onLatLngToXy : function(){ console.error("Set the latlng to xy projection function in extended map class!"); };
    /** 
     * The function to be called when latXyToLng is called on a map
     * @property {Function} onXyToLatLng
     * @private 
     */
    var onXyToLatLng    = function(){ console.error("Set the xy to latlng projection function in extended map class!"); };
    /** 
     * The function to be called when update is called on a map
     * @property {Function} onUpdate
     * @private 
     */
    var onUpdate        = (config.onUpdate !== undefined) ? config.onUpdate : function(){ console.error("Set the onUpdate function in extended map class!");          };
    /** 
     * The function to be called when toggleRoads is called 
     * @property {Function} onToggleRoads
     * @private 
     */
    var onToggleRoads   = function(){ console.error("Set the onToggleRoads function in extended map class!");     };
    /** 
     * The function to be called when toggleBorders is called 
     * @property {Function} onToggleBorders
     * @private 
     */
    var onToggleBorders = function(){ console.error("Set the onToggleBorders function in extended map class!");   };
    /** 
     * The function to be called when togglePoi is called 
     * @property {Function} onTogglePoi
     * @private 
     */
    var onTogglePoi     = function(){ console.error("Set the onTogglePoi function in extended map class!");       };
    /**
     * The color scheme to be used by this map; an object like that returned by Color.getScheme()
     * @property {Object} colorScheme
     * @private
     */
   // var colorScheme;

    // set up the color scheme we will use
   // if(config.colorScheme){
   //     colorScheme = Color.getScheme(_.isArray(config.colorScheme) ? config.colorScheme[0] : config.colorScheme);
   // }
   // if(!colorScheme) {
   //     colorScheme = Color.getDefaultScheme();
   // }

    /** 
     * Getter for container property
     * @method container
     */
    map.container = function(value){
        return container.node();
    }; 
    
    /** 
     * Getter for wrapper property
     * @method wrapper
     */
    map.wrapper = function(value){
        return wrapper.node();
    }; 

    /** 
     * Getter for bordersActive property
     * @method bordersActive
     */
    map.bordersActive = function(value){
        if(!arguments.length){ return bordersActive; }
        bordersActive = value;
        return map;
        return bordersActive;
    }; 
    /** 
     * Getter for roadsActive property
     * @method roadsActive
     */
    map.roadsActive = function(value){
        if(!arguments.length){ return roadsActive; }
        roadsActive = value;
        return map;
    }; 
    /** 
     * Getter for poiActive property
     * @method poiActive
     */
    map.poiActive = function(value){
        if(!arguments.length){ return poiActive; }
        poiActive = value;
        return map;
    }; 
    /** 
     * Getter for mapType property
     * @method mapType
     */
    map.mapType = function(){
        return mapType;
    };
    /** 
     * Getter for clientLatLng property
     * @method clientLatLng
     */
    map.clientLatLng = function(){
        return clientLatLng;
    };
    /** 
     * Getter for the containerId property 
     * @method containerId
     */
    map.containerId = function(){
        return containerId
    };
    /** 
     * Getter/Setter for the height property 
     * @method height
     */
    map.height = function(value){
      if (!arguments.length){ return height; }
      height = value;
    };
    /** 
     * Getter/Setter for the width property 
     * @method width
     */
    map.width = function(value){
      if (!arguments.length){ return width; }
      width = value;
    };

    /**
     * Getter/Setter of infoDiv function
     * @method infoDiv
     * @param {Function} value - Function either setting the infoDiv element or
     * creating it
     */
    map.infoDiv = function(value) {
      if (!arguments.length){ return infoDiv; }
      infoDiv = value;
    };

    /**
     * Getter/Setter of pinDialog property.
     * @method pinDialog
     * @param {Boolean} value - Boolean for pinning the dialg to the map
     * creating it
     */
    map.pinDialog = function(value) {
      if (!arguments.length){ return pinDialog; }
      if (value === false) {
        d3.selectAll('g.selected').classed('selected', false);
      }
      pinDialog = value;
    };

    /**
     * Getter/Setter of onLatLngToXy function
     * @method onLatLngToXy
     * @param {Function} value - Function describing how to convert from lat/lng to xy coords 
     * @chainable
     */
    map.onLatLngToXy = function(value){
        if(!arguments.length){ return onLatLngToXy; }
        onLatLngToXy = value;
        return map;
    };

    /**
     * Coverts a lat/lng coordinate to an xy coordite 
     * @method latLngToXy
     * @param {Array} value - An array in the format [{latitude},{longitude}]
     */
    map.latLngToXy = function(){
        return onLatLngToXy.apply(map, arguments);
    };

    /**
     * Getter/Setter of the onXyToLatLng function
     * @method onXyToLatLng
     * @param {Function} value - Function that coverts from xy coords to lat/lng coords 
     * @chainable
     */
    map.onXyToLatLng = function(value){
        if(!arguments.length){ return onXyToLatLng; }
        onXyToLatLng = value;
        return map;
    };

    /**
     * Function that converts an xy coordinate on the map container to a latitude longiude coordinate 
     * @method xyToLatLng
     * @param {Array} value - An array in to format [{x},{y}] 
     */
    map.xyToLatLng = function(){
        return onXyToLatLng.apply(map, arguments);
    };

    /**
     * Getter/Setter of the onPanTo property
     * @method onPanTo
     * @param {Function} value - Function that pans a map to either the passed in xy coords or the passed in latlng coords
     * @chainable
     */
    map.onPanTo = function(value){
        if(!arguments.length){ return onPanTo; }
        onPanTo = value;
        return map;
    };

    /**
     * Function that pans to some coordinate on the map
     * @method panTo
     * @param {Object} params - The function parameters object 
     * @param {Array:Optional} config.xy - An array of cartesian coordiantes to pan to 
     * @param {Array:Optional} config.latlng - An array of lat/lng coordiantes to pan to
     * @chainable
     */
    map.panTo = function(params){
        var latlng;
        if( params.xy !== undefined ){
            latlng = map.latLngToXy(params.xy);
        }
        else if(params.latlng !== undefined ){
            latlng = params.latlng;
        }
        else {
            console.error('Must pass in either x y cartesian coordiantes or lat lng coordinates');
            return;
        }
        params.latlng = latlng

        onPanTo(params);
        return map;
    };

    /**
     * Getter/Setter of the onZoom property
     * @method onZoom
     * @param {Function} value - Function that defines how to zoom on the map 
     * @chainable
     */
    map.onZoom = function(value){
        if(!arguments.length){ return onZoom; }
        onZoom = value;
        return map;
    };
    
    /**
     * Zooms to some level on the page 
     * @method zoom
     * @param {Object} params - Function parameters 
     * @param {Integer} params.zoom - The zoom level to zoom to 
     * @chainable
     */
    map.zoom = function(params){
        onZoom.call(map, params);
        return map;
    };

    /**
     * Adds a layer to the map 
     * @method addLayer
     * @param {BaseLayer} layer - The layer to add to the map. Must be a  
     * @return {Integer} layerId - The id of the layer that was added
     */
    var addLayer = function(layer){
        if(!_assertIsLayer(layer)){ return; }

        layers[layer.layerId()] = layer;

        return layer.layerId();
    };

    /**
     * Removes layers from the map
     * @method removeLayers
     * @param {Object} params - The method parameters (Respects same filters as map.layers method)
     * @return {Integer} layerId - The id of the layer that was added
     */
    map.removeLayers = function(params){
        var my_layers = map.layers(params);
        _.forEach(my_layers, function(layer, layer_id){
            my_layers[layer_id].remove();
            delete my_layers[layer_id];
        });
        return map;
    };

    /**
     * Returns map layers 
     * @method layers 
     * @param {Object} params - The method parameters
     * @param {Array} params.layerIds - The layerIds to filter on 
     * @param {Array} params.layerTypes - The layerTypes to filter on 
     * @param {Boolean} params.active - Filters on layer active flag 
     * @return {Array:BaseLayers} my_layers - Returns an array of all the layers with respect to filters passed in 
     */
    map.layers = function(params){
        params = params || {};
        var my_layers = layers;

        //filter by layerIds if passed in
        if(params.layerIds){
            if(params.layerIds.length === 0) { return []; }
            my_layers = _.filter(my_layers, function(d){
                return _.indexOf(params.layerIds, d.layerId()) !== -1;
            });
        }
        //filter by layerTypes if passed in
        if(params.layerTypes){
            if(params.layerTypes.length === 0) { return []; }
            my_layers = _.filter(my_layers, function(d){
                return _.indexOf(params.layerTypes, d.layerType()) !== -1; 
            });
        }
        //filter by layerTypes if passed in
        if(params.active !== undefined){
            my_layers = _.filter(my_layers, function(d){
                return params.active === d.active(); 
            });
        }

        return my_layers;
    };
    
    /**
     * Getter/Setter of the onToggleRoads 
     * @method onToggleRoads 
     * @param {Function} value - Method that defines how to toggle road features on the map 
     * @chainable
     */
    map.onToggleRoads = function(value){
        if(!arguments.length){ return onToggleRoads; }
        onToggleRoads = value;
        return map;
    };

    /**
     * Toggles the road features' visibility on the map 
     * @method toggleRoads
     * @param {Boolean:Optional} isActive - Explicitly sets the visibility of the features, otherwise takes the logical NOT of the current state 
     * @return {Boolean} roadsActive - A boolean representing whether the road features are active or not
     */
    map.toggleRoads = function(isActive){
        if(isActive !== undefined){ roadsActive = isActive;    }
        else                      { roadsActive = !roadsActive }
        onToggleRoads.call(map, roadsActive);
        return roadsActive;
    };
    
    /**
     * Getter/Setter of the onTogglePoi function
     * @method onTogglePoi
     * @param {Function} value - Method that defines how to toggle point of interest features on the map 
     * @chainable
     */
    map.onTogglePoi = function(value){
        if(!arguments.length){ return onTogglePoi; }
        onTogglePoi = value;
        return map;
    };
    
    /**
     * Toggles the point of interest features' visibility on the map 
     * @method togglePoi
     * @param {Boolean:Optional} isActive - Explicitly sets the visibility of the features, otherwise takes the logical NOT of the current state 
     * @return {Boolean} poiActive - A boolean representing whether the point of interest features are active or not
     */
    map.togglePoi = function(isActive){
        if(isActive !== undefined){ poiActive = isActive;  }
        else                      { poiActive = !poiActive }
        onTogglePoi.call(map, poiActive);
        return poiActive;
    };

    /**
     * Getter/Setter of the onToggleBorders function
     * @method onToggleBorders
     * @param {Function} value - Method that defines how to toggle the border features on the map 
     * @chainable
     */
    map.onToggleBorders = function(value){
        if(!arguments.length){ return onToggleBorders; }
        onToggleBorders = value;
        return map;
    };
    
    /**
     * Toggles the border features' visibility on the map 
     * @method toggleBorders
     * @param {Boolean:Optional} isActive - Explicitly sets the visibility of the features, otherwise takes the logical NOT of the current state 
     * @return {Boolean} poiActive - A boolean representing whether the border features are active or not
     */
    map.toggleBorders = function(isActive){
        if(isActive !== undefined){ bordersActive = isActive;  }
        else                      { bordersActive = !bordersActive }
        onToggleBorders.call(map, bordersActive);
        return bordersActive;
    };

    /**
     * Tells the map to resize itself to its containers dimensions
     * @method resize
     */
    map.resize = function(){
        onResize.apply(map, arguments);
    }

    /**
     * Toggles the activity of 1-n layers. (Respects filters of map.layers function)
     * @method toggleLayers
     * @param {Object} params - Method parameters 
     * @param {Boolean:Optional(false)} params.deferUpdate - Stops the map.update function from being called after the layers have been toggled
     * @chainable
     */
    map.toggleLayers = function(params){
        var states = [];
        var my_layers = map.layers(params);
        _.forEach(my_layers, function(layer){
            states.push(layer.toggle());
        });
        if(!params.deferUpdate){
            map.update();
        }
        return states;
    };

    /**
     * Getter/Setter of the onAddNetworkLayer function
     * @method onAddNetworkLayer
     * @param {Function} value - Method that defines how to add a network layer to the map 
     * @chainable
     */
    map.onAddNetworkLayer = function(value){
        if(!arguments.length){ return onAddNetworkLayer; }
        onAddNetworkLayer = value;
        return map;
    };

    /**
     * Adds a network layer to the map 
     * @method addNetworkLayer
     * @param {Object} layer - The layer configuration object 
     * @param {String:Required} layer.name - The name of the layer
     * @param {Boolean:Optional(true)} layer.active - Whether or not the layer should be active
     * @param {Object:Optional} layer.onLinkEvent - An object key'd on event types whose values are callbacks to be executed when the event happens to an adjacency 
     * @param {Object:Optional} layer.onEndpointEvent - An object key'd on event types whose values are callbacks to be executed when the event happens to a pop
     * @param {Object:Optional} layer.map2dataSource - An object defining how to derive data from the layers topology object 
     * @param {Object} layer.map2dataSource.type - Defines the type of map2dataSource object (See [DataSourceFormatter](DataSourceFormatter.html) for list of types)
     * @param {Object} layer.map2dataSource.config - Defines the type of map2dataSource object (See [DataSourceFormatter](DataSourceFormatter.html) for list of types)
     * @param {Array|Object|String} config.layers.map2dataSource.config.source - See [DataSource](DataSource.html)'s param.source constructor parameter for complete list of options
     * @param {Object:Optional} layer.mapSource - A DataSource#source that defines the location of the map topology 
     * @return {NetworkLayer} network_layer - Returns the added layer object
     */
    map.addNetworkLayer = function(layer){
        if(!onAddNetworkLayer){
            console.error("Must set onAddNetworkLayer function in extending map class!");
            return;
        } 
       //modify arguements on layer
        var network_layer = onAddNetworkLayer.apply(map, arguments);

        if(!_assertLayerIsType(network_layer, LAYER_TYPES.NETWORK)){
            return;
        }
        addLayer(network_layer);

        if(layer.active !== false){
            network_layer.update(); 
        }

        return network_layer;
    };

    /**
     * Getter/Setter of the onAddKmlLayer function
     * @method onAddKmlLayer
     * @param {Function} value - Method that defines how to add a kml layer to the map 
     * @chainable
     */
    map.onAddKmlLayer = function(value){
        if(!arguments.length){ return onAddKmlLayer; }
        onAddKmlLayer = value;
        return map;
    };
    /**
     * Getter/Setter of the onAddKmzLayer function
     * @method onAddKmzLayer
     * @param {Function} value - Method that defines how to add a kml layer to the map
     * @chainable
     */
    map.onAddKmzLayer = function(value){
        if(!arguments.length){ return onAddKmzLayer; }
        onAddKmzLayer = value;
        return map;
    };
    /**
     * Adds a kmz layer to the map
     * @method addKmzLayer
     * @param {Object} layer - The layer configuration object
     * @param {String:Required} layer.name - The name of the layer
     * @param {Boolean:Optional(true)} layer.active - Whether or not the layer should be active
     * @param {Object:Optional} layer.source - A DataSource#source that defines the location of the kml file
     * @return {BaseLayer} kml_layer - Returns the added kml layer object
     */
    map.addKmzLayer = function(layer){
        if(!onAddKmlLayer){
            console.error("Must set onAddKmlLayer function in extending map class!");
            return;
        }
        //convert url obj if need be
        var source_params = ds({ source: layer.source, noRequest: true });
        layer.url = source_params.url;

        var kmz_layer = onAddKmzLayer.apply(map, arguments);
        if(!_assertLayerIsType(kmz_layer, LAYER_TYPES.KML)){
            return;
        }
        addLayer(kmz_layer);

        return kmz_layer;
    };

    /**
     * Adds a kml layer to the map 
     * @method addKmlLayer
     * @param {Object} layer - The layer configuration object 
     * @param {String:Required} layer.name - The name of the layer
     * @param {Boolean:Optional(true)} layer.active - Whether or not the layer should be active
     * @param {Object:Optional} layer.source - A DataSource#source that defines the location of the kml file
     * @return {BaseLayer} kml_layer - Returns the added kml layer object
     */
    map.addKmlLayer = function(layer){
        if(!onAddKmlLayer){
            console.error("Must set onAddKmlLayer function in extending map class!");
            return;
        }
        //convert url obj if need be
        var source_params = ds({ source: layer.source, noRequest: true });
        layer.url = source_params.url;

        var kml_layer = onAddKmlLayer.apply(map, arguments);
        if(!_assertLayerIsType(kml_layer, LAYER_TYPES.KML)){
            return;
        }
        addLayer(kml_layer);
        
        return kml_layer;
    };

    /**
     * Getter/Setter of the onAddGeoJsonLayer function
     * @method onAddGeoJsonLayer
     * @param {Function} value - Method that defines how to add a geoJson layer to the map
     * @chainable
     */
    map.onAddGeoJsonLayer = function(value){
        if(!arguments.length){ return onAddGeoJsonLayer; }
        onAddGeoJsonLayer = value;
        return map;
    };

    /**
     * Adds a geoJson layer to the map
     * @method addGeoJsonLayer
     * @param {Object} layer - The layer configuration object
     * @param {String:Required} layer.name - The name of the layer
     * @param {Boolean:Optional(true)} layer.active - Whether or not the layer should be active
     * @param {Object:Optional} layer.source - A DataSource#source that defines the location of the geoJson file
     * @return {BaseLayer} geoJson_layer - Returns the added geoJson layer object
     */
    map.addGeoJsonLayer = function(layer){
        if(!onAddGeoJsonLayer){
            console.error("Must set onAddGeoJsonLayer function in extending map class!");
            return;
        }
        //convert url obj if need be
        var source_params = ds({ source: layer.source, noRequest: true });
        layer.url = source_params.url;

        var geo_json_layer = onAddGeoJsonLayer.apply(map, arguments);
        if(!_assertLayerIsType(geo_json_layer, LAYER_TYPES.GEOJSON)){
            return;
        }
        addLayer(geo_json_layer);
        
        return geo_json_layer;
    };

    /**
     * Getter/Setter of the onAddTileLayer function
     * @method onAddTileLayer
     * @param {Function} value - Method that defines how to add a tile layer to the map
     * @chainable
     */
    map.onAddTileLayerWMS = function(value){
        if(!arguments.length){ return onAddTileLayerWMS; }
        onAddTileLayerWMS = value;
        return map;
    };

    /**
     * Getter/Setter of the onAddTileLayer function
     * @method onAddTileLayer
     * @param {Function} value - Method that defines how to add a tile layer to the map
     * @chainable
     */
    map.onAddTileLayer = function(value){
        if(!arguments.length){ return onAddTileLayer; }
        onAddTileLayer = value;
        return map;
    };


    /**
     * Adds a tile layer to the map
     * @method addTileLayerWMS
     * @param {Object} layer - The layer configuration object
     * @param {String:Required} layer.name - The name of the layer
     * @param {Boolean:Optional(true)} layer.active - Whether or not the layer should be active
     * @param {Object:Optional} layer.source - A DataSource#source that defines the location of the map tiles
     * @return {BaseLayer} tile_layer - Returns the added tile layer object
     */
    map.addTileLayerWMS = function(layer){
        if(!onAddTileLayerWMS){
            console.error("Must set onAddTileLayerWMS function in extending map class!");
            return;
        }
        if(!layer.source){
            console.error("Must pass in a source for the tile layer!");
        }
        //convert url obj if need be
        var source_params = ds({ source: layer.source, noRequest: true });
        layer.url = source_params.url;
	layer.params = layer.source;
        layer.opacity = (layer.opacity !== undefined) ? layer.opacity : 1;

        var tile_layer = onAddTileLayerWMS.apply(map, arguments);
        if(!_assertLayerIsType(tile_layer, LAYER_TYPES.TILE_WMS)){
            return;
        }
        addLayer(tile_layer);

        return tile_layer;
    };
    /**
     * Adds a tile layer to the map 
     * @method addTileLayer
     * @param {Object} layer - The layer configuration object 
     * @param {String:Required} layer.name - The name of the layer
     * @param {Boolean:Optional(true)} layer.active - Whether or not the layer should be active
     * @param {Object:Optional} layer.source - A DataSource#source that defines the location of the map tiles
     * @return {BaseLayer} tile_layer - Returns the added tile layer object
     */
    map.addTileLayer = function(layer){
        if(!onAddTileLayer){
            console.error("Must set onAddTileLayer function in extending map class!");
            return;
        }
        if(!layer.source){
            console.error("Must pass in a source for the tile layer!");
        }
        //convert url obj if need be
        var source_params = ds({ source: layer.source, noRequest: true });
        layer.url = source_params.url;
        layer.opacity = (layer.opacity !== undefined) ? layer.opacity : 1;
        
        var tile_layer = onAddTileLayer.apply(map, arguments);
        if(!_assertLayerIsType(tile_layer, LAYER_TYPES.TILE)){
            return;
        }
        addLayer(tile_layer);

        return tile_layer;
    };

    /**
     * Getter/Setter of the onLineWidth function
     * @method onLineWidth
     * @param {Function} value - Method that defines how to compute line width for the map (Generally line width is relative to zoom level)
     * @chainable
     */
    map.onLineWidth = function(value){
        if(!arguments.length){ return onLineWidth; }
        onLineWidth = value;
        return map;
    };

    /**
     * Returns the lineWidth of the mapo
     * @method lineWidth
     * @return {Integer} lineWidth - Returns the current lineWidth
     */
    map.lineWidth = function(){
        var lineWidth = onLineWidth();
        return lineWidth;
    };

    /**
     * Getter/Setter of the onResize function
     * @method onResize
     * @param {Function} value - Method that defines how to resize components on the map
     * @chainable
     */

    map.onResize = function(value){
	if(!arguments.length){ return onResize; }
        onResize = value;
        return map;
    }

    /**
     * Getter/Setter of the onUpdate function
     * @method onUpdate
     * @param {Function} value - Method that defines how to update components on the map 
     * @chainable
     */
    map.onUpdate = function(value){
        if(!arguments.length){ return onUpdate; }
        onUpdate = value;
        return map;
    };

    /**
     * Updates components on the map 
     * @method update
     */
    map.update = function(){
        onUpdate.apply(map, arguments);
    };

    /**
     * Deselects any selected elements
     * @method deselectAll
     */
    map.deselectAll = function() {
        var networkLayers = map.layers({layerTypes: [LAYER_TYPES.NETWORK]});
        console.log('networkLayers');
        console.log(networkLayers);
        _.forEach(networkLayers, function(l) {
            if(l.topology() !== undefined){
                l.topology().deselectAll();
            }
        });
    };

    /** Getter of the color scheme
     * @method colorScheme
     */
   // map.colorScheme = function(){ return colorScheme; }

    /**
     * Getter/Setter of the onInit function
     * @method onInit
     * @param {Function} value - Method that performs some initialization procedures to be executed once when the map intializes 
     * @chainable
     */
    map.onInit = function(value){
        if(!arguments.length){ return onInit; }
        onInit = value;
        return map;
    };
    
    // helper function to draw legend
    function _drawLegend(legend) {

        if(legend.show && legend.adjLoadLegend){
            // check if legend already exists and remove it if it does
            if(d3.select("."+config.containerId)){
               d3.select("."+config.containerId+".legend-wrapper").remove();
            }
            let legendContainer = d3.select(map.wrapper()).select('div')
                .append('div')
                .classed(config.containerId, true)
                .classed('legend-wrapper', true);

            // determine legend alignment 
            let align = legend.adjLoadLegend.horizontal ? {
                relative: true,
                node: legendContainer.node(),
                position: 'bl',      
            } : 'null';
            if(!align){
                console.error('Do not currently support anything other than horizontal legends');
                return;
            }

            let numberLocations = legend.adjLoadLegend.numberLocations;
            numberLocations = [];

            let items = [];
            //if mode === spectrum,  generate legend colors
            if(legend.mode === 'spectrum'){
                items = [];
                let col_len = legend.legend_colors.length;
                let width_factor = 100/col_len;
                for(let i = 1; i < col_len+1; i++){
                    items.push({
                        value: i*width_factor,
                        color: legend.legend_colors[i-1],
                        opacity: 1
                    });
                }
            }else if(legend.mode === 'opacity'){ //if mode === opacity, generate opacity values;
                items = [];
                let op_len = legend.opacity.length;
                let width_factor = 100/op_len;
                for( let i = 1; i<op_len+1; i++){
                    items.push({
                        value: i*width_factor,
                        color: legend.card_color,
                        opacity: legend.opacity[i-1]
                    });
                }
            }else if(legend.mode === 'threshold'){
                items = [];
                if(!legend.legend_colors) return;
                let col_len = legend.legend_colors.length;
                let width_factor = [];
                _.forEach(legend.thresholds,function(el){
                    width_factor.push(parseInt(el));   
                });
                width_factor.unshift(0);
                width_factor.push(100);
                numberLocations = width_factor; 
                for(let i = 1;i<col_len+1;i++){
                    items.push({
                        value: width_factor[i],
                        color:legend.legend_colors[i-1],
                        opacity: 1
                    });
                }
            }
            
            // determine legend width
            let legend_width;
            if(legend.adjLoadLegend.width){
                // check if % is passed in and compute leged width to be % of map width
                if(legend.adjLoadLegend.width.constructor === String && legend.adjLoadLegend.width.match('%')){
                    legend_width = Math.round(map.width() * (parseInt(legend.adjLoadLegend.width) / 100));
                } else {
                    legend_width = parseInt(legend.adjLoadLegend.width); // width in pixels
                }
            } else {
                legend_width = Math.round(map.width() * 0.4); // Default legend 40% of map's width
            }

            // Instantiate the Legend
            Legend({
                width: legend_width,
                description: (map.mapType() === 'mini') ? 'Lines show the maximum directional flow of traffic, the arrow indicates direction, the color shows the percent of total capacity.' : 'Line color shows the percent of total capacity currently measured on the adjacency',
                items: items,
                align: align, 
                orientation: legend.adjLoadLegend.horizontal ? 'horizontal' : null,
                numberLocations: numberLocations,
                mode: legend.mode
            });
        }
        else{
            d3.selectAll("."+config.containerId+".legend-wrapper").remove();
        }
    }
    
    // Function to draw legend. 
    map.drawLegend = function(legend){
        _drawLegend(legend);
    }

    /**
     * Initializes the map
     * @method init
     */
    map.init = _.once(function(){
        //var container = d3.select('#'+map.containerId());

        //wrap the map container in a div so we can draw legends and other supplemnental
        //information around the map with relative position
        Functions.wrap(map.wrapper(), map.container());

        map.width(container.node().getBoundingClientRect().width);
        map.height(container.node().getBoundingClientRect().height);
        
        //create our info div 
        map.infoDiv(InfoDiv({
            className: map.mapType(),
            align: {
                node: d3.select('#'+map.containerId()).node()
            } 
        }));

        //set onInit function if one was passed in
        if(config.onInit){ map.onInit(config.onInit); }
        onInit();

        //get the clients lat/lng location if the user allows it and the browser is capable
        if (navigator.geolocation && config.getClientLatLng) {
            navigator.geolocation.getCurrentPosition(function(position){
                clientLatLng = [
                    position.coords.latitude,
                    position.coords.longitude
                ];
            });
        } 

        //set the layers if any initial layers where added on instatiation
        if(config.kmlLayers){
            _.forEach(config.kmlLayers, function(layer){
                map.addKmlLayer(layer);
            });
        }
        //set the layers if any initial layers where added on instatiation
        if(config.tileLayers){
            _.forEach(config.tileLayers, function(layer){
                map.addTileLayer(layer);
            });
        }
        //set the layers if any initial layers where added on instatiation
        if(config.networkLayers){
            _.forEach(config.networkLayers, function(layer){
                map.addNetworkLayer(layer);
            });
        }
        
        //add a click handler to the map div that deselects all topology elements
        //and hides any pinned info divs
        if(map.mapType() !== MAP_TYPES.CESIUM){ 
            container.on('click', function() {
                map.deselectAll();
                map.infoDiv().hide({
                    pin: false
                });
                map.update();
            });
        }
       // _drawLegend();
       return map;
    });

    return map;
};
module.exports = BaseMap;

