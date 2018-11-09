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

var d3                  = require('d3');
var ds                  = require('../util/DataSource.js');
var _                   = require('lodash');
var SingleTubeLayer     = require('./SingleTubeLayer');
var NetworkLayer        = require('./NetworkLayer');

/**
* Modifies the SingleTubeLayer providing additional styling, pulling data on an interval, and coloring links 
* accordingly.
```
var layer = TrafficLayer({
    svg: bg,
    active: layer.active,
    name: layer.name,
    onLatLngToXy: map.onLatLngToXy(),
    onLinkEvent: layer.onLinkEvent,
    onEndpointEvent: layer.onEndpointEvent
}).lineWidth(map.lineWidth())
    .loadMap(layer.mapSource);
```
* @class TrafficLayer
* @extends NetworkLayer
* @constructor TrafficLayer
* @static
* @property {Object} params - The parameter object for the Layer
* @param {d3.selection(svg):Required} params.svg - A d3 selection of the svg element to render the editor layer into
* @param {Integer} params.dataIntervalSeconds - The amount of seconds to pull the data interval on
*/
var TrafficLayer = function(params){
    var layer = NetworkLayer(params);

    if(!params.svg){
        console.error('Must pass in an svg element to render into');
        return;
    }
    var svg = params.svg;

    /** 
     * The underlying singleTubeLayer we are going to style 
     * @property {SingleTubeLayer} singleTubeLayer
     * @default 3
     * @private 
     */
    var singleTubeLayer;

    var selectedId;

    //define how to toggle the layer
    layer.onToggle(function(active){
        singleTubeLayer.toggle(active);
    });

    //define what to do when a topology is set
    layer.onTopology(function(topology){
        singleTubeLayer.topology(topology);
        
        //start interval
        //layer.setDataInterval();
        return layer;
    });

    // adjust arrow scale when the lineWidth is adjusted 
    layer.onLineWidth(function(lineWidth){
        singleTubeLayer.lineWidth(lineWidth);
    });

    /**
     * Returns the d3 svg selection
     * @method svg
     * @return {d3.selection(svg)} params.svg - A d3 selection of the svg element
     */
    layer.svg = function(value){
        return svg;
    };

    //define how to update the layer components
    layer.onUpdate(function(){
        if(!singleTubeLayer){ return; }
        if(!singleTubeLayer.svg()){ return; }
        if(!singleTubeLayer.update()){
            return;
        }

        //now grab the singleTube layer components and add traffic layer styling to them
        var adjs = singleTubeLayer.links(); 

        //--- update arrow color 
        adjs.selectAll(".arrow")
            .attr("style",function(d){
                return "fill: "+d3.rgb("#ffffff")+";opacity: .75; stroke: "+d3.rgb(d.lineColor).darker()
            });

        //--- update circuit width and color
        adjs.select(".adjacencyHighlight")
            .style('stroke-dasharray', function(d){
                return d.lineColor === undefined ? [1,(layer.lineWidth()+2)] : '';
            });

        adjs.select(".adjacencyShadow")
            .style('stroke-dasharray', function(d){
                return d.lineColor === undefined ? [1,(layer.lineWidth()+2)] : '';
            });
    });

    //define what to do when the layer is initialized
    layer.onInit(function(source){
        singleTubeLayer = SingleTubeLayer({
                name: layer.name(),
                svg:  svg.append("g"),
                map: layer.map(),
                active: params.active,
                lineWidth: layer.lineWidth(),
                onLatLngToXy: layer.onLatLngToXy(),
                offsets: params.offsets
            });

            if(layer.topology()){
                singleTubeLayer.topology(layer.topology());
            }

        return layer;
    });

    //extend the onLinkEvent function so that it also calls the singleTubeLayer's onLinkEvent
    _superOnLinkEvent = layer.onLinkEvent;
    layer.onLinkEvent = function(){
        _superOnLinkEvent.apply(layer, arguments);
        return singleTubeLayer.onLinkEvent.apply(layer, arguments);
    };
    
    //extend the onEndpointEvent function so that it also calls the singleTubeLayer's onEndpointEvent
    _superOnEndpointEvent = layer.onEndpointEvent;
    layer.onEndpointEvent = function(){
        _superOnEndpointEvent.apply(layer, arguments);
        return singleTubeLayer.onEndpointEvent.apply(layer, arguments);
    };

    //define how to remove the layer components
    layer.onRemove(function(){
        svg.selectAll("*").remove();
    });

    //initialize the layer
    layer.init();

    return layer; 
};
module.exports = TrafficLayer;
