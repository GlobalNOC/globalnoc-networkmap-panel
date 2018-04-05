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

var ds                  = require('../util/DataSource.js');
var _                   = require('lodash');
var BaseLayer           = require('./BaseLayer');
var Topology            = require('../util/Topology.js');
//var DataSourceFormatter = require('../util/DataSourceFormatter');
var Functions           = require('../util/Functions.js');
var NETWORK_LAYER_TYPE  = require('../util/Enums').LAYER_TYPES.NETWORK;
var d3        = require('d3');
require('d3-geo-projection')(d3); //externd d3 with extra geo projections
/**
* Adds additional network specific functionality to BaseLayer  
* ```
var layer = NetworkLayer(config)
```
* @class NetworkLayer
* @extends BaseLayer
* @constructor BaseLayer
* @static
* @param {Object} params - The configuration object for the NetworkLayer
* @param {Object:Optional} params.onLinkEvent - An object key'd on event types whose values are callbacks to be executed when the event happens to a link
* @param {Object:Optional} params.onEndpointEvent - An object key'd on event types whose values are callbacks to be executed when the event happens to an endpoint
* @param {Function:Required} params.onLatLngToXy - A function describing how to convert lat/lng coordinates to xy coordinates 
*/
var NetworkLayer = function(params){
    var layer = BaseLayer(_.merge({ layerType: NETWORK_LAYER_TYPE }, params));
    var offsets = params.offsets || [0];
    if(!params.map){
        console.error("Must pass in a reference to the containing map object!");
        return;
    }
    var tooltip;
    if(params.tooltip){
        tooltip = params.tooltip;
    }
   

    /**
     * A css hex color string used to define the color of the endpoints
     * @property {String} endpointColor
     * @private
     */
    var endpointColor;

    /**
     * A css opacity value to set the opacity of endpoints
     * @property {Integer} endpointOpacity
     * @private
     */
    var endpointOpacity;

    /**
     * A css hex color string used to define the color of link lines
     * @property {String} lineColor
     * @private
     */
    var lineColor;
    
    /**
     * A css opacity value to set the opacity of link lines
     * @property {Integer} lineOpacity
     * @private
     */
    var lineOpacity;
    /**
     * The width of lines representing links on the layer 
     * @property {Integer} lineWidth
     * @private
     */
    var lineWidth = params.lineWidth;
    /**
     * The function to be called when retrieving the maps' lineWidth
     * @property {Funciton} onLineWidth
     * @private
     */
    var onLineWidth = function(){};
    /** 
     * The topology object of the network layer
     * @property {Topology} topology - The Topology object of the network layer
     * @private 
     */
    var topology;
    /** 
     * The function defining how to convert from xy coordinates to lat/lng coordinates
     * @property {Function} onXyToLatLng
     * @private 
     */
    var onXyToLatLng = params.onXyToLatLng;


    /** 
     * The function defining how to convert from xy coordinates to lat/lng coordinates
     * @property {Function} onXyToLatLng
     * @private 
     */
    var max; 
    var min;

    /** 
     * A function describing how to convert from lat/lng coordinates to xy coordinates 
     * @property {Function} onLatLngToXy
     * @private 
     */
    var onLatLngToXy = params.onLatLngToXy || 
        function(){ console.error("Must implement onLatLngToXy in extending layer class"); };
    /** 
     * An object whose keys are event types and values callbacks for those events to be called on endpoints elements 
     * @property {Object} onEndpointEvent
     * @private 
     */
    var onEndpointEvent = params.onEndpointEvent || {
        mouseover: function(params){
            layer.showEndpointInfo({
                endpoint: params.data,
                pos: params.pos
            }); 
        },
        mouseout: function(params){
            layer.map().infoDiv().hide();
        },
        click: function(params){
            layer.showEndpointInfo({
                endpoint: params.data,
                pin: true
            }); 
        }
    };

    /** 
     * An object whose keys are event types and values callbacks for those events to be called on link elements 
     * @property {Object} onLinkEvent
     * @private 
     */
    var onLinkEvent = params.onLinkEvent || {
        mouseover: function(params){ 
            layer.showLinkInfo({
                link: params.data,
		        pos: params.pos
            }); 
        },
        mouseout: function(params){
            layer.map().infoDiv().hide();
        },
        click: function(params){
            layer.showLinkInfo({
                link: params.data,
                pin: true
            }); 
        }            
    };
    /** 
     * A function describing what to do when the layer's topology is set 
     * @property {Function} onTopology
     * @private 
     */
    var onTopology = function(){};
    /** 
     * A function describing how to retrieve the endpoint elements of the layer
     * @property {Function} onEndpoints
     * @private 
     */
    var onEndpoints = function(){ console.error("Must implement onEndpoints in extending layer class"); };
    /** 
     * A function describing how to retrieve the link elements in the layer
     * @property {Function} onLinks
     * @private 
     */
    var onLinks = function(){ console.error("Must implement onLinks in extending layer class"); };
    /** 
     * A function, given an link object, returns the bounding box for the dom window of the link
     * @property {Function} onLinkBoundingClientRect
     * @private 
     */
    var onLinkBoundingClientRect = function(){ console.error("Must implement onLinkBoundingClientRect in extending layer class"); };

    //helper function to make sure some arguements are always passed into the event callback
    function _onEventWrapper(evt, callback){
        return function(){
            if(!layer.active()){ return; }
            if(arguments[0].constructor !== Object){
                console.error('First argument of event handler must be an object!');
                return;
            }
            var data     = arguments[0].data;
            var eventObj = arguments[0].event;
            
            if(data === undefined){
                console.error('Must pass in data for clicked object');
                return;
            }

            //include a boundingClientRect in the function args
            var bb = layer.getBoundingClientRect({
                data: data,
                event: eventObj
            });
            arguments[0].bb = bb;
            
            console.debug(evt+' '+data.name);
            callback.apply(layer, arguments); 
        }
    }

    //helper method to register an event
    function _registerEvent(onEvent, args){
        if(!args.length){
            return onEvent;
        }
        else if(args.length === 1 && args[0].constructor === Object){
            var eventObj = args[0];
            _.forEach(eventObj, function(callback, evt){
                onEvent[evt] = _onEventWrapper(evt, callback);
            });
        }
        else if(args.length === 2){
            var evt      = args[0];
            var callback = args[1];
            onEvent[evt] = _onEventWrapper(evt, callback);
        }else {
            console.error("onEvent must be called with either an event string and callback or an object whose keys are event strings and values are callbacks");
            return;
        }
        return true;
    }

    /**
     * A Getter/Setter for link events. Callbacks can be set two ways; 1.) First arg is event type string and the second arg is the callback to be executed.
     * 2.) A single object arg whose keys are event type strings and whose values are the callbacks to be executed when that event type occurs
     * @method onLinkEvent
     * @param {String:Optional} evt - The event to set the callback for
     * @param {Function:Optional} callback - The callback to be executed given the evt event type
     * @param {Object:Optional} callback_object - A function whose keys are event types and values callback s
     * @chainable
     */
    layer.onLinkEvent = function(){
        var ret = _registerEvent(onLinkEvent, arguments);
        if(ret !== true ){ return ret; }
        return layer; 
    };

    /**
     * A Getter/Setter for endpoint events. Callbacks can be set two ways; 1.) First arg is event type string and the second arg is the callback to be executed.
     * 2.) A single object arg whose keys are event type strings and whose values are the callbacks to be executed when that event type occurs
     * @method onEndpointEvent
     * @param {String:Optional} evt - The event to set the callback for
     * @param {Function:Optional} callback - The callback to be executed given the evt event type
     * @param {Object:Optional} callback_object - A function whose keys are event types and values callback s
     * @chainable
     */
    layer.onEndpointEvent = function(){
        var ret = _registerEvent(onEndpointEvent, arguments);
        if(ret !== true ){ return ret; }
        return layer; 
    };

    //helper function to format the bps string
    function _formatRate(bps){
        var prefix = d3.formatPrefix(bps);

        return d3.format(',.3f')(parseFloat(prefix.scale(bps))) + ' ' + prefix.symbol + 'bps';
    }

    //helper function to get the styling for the circles that indicate laod color in the infoDiv when hovering over a link
    function _getBadgeStyle(color){
        var dc = d3.rgb(color).darker();
        return 'style="background-color: '+color+'; border-color: '+dc+'; text-shadow: 1px 1px '+dc+';"';
    }
    

    function _parseHtml(htmlContent, link){
        var customContent = htmlContent;
        if(link.az.label){
            link.az.name = link.az.label;
        }
        if(link.za.label){
            link.za.name = link.za.label;
        }
        const possible_vars = ['$input.min','$input.max','$input.avg','$input.sum','$output.min','$output.max','$output.avg','$output.sum','$name','$input.name','$output.name','$count'];
        _.forEach(possible_vars, function(variable){
            switch(variable){ 
                case '$name':
                    customContent = customContent.replace(/\$name/g, link.name);
                    break;
                case '$count':
                    customContent = customContent.replace(/\$count/g, link.count);
                case '$input.min':
                    customContent = customContent.replace(/\$input.min/g,link.az.min);
                    break;
                case '$input.max':
                    customContent = customContent.replace(/\$input.max/g, link.az.max);
                    break;
                case '$input.avg':
                    customContent = customContent.replace(/\$input.avg/g, link.az.avg);
                    break;
                case '$input.sum':
                    customContent = customContent.replace(/\$input.sum/g, link.az.sum);
                    break;
                case '$input.name':
                    customContent = customContent.replace(/\$input.name/g, link.az.name);
                    break;
                case '$output.min':
                    customContent = customContent.replace(/\$output.min/g,link.za.min);
                    break;
                case '$output.max':
                    customContent = customContent.replace(/\$output.max/g,link.za.max);
                    break;
                case '$output.avg':
                    customContent = customContent.replace(/\$output.avg/g, link.za.avg);
                    break;
                case '$output.sum':
                    customContent = customContent.replace(/\$output.sum/g, link.za.sum);
                    break;
                case '$output.name':
                    customContent = customContent.replace(/\$output.name/g, link.za.name);
                    break;
                default:
                    break;
            }
        });
        return customContent;
    }

    //helper function to create the body markup for the details div when hovering over an endpoint

    function _createEndpointInfoMarkup(endpoint){
        var endpointStr =`<div class="pop-info">`;
        if(endpoint.label){
            endpointStr += `<div><b>Endpoint Label: </b> ${endpoint.label} </div>`;
        }
        endpointStr += `<div><b>Endpoint Name: </b> ${endpoint.name} </div>`;
        endpointStr += `<hr>`; 
        endpointStr += `<div>`; 
        endpointStr += `<div><table>`;
        endpointStr += `<tr><td style="font-weight: bold;text-align:left">Min:</td><td> ${endpoint.min} </td></tr>`;
        endpointStr += `<tr><td style="font-weight: bold;text-align:left">Max:</td><td> ${endpoint.max} </td></tr>`;
        endpointStr += `<tr><td style="font-weight: bold;text-align:left">Average:</td><td> ${endpoint.avg} </td></tr>`;
        endpointStr += `<tr><td style="font-weight:bold;text-align:left">Current:</td><td> ${endpoint.cur} </td></tr>`;
        endpointStr += `</table></div>`;
        
        endpointStr += `</div>`;

        endpointStr += `</div>`;
        return endpointStr;
    }


    //helper function to create the body markup for the details div when hovering over a link
    function _createLinkInfoMarkup(link){

        if(tooltip.show && !tooltip.showDefault && tooltip.content){
            let customHtml = _parseHtml(tooltip.content, link);
            return customHtml;
        } else if(!tooltip.showDefault){
            return '<div>Choose default tooltip or enter your hover box display options</div>';
        }  
        //create the markup
        var linkStr = '<div class="adj-info">';
        linkStr    += '<div><b>Link:</b> ' + link.name +'</div>';
        linkStr += '<hr>';
        linkStr += '<div>';
        if(link.az.label){
            linkStr += '<div style="float: left"><div><center> To <b>' + link.az.label + '</b></center></div>'; 
        }else {
            linkStr += '<div style="float: left"><div><center> To <b>' + link.az.name + '</b></center></div>';  
        }
        linkStr += '<div><table>';
        linkStr += '<tr><td style="font-weight:bold">Min:</td><td>' + link.az.min + '</td><td>Gbps</td></tr>';
        linkStr += '<tr><td style="font-weight:bold">Max:</td><td>' + link.az.max + '</td><td>Gbps</td></tr>';
        linkStr += '<tr><td style="font-weight:bold">Avg:</td><td>' + link.az.avg + '</td><td>Gbps</td></tr>'; 
        linkStr += '<tr><td style="font-weight:bold">Sum:</td><td>' + link.az.sum + '</td><td>Gbps</td></tr>';
        linkStr += '</table></div></div>';
        
        if(link.za.label){
            linkStr += '<div style="float: right"><div><center> To <b>' + link.za.label + '</b></center></div>';
        } else{
            linkStr += '<div style="float: left"><div><center> To <b>' + link.za.name + '</b></center></div>';
        } 
        linkStr += '<div><table>';
        linkStr += '<tr><td style="font-weight:bold">Min:</td><td>' + link.za.min + '</td><td>Gbps</td></tr>';
        linkStr += '<tr><td style="font-weight:bold">Max:</td><td>' + link.za.max + '</td><td>Gbps</td></tr>';
        linkStr += '<tr><td style="font-weight:bold">Avg:</td><td>' + link.za.avg + '</td><td>Gbps</td></tr>'; 
        linkStr += '<tr><td style="font-weight:bold">Sum:</td><td>' + link.za.sum + '</td><td>Gbps</td></tr>';
        linkStr += '</table></div></div></div>';

        linkStr += '</div>';
        return linkStr;
    }

    /**
     * Displays a panel in the lower right corner of the map containing information about a link
     * @method showLinkInfo 
     * @param {Object} params - The method parameters 
     * @param {Object} params.link - The link object of the link to display info on
     * @param {Boolean} params.pin - If true the panel will continue to be displayed in the corner otherwise it will dissapear after a few moments
     * @chainable
     */
    layer.showLinkInfo = function(params){
        var link = params.link; 
        var div_pos = params.pos;
        if(!tooltip.show) return;
        var linkStr = _createLinkInfoMarkup(link);

        //if the infoDiv is not already pinned and we were told to pin this
        //select and update 
        if(params.pin){
            if(layer.map().infoDiv().pin()){
                layer.map().deselectAll();
            }
            link.selected = true;
            layer.map().update();
        }

        layer.map().infoDiv().show({
            width: 400,
            content: linkStr,
            pin: params.pin,
	        pos: div_pos // cursor coordinates
        });
    };

    /**
     * A method to update the content of the infoDiv with LinkInformation
     * @method updateLinkInfo
     * @param {Object} params - The method parameters 
     * @param {Object} params.link - The link object of the link to display info on
     * @chainable
     */
    layer.updateLinkInfo = function(params){
        var link = params.link; 

        var linkStr = _createLinkInfoMarkup(link);
        
        layer.map().infoDiv().setContent({
            content: linkStr
        });
    };

    
    layer.updateEndpointInfo = function(params){
        var endpoint = params.endpoint;
        var endpointStr = _createEndpointInfoMarkup(endpoint);
        layer.map().infoDiv().setContent({
            content: endpointStr
        });
    };

    /**
     * Displays a panel in the lower right corner of the map containing information about a endpoint
     * @method showEndpointInfo 
     * @param {Object} params - The method parameters 
     * @param {Object} params.endpoint - The endpoint object of the endpoint to display info on
     * @param {Boolean} params.pin - If true the panel will continue to be displayed in the corner otherwise it will dissapear after a few moments
     * @chainable
     */
    layer.showEndpointInfo = function(params){
        var endpoint = params.endpoint; 
        var div_pos = params.pos;
        if(!tooltip.show) return;

        var endpointStr = _createEndpointInfoMarkup(endpoint); 
        //if it's pinned select the link
        if(params.pin){
            endpoint.selected = true;
            layer.map().update();
        }
        layer.map().infoDiv().show({
            width: 100,
            content: endpointStr,
            pin: params.pini,
            pos: div_pos
        });
    };
    
    /**
     * A Getter/Setter for the onEndpoints method
     * @method onEndpoints
     * @param {Function} value - The method describing how to get endpoint elements for the layer 
     * @chainable
     */
    layer.onEndpoints = function(value){
        if(!arguments.length){ return onEndpoints; }
        onEndpoints = value;
        return layer;
    };

    /**
     * A function that returns the endpoint elements for the layer 
     * @method endpointss
     * @chainable
     */
    layer.endpoints = function(){
        return onEndpoints();
    };

    /**
     * A function sets and gets the max bps of the layer for computing load %
     * @method max
     * @chainable
     */
    layer.max = function(value){
        if(!arguments.length){ return max; }

        max = value;
        
        return max;
    };

    layer.min = function(value){
	if(!arguments.length){ return min; }
	min = value;
	return min;
    };

    /**
     * A Getter/Setter for the onLinks
      @method onLinks
     * @param {Function} value - The method describing how to get link elements for the layer
     * @chainable
     */
    layer.onLinks = function(value){
        if(!arguments.length){ return onLinks; }
        onLinks = value;
        return layer;
    };
    
    /**
     * A function that returns the link elements for the layer 
     * @method links
     * @chainable
     */
    layer.links = function(){
        return onLinks();
    };

    /**
     * A Getter/Setter for the onLatLngToXy method
     * @method onLatLngToXy
     * @param {Function} value - The method describing how to convert lat/lng coordiantes to xy coordiates
     * @chainable
     */
    layer.onLatLngToXy = function(value){
        if(!arguments.length){ return onLatLngToXy; }
        onLatLngToXy = value;
        return layer;
    };

    /**
     * A method that converts lat/lng coordiantes to xy coordinates
     * @method onLatLngToXy
     * @return {Array} xy - An array in the format [{x},{y}]
     */
    layer.latLngToXy = function(){
        return onLatLngToXy.apply(layer, arguments);
    };
    
    /**
     * A Getter/Setter for the onXyToLatLng method
     * @method onXyToLatLng
     * @param {Function} value - The method describing how to convert xy coordiantes to lat/lng coordiantes 
     * @chainable
     */
    layer.onXyToLatLng = function(value){
        if(!arguments.length){ return onXyToLatLng; }
        onXyToLatLng = value;
        return layer;
    };

    /**
     * A method that converts xy coordiantes to lat/lng coordinates
     * @method xyToLatLng
     * @return {Array} latlng - An array in the format [{lat},{lng}]
     */
    layer.xyToLatLng = function(){
        return onXyToLatLng.apply(layer, arguments);
    };

    /**
     * A method that takes either an link object or a endpoint object and returns a boundingClientRect
     * a boundingClientRect
     * @method getBoundingClientRect
     * @return {Object} boundingClientRect - An object containing values in catesian space for top, left, right, bottom, height,
     * and width 
     */
    layer.getBoundingClientRect = function(params){
        var data     = params.data;
        var eventObj = params.event;

        var bb;
        //if an event obj exists just determine the bounding box from the target
        if(eventObj){
            bbClientRect = eventObj.target.getBoundingClientRect();
            bb = {
                top: bbClientRect.top,
                bottom: bbClientRect.bottom,
                right: bbClientRect.right,
                left: bbClientRect.left,
                width: bbClientRect.width,
                height: bbClientRect.height
            };
        }
        //otherwise if the data.path key exists it's a link
        else if(data.path){
            bb = layer.linkBoundingClientRect({ link: data });
        }
        //otherwise it must be a endpoint
        else if(data.lat !== undefined && data.lon !== undefined) {
            bb = layer.endpointBoundingClientRect({ endpoint: data });
        }
        else {
            console.error("Error! Must pass an link, endpoint object, or an event object to determine the bounding box!");
            return;
        }

        return bb;
    };

    /**
     * Takes a client bounding box for a network topology element and subtracts the container bounding box
     * values from it. This is used to correct bounding box values that are relative to the container instead
     * of absolute coordinates on the page, such as those returned for cesium elements.
     * @method subtractContainerBoundingClientRect
     * @param {Object} params - The parameter object 
     * @param {Object} params.bb - The bounding box of the netork topology element
     * @chainable
     */
    layer.subtractContainerBoundingClientRect = function(params){
        if(!params.bb){
            console.error("Must pass in the bounding box object");
            return;
        }
        var bb = params.bb;

        var containerBB = d3.select('#'+layer.map().containerId()).node().getBoundingClientRect();
        //subtract the container's offset
        _.forEach(['left','right','top','bottom'], function(key){
            bb[key] = bb[key] + containerBB[key];
        });

        return bb;
    };

    /**
     * A Getter/Setter for the onBoundingBoxClientRect method
     * @method onBoundingBoxClientRect
     * @param {Function} value - The method describing what to do when the topology object is set
     * @chainable
     */
    layer.onLinkBoundingClientRect = function(value){
        if(!arguments.length){ return onLinkBoundingClientRect; }
        onLinkBoundingClientRect = value;
        return layer;
    };
    
    /**
     * A method that takes either a link object or an endpoint object and returns a boundingClientRect
     * a boundingClientRect
     * @method boundingClientRect
     * @return {Object} boundingClientRect - An object containing values in catesian space (the Dom window's cartesian space
     * for top, left, right, bottom, height, and width 
     */
    layer.linkBoundingClientRect = function(params){
        if(!params.link){
            console.error("Must pass in the link data object");
            return;
        }

        return onLinkBoundingClientRect.apply(layer, arguments);
    };
    
    /**
     * A Getter/Setter for the onTopology method
     * @method onTopology
     * @param {Function} value - The method describing what to do when the topology object is set 
     * @chainable
     */
    layer.onTopology = function(value){
        if(!arguments.length){ return onTopology; }
        onTopology = value;
        return layer;
    };

    /**
     * A method that converts xy coordiantes to lat/lng coordinates
     * @method xyToLatLng
     * @return {Array} latlng - An array in the format [{lat},{lng}]
     * @chainable
     * @return {[Topology](Topology.html) topology - Returns a Topology object
     */
    layer.topology = function(value, params){
        if(!arguments.length){ return topology; }
        //convert to a Topology Object if it's not one already
        if(value.__factory__ === undefined || value.__factory__ !== 'Topology'){
            topology = Topology(value, offsets);
        }else {
            topology = value;
        }
        onTopology.call(layer, topology, params);

        layer.update();

        return layer;
    };

    /**
     * Getter/Setter of the onLineWidth function
     * @method onLineWidth
     * @param {Function} value - Method that defines how to compute line width for the map (Generally line width is relative to zoom level)
     * @chainable
     */
    layer.onLineWidth = function(value){
        if(!arguments.length){ return onLineWidth; }
        onLineWidth = value;
        return layer;
    };

    /**
     * Getter/Setter the lineWidth of lines representing links on the layer
     * @method lineWidth
     * @param  {Integer} value - The new value of the lineWidth
     * @return {Integer} lineWidth - Returns the current lineWidth
     * @chainable
     */
    layer.lineWidth = function(value){
        if(arguments.length === 0){ return lineWidth; }
        
        lineWidth = value;
        onLineWidth.call(layer, lineWidth);

        return layer;
    };

    /**
     * Getter/Setter the endpointColor of the circles representing nodes on the layer
     * @method endpointColor 
     * @params {String} value - The new value of the endpointColor as a css color string
     * @return {String} endpointColor - Returns the current endpointColor
     */
    layer.endpointColor = function(value){
        if(arguments.length === 0){ return endpointColor; }
        endpointColor = value;
        return layer;
    };

    /**
     * Getter/Setter the lineColor of lines representing links on the layer
     * @method lineColor
     * @param  {String} value - The new value of the lineColor as a css color string
     * @return {String} lineColor - Returns the current lineColor
     * @chainable
     */
    layer.lineColor = function(value){
        if(arguments.length === 0){ return lineColor; }
       
        lineColor = value;
        
        return layer;
    };

    /**
     * Getter/Setter the endpointOpacity of circles representing nodes on the layer
     * @method endpointOpacity
     * @param {Integer} value - The new value of the endpointOpacity as a css opacity value
     * @return endpointOpacity - Returns the current endpointOpacity
     */
    
    layer.endpointOpacity = function(value){
        if(arguments.length === 0){ return endpointOpacity; }
        endpointOpacity = value;
        return layer;
    };

    /** 
     * Getter/Setter the lineOpacity of lines representing links on the layer 
     * @method lineOpacity
     * @param {Integer} value - The new value of the lineOpacity as a css opacity value
     * @return lineOpacity - Returns the current lineOpacity
     * @chainable
     */
    layer.lineOpacity = function(value){
        if(arguments.length === 0){ return lineOpacity; }
        lineOpacity = value;
        return layer;
    };

    function _isJson(str){
        try {
            JSON.parse(str);
        } catch(e){
            return false;
        }
        return true;
    }

    /**
     * A method that takes a [DataSource](DataSource.html) source object and restrieves a map topology
     * @method loadMap
     * @chainable
     */
    layer.loadMap = function(source){
        let json_obj;
        if(_isJson(source)){
            json_obj = JSON.parse(source);
            let topo = json_obj.results[0];
            if(!topo){
                console.log('No map topology returned for the given source');
                return;
            }
            layer.topology(topo);
        } else {
            var req = ds({
                source: source,
                onSuccess: function(params){
                    var d = params.data.results[0];
                    if(!d){
                        console.error('No map topology returned for '+layer.name()+' ',req);
                        return;
                    }
                    layer.topology(d);
                }
            });
        }
        return layer;
    };

    //extend update function to include updating the info div
    var _superUpdate = layer.update;
    layer.update = function(){
        //do inherited update
        var success = _superUpdate.apply(layer, arguments);
        
        //now check to see if we need to update our infoDiv
        if (layer.map().infoDiv().pin()) {
            if(!layer.topology()){ return; }
            var links = _.find(layer.topology().data().links, function(a) {
                return a.selected;
            });
            if (links) {
                layer.updateLinkInfo({ link: links });
            }
        }
        return success;
    };
    // initialize event handlers if there are any
    if(params.onEndpointEvent){
        layer.onEndpointEvent(params.onEndpointEvent);
    }
    if(params.onLinkEvent){
        layer.onLinkEvent(params.onLinkEvent);
    }
    if(params.max){
        layer.max(params.max);
    }
    if(params.min){
	layer.min(params.min);
    }

    layer.endpointColor(params.endpointColor || '#dddddd');
    layer.endpointOpacity(params.endpointOpacity || 1);
    layer.lineColor(params.lineColor || '#262F36');
    layer.lineOpacity(params.lineOpacity || 1);

    return layer; 
};
module.exports = NetworkLayer;
