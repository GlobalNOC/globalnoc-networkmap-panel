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

var d3           = require('d3');
var _            = require('lodash');
var NetworkLayer = require('./NetworkLayer.js');
/**
 * ```
 editorLayer = EditorLayer({
 svg: bg.append("g"),
 onLatLngToXy: map.onLatLngToXy()
 }).onAdjacencyEvent('click', cktClick)
 .onPopEvent('mouseenter',function(d){
 d3.select(d.event.target).style("cursor", "grab");
 lmap.dragging.disable();
 })
 .onPopEvent('mouseout' ,function(d){
 d3.select(d.event.target).style("cursor", "default");
 lmap.dragging.enable();
 })
 .onXyToLatLng(function(xy){
 var latlng = lmap.layerPointToLatLng(L.point(xy[0], xy[1]));
 return [latlng.lat, latlng.lng];
 })
 .onEdit(function(){
 map.topology(editorLayer.topology());
 })
 .topology(topology);

 ```
 * @class EditorLayer
 * @extends NetworkLayer
 * @constructor
 * @static
 * @param {Object} params - The configuration parameters
 * @param {d3.selection(svg):Required} params.svg - A d3 selection of the svg element to render the editor layer into 
 * @param {Function} params.onLatLngToXy - A function defining how to convert a lat/lng coordinate to an xy coordinate 
 */

var EditorLayer = function(params){
    var layer = NetworkLayer(params);

    if(!params.svg){
        console.error("Must provide svg element to render into");
    }
    //add an id and class to the layer
    var svg = params.svg;
    svg.attr('id', layer.layerId());
    svg.attr('class', 'editor');

    //interpolate the editro lines as straight lines
    var line = d3.svg.line()
        .interpolate("linear")
        .x(function(d) { 
            return layer.latLngToXy([d.lat,d.lon])[0] 
        })
        .y(function(d) {
            return layer.latLngToXy([d.lat,d.lon])[1]
        });

    /**
     * Getter/Setter of the onEdit function
     * @method onEdit
     * @param {Function} value - Method that defines what to do when the layer is edited 
     * @chainable
     */
    layer.onEdit = function(value){
        if(!arguments.length){ return onEdit; }
        onEdit = value;
        return layer;
    };

    /**
     * Getter/Setter of the onEditEnd function
     * @method onEditEnd
     * @param {Function} value - Method that defines what to do when the layer is finished being edited 
     * @chainable
     */
    layer.onEditEnd = function(value){
        if(!arguments.length){ return onEditEnd; }
        onEditEnd = value;
        return layer;
    };

    //update the layer any time the topology is set
    layer.onTopology(function(topology, params){
        layer.update(topology, params);
    });

    //define the behavior when dragging a point on the editor layer
    var drag = d3.behavior.drag()
        .origin(function(d) {
            return {
                x: layer.latLngToXy([d.lat,d.lon])[0],
                y: layer.latLngToXy([d.lat,d.lon])[1]
            };
        })
        .on("drag", function(d){
            //--- figure out the event x,y then inverse project
            var newLatLng = layer.xyToLatLng([d3.event.x, d3.event.y]);

            //--- set the x,y on the circle
            d3.select(this)
                .attr("cx", d.x = d3.event.x)
                .attr("cy", d.y = d3.event.y);

            //--- upate the data values hopefully  !!!! need to hide the goofy leaflet use of .lng
            d.lat = newLatLng[0];
            d.lon = newLatLng[1];


            //--- if it was an endpoint that was moved on an adjacency we want to sync the relevant
            //--- pop coordinate with the new location and sync any adjacencies endpoints that terminate
            //--- on that pop 
            var updateArgs = (d.endpoint) ? { adj_moved: d } : undefined;

            //--- rerender the whole layer so that the lines update too
            layer.update(layer.topology(), updateArgs);

            //--- signal change 
            onEdit.call(layer);
        })
        .on('dragend',function(d){
            onEditEnd.call(layer);
        });

    //instuct how to get the adjacency elements
    layer.onAdjacencies(function(){
        return svg.selectAll("g.adjacency");
    });

    //instuct how to get the pop elements
    layer.onPops(function(){
        return svg.selectAll("g.pop");
    });

    //instuct how to update the layer 
    layer.onUpdate(function(topology, params){
        params = params || {};

        if(!layer.topology()){
            console.warn('No topology set, skipping update for '+layer.name());
            return;
        }

        // sync pop and relavent adjacency endpoints if necessary
        if(!_.isEmpty(params) && (params.adj_moved || params.pop_moved)){
            layer.topology().syncAdjEndpoints(params);
        }

        //--- Render Adjacencies
        var adjs = layer.adjacencies()
            .data(layer.topology().data().adjacencies, function(d){
                return d.adjacencyId;
            });

        //--- ENTER -- add any new adjacencies
        var adjsEnter = adjs.enter()
            .append("g")
            .attr("id", function(d) { return d.adjacencyId; })
            .attr("class","adjacency");

        //add a shadow path for new adjacencys
        adjsEnter.append("path")
            .attr("d",function(d){
                return line(d.path)
            })
            .attr("class","editorShadow")
            .call(function(selection){
                _.forEach(layer.onAdjacencyEvent(), function(callback, evt){
                    selection.on(evt, function(d){
                        callback({
                            event: d3.event,
                            data:  d
                        });
                    });
                });
            });

        //add a highlight path for new adjacencys
        adjsEnter.append("path")
            .attr("d",function(d){
                return line(d.path)
            })
            .attr("class","editorHighlight")
            .call(function(selection){
                _.forEach(layer.onAdjacencyEvent(), function(callback, evt){
                    selection.on(evt, function(d){
                        callback({
                            event: d3.event,
                            data:  d
                        });
                    });
                });
            });


        //add the control points along the path
        adjsEnter.append('g').attr('class', 'adjacency-control-points')
            .selectAll('circle.control-point')
            .data(function(d){ return d.path; })
            .enter().append('circle')
            .attr("cx", function (d){ 
                return layer.latLngToXy([d.lat,d.lon])[0]; 
            })
            .attr("cy", function (d){ 
                return layer.latLngToXy([d.lat,d.lon])[1]; 
            })
            .attr("r", "6px")
            .classed("control-point", true)
            .classed("hidden", function(d){
                return (!d.endpoint);
            })
            .call(function(selection){
                _.forEach(layer.onPopEvent(), function(callback, evt){
                    selection.on(evt, function(d){
                        callback({
                            event: d3.event,
                            data:  d
                        });
                    });
                });
            })
            .call(drag);

        //--- UPDATE -- update the paths of any existing adjacencies

        //update shadow path
        adjs.select(".editorShadow")
            .attr("d",function(d){
                return line(d.path)
            })
        //update highlight path
        adjs.select(".editorHighlight")
            .attr("d",function(d){
                return line(d.path)
            })

        var pops = adjs.selectAll('circle.control-point')
            .data(function(d){ 
                return d.path; 
            },function(d){ 
                return d.waypointId;
            });

        
        pops.attr("d",  function (d){
            return d; 
        })
            .attr("cx", function (d){ 
                return layer.latLngToXy([d.lat,d.lon])[0]; 
            })
            .attr("cy", function (d){ 
                return layer.latLngToXy([d.lat,d.lon])[1]; 
            })
            .classed('end-point',function(d,i){
                return d.endpoint;
            });

        pops.enter().append('circle')
            .attr("r", "6px")
            .classed("control-point", true)
            .call(function(selection){
                _.forEach(layer.onPopEvent(), function(callback, evt){
                    selection.on(evt, function(d){
                        callback({
                            event: d3.event,
                            data:  d
                        });
                    });
                });
            })
            .call(drag);
        
        //--- EXIT -- remove any adjacencys we no longer need
        adjs.exit().remove();
        pops.exit().remove();
    });

    return layer;
};
module.exports = EditorLayer;
