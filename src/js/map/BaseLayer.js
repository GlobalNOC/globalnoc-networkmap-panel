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
* The Base Factory that all Layers should inherit from.
* ```
var layer = BaseLayer(config)
```
* @class BaseLayer
* @constructor BaseLayer
* @static 
* @param {Object} config - The configuration object for the BaseLayer
* @param {String:Required} config.name - Required: The layers' name 
* @param {String:Required} config.layerType - The layers' type 
* @param {String:Optional(true)} config.active - Whether or not the layer is active
*/

var _        = require('lodash');
var Interval = require('../util/Interval.js');

var BaseLayer = function(config){
    config = config || {};


    var map = config.map;
    var layer = {};
    layer.__baseFactory__ = 'Layer';

    //check for required config bits
    if(!config.layerType){
        console.error('Must provide a layerType');
        return;
    }


    var initDone = false;

    /** 
     * The name of the layer
     * @property {String} name
     * @private 
     */
    var name = config.name;
    /** 
     * The unique id assigned to the layer when it's created
     * @property {String} layerId
     * @private 
     */
    var layerId   = _.uniqueId('layer_');
    /** 
     * The layer's type
     * @property {String} layerType
     * @private 
     */
    var layerType = config.layerType;
    /** 
     * Whether or not the layer is active
     * @property {Boolean} active
     * @private 
     */
    var active = (config.active !== undefined) ? config.active : true;
    /** 
     * A object storing all the interval functions set on the layer
     * @property {Object} intervals
     * @private 
     */
    var intervals = {};
    /** 
     * A function to be called when the layer is toggled 
     * @property {Function} onToggle
     * @private 
     */
    var onToggle  = function(){ console.error("Must set onToggle in extended Layer"); };
    /** 
     * A function to be called when the layer is removed
     * @property {Function} onRemove
     * @private 
     */
    var onRemove  = function(){ console.error("Must set onRemove in extended Layer"); };
    /** 
     * A function to be called when the layer is updated
     * @property {Function} onUpdate
     * @private 
     */
    var onUpdate  = function(){ console.error("Must set onUpdate in extended Layer"); };

    var onInitComplete = function(){ console.error("must set onInitComplete")};


    layer.isInitDone = function(value){
	if(!arguments.length){
	    return initDone;
	}else{
	    initDone = value;
	}
	return initDone;
    }
    
    /** 
     * Getter/Setter Function for the Layer's containing map object
     * @method map
     * @chainable
     */
    layer.map = function(value){
        if(!arguments.length){ return map; }
        map = value;
        return layer;
    };

    /** 
     * Getter/Setter Function for the Layer's name 
     * @method name
     * @param {String} value - The layer's new name 
     */
    layer.name = function(value){
        if(!arguments.length){ return name; }
        name = value;
        return layer;
    };

    /** 
     * Getter Function for the Layer's active property
     * @method active
     */
    layer.active = function(){
        return active;
    };

    /** 
     * Getter Function for the Layer's type
     * @method layerType
     */
    layer.layerType = function(){
        return layerType;
    }

    /** 
     * Getter Function for the Layer's id
     * @method layerId
     */
    layer.layerId   = function(){
        return layerId;
    };

    /** 
     * Function to add a new Interval Function to the layer
     * @method addInterval
     * @param {Object} params - Function to be called when the layer is removed 
     * @param {Function:Required} param.func - The function to be called 
     * @param {Integer:Required} param.intervalSeconds - The interval in seconds to call the function on 
     */
    layer.addInterval = function(params){
        var intervalFunc = Interval(params);
        intervals[intervalFunc.intervalId()] = intervalFunc;
        //if the layer is active just start the interval now
        if(active){ intervalFunc(); }
        return intervalFunc;
    };

    /** 
     * Returns all the Interval Objects that have been added to the layer 
     * @method intervals
     */
    layer.intervals = function(){
        return _.values(intervals);
    };


    layer.onInitComplete = function(value){
	if(!arguments.length){ return onInitComplete; }
        onInitComplete = value;
        return layer;
    }
   

    layer.initComplete = function(){
	onInitComplete.call(layer);
    }

    /** 
     * Getter/Setter of the onToggle Function
     * @method onToggle
     * @param {Function} value - Function to be called when the layer is toggled
     * @chainable
     */
    layer.onToggle = function(value){
        if(!arguments.length){ return onToggle; }
        onToggle = value;
        return layer;
    };
    
    /** 
     * Toggle's the visibility of the layer and disabled any intervals added to the layer 
     * @method toggle
     * @param {Boolean:Optional} value - Determines whether the layer is on/off with true/false respectively, logically NOT's the current value of active if no value is provided 
     * @chainable
     * @return {Boolean} active - The active properties' new value
     */
    layer.toggle = function(bool){
        if(!arguments.length){
            active = !active;
        }else {
            active = bool;
        }
        //toggle any set intervals when we toggle the layer
        _.invoke(intervals, 'toggle', active);
        
        onToggle.call(layer, active);
        return active;
    };

    /**
     * Getter/Setter of the onRemove property
     * @method onRemove
     * @param {function} value - Function to be called when the layer is removed 
     * @chainable
     */
    layer.onRemove = function(value){
        if(!arguments.length){ return onRemove; }
        onRemove = value;
        return layer;
    };

    /**
     * Removes a layer from the containing map
     * @method remove
     */
    layer.remove = function(){
        //toggle any set intervals when we toggle the layer
        _.invoke(intervals, 'remove');

        onRemove.apply(layer, arguments);
    };

    /**
     * Getter/Setter of the onUpdate property
     * @method onUpdate
     * @param {Function} value - Function to be called when the layer is updated
     * @chainable
     */
    layer.onUpdate = function(value){
        if(!arguments.length){ return onUpdate; }
        onUpdate = value;
        return layer;
    };

    /**
     * Updates the layer and its components
     * @method update
     */
    layer.update = function(){
        if(!active){
            console.warn('Not updating inactive layer, '+layer.name());
            return;
        }
        return onUpdate.apply(layer, arguments);
    };

    /**
     * Getter/Setter of the onInit property
     * @method onInit
     * @param {function} value - Function to be called when the layer is initialized
     * @chainable
     */
    layer.onInit = function(value){
        if(!arguments.length){ return onInit; }
        onInit = value;
        return layer;
    };

    /**
     * Initializes the layer
     * @method init
     */
    layer.init = _.once(function(){
        onInit.apply(layer, arguments);
    });

    return layer;
};
module.exports = BaseLayer;
