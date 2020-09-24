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

var d3                 = require('d3');
var NetworkLayer       = require('./NetworkLayer');
var ARROW              = require('../util/Enums').ARROW;
var _                  = require('lodash');
/** 
* Renders a topology object as d3 lines and circles into the provided svg element
```
singleTubeLayer = SingleTubeLayer({
        name: layer.name(),
        svg:  svg.append("g")
    })
    //--- let d3 do the projecting for this example
    .onLatLngToXy(layer.onLatLngToXy())
    .onLinkEvent('mouseover', function(d){
        d3.select(d.event.target).style("cursor", "pointer");
    })
    .onLinkEvent('mouseout', function(d){
        d3.select(d.event.target).style("cursor", "default");
    })
    .onEndpointEvent('mouseover', function(d){
        d3.select(d.event.target).style("cursor", "pointer");
    })
    .onEndpointEvent('mouseout', function(d){
        d3.select(d.event.target).style("cursor", "default");
    });
```
* @class SingleTubeLayer
* @extends BaseLayer
* @constructor SingleTubeLayer
* @static 
* @property {Object} params - The parameter object for the Layer
* @property {d3.selection(svg):Required} params.svg - A d3 selection of the svg element to render the editor layer into 
*/

var SingleTubeLayer = function(params){
    params.lineColor = params.lineColor || '#ddd';
    params.lineOpacity = params.lineOpacity || 1;
    params.endpointOpacity = params.endpointOpacity || 1;
    params.endpointColor = params.endpointColor || '#ddd';
    var layer = NetworkLayer(params);
    if(!params.svg){
        console.error('Must pass in a svg element to render into');
        return;
    }
    var tooltip;
    if(params.tooltip){
        tooltip = params.tooltip;
    }
    //add an id and class to the layer
    var svg = params.svg;
    svg.attr('id', layer.layerId());
    svg.classed(params.map.containerId(), true);
    svg.classed('single-tube', true);

    //define how to toggle the layer
    layer.onToggle(function(active){
        svg.transition().style('opacity', (active) ? 1 : 0);
    });


    var line = d3.svg.line()
    .interpolate("bundle")
    .x(function(d) {
            return layer.latLngToXy([d.lat, d.lon])[0];
        })
    .y(function(d) {
            return layer.latLngToXy([d.lat, d.lon])[1];
        });
    
    //set default event handlers for links if none were passed in
    layer.onLinkEvent(params.onLinkEvent || {
        click: function(d){
            layer.showLinkInfo({
                link: d.data,
                pin: true
            });
            d3.event.stopPropagation();
        },
        mouseover: function(d){ 
            if(!tooltip.show){
                d3.select(d.event.target).style("cursor","default"); 
                return;
            }
            layer.showLinkInfo({
    		link: d.data,
	    	pos: {
		        page_x: d.event.pageX,
		        page_y: d.event.pageY
		    }   
            });
            d3.select(d.event.target).style("cursor", "pointer");
        },
        mouseout: function(d){
            layer.map().infoDiv().hide();
            d3.select(d.event.target).style("cursor", "default");
        }
    });

    //set default event handlers for endpoints if none were passed in
    layer.onEndpointEvent(params.onEndpointEvent || {
        click: function(d){
            layer.showEndpointInfo({
                endpoint: d.data,
                pin: true
            });
            d3.event.stopPropagation();
        },
        mouseover: function(d){
            if(!tooltip.show){
                d3.select(d.event.target).style("cursor","default");
            }
            layer.showEndpointInfo({
                endpoint: d.data,
                pos: {
                    page_x: d.event.pageX,
                    page_y: d.event.pageY
                }
            });
            d3.select(d.event.target).style("cursor", "pointer");
        },
        mouseout: function(d){
            layer.map().infoDiv().hide();
            d3.select(d.event.target).style("cursor", "default");
        }
    });

    /**
     * Returns the d3 svg selection
     * @method svg
     * @return {d3.selection(svg)} params.svg - A d3 selection of the svg element
     */
    layer.svg = function(){
        return svg
    };

    //define how to remove the layer
    layer.onRemove(function(){
        svg.selectAll("*").remove();
    });

    //define how to retrieve the link elements
    layer.onLinks(function(){
        return svg.selectAll("g.adjacency");
    });

    //define how to retrieve the endpoint elements
    layer.onEndpoints(function(){
        return svg.selectAll("g.pop");
    }); 
   
    //helper function to get the angle of the directional arrow 
    function getAngle(pointA,pointB) {
        var dy = pointB.y - pointA.y
        var dx = pointB.x - pointA.x;
        // range (-PI, PI]
        var theta = Math.atan2(dy, dx); 
        // rads to degs, range (-180, 180]
        theta *= 180 / Math.PI; 
        //if (theta < 0) theta = 360 + theta; // range [0, 360)
        return theta;
    }

    //this function sets the correct translation of the directional arrow at the center of
    //the circuitShadow path under the same parent group.
    function arrowTranslate(d){
        if(d.arrow === undefined || d.arrow === ARROW.NONE ){
            return;
        }
    
        //make the scale of the arrow a function of the line width
        var arrow_scale;
        if(layer.lineWidth() <=2){
            arrow_scale = 0;
        }else if(layer.lineWidth() <= 4){
            arrow_scale = 2;
        }else if(layer.lineWidth() <= 6){
            arrow_scale = 3;
        }else{
            arrow_scale = 4;
        }

        var path = d3.select(this.parentNode).select("path").filter(".adjacencyShadow")[0][0];
        var p  = path.getPointAtLength(path.getTotalLength()/2);

        //look after the midpoint in the path (away from A) to get our angle
        var p2 = path.getPointAtLength((path.getTotalLength()/2)+12);
        //if Z is passing more traffic, look before the midpoint to get the angle away from Z
        if(d.arrow == ARROW.ZA){
            p2 = path.getPointAtLength((path.getTotalLength()/2)-12);
        }
        
        var angle = getAngle(p,p2);

        //this works b/c it we know the ratio of the height/width of the arrow is 2 to 1
        //initially it's rendered with the top left corner of its bounding box centered on p
        //so we need to shift it left and up the arrows width and height respectively
        p.y -= 1 * arrow_scale;
        p.x -= 2 * arrow_scale;

        return "translate(" + p.x+','+p.y+ ") scale("+arrow_scale+") rotate("+angle+",2,1)"
    }

    //define how to update the layers components
    layer.onUpdate(function(){
        if(!layer.topology()){
            console.warn('No topology set, skipping update for '+layer.name());
            return;
        }
        //--- Render Links
        var links = layer.links()
            .data(layer.topology().data().links, function(d){
                    return d.linkId;
            });

        //--- ENTER -- add any new links
        var linksEnter = links.enter()
            .append("g")
            .attr("id", function(d) { return d.linkId })
            .attr("class","adjacency");

        //add a shadow path for new adjacencys 
        linksEnter.append("path")
        .attr("d",function(d){
            return line(d.path);
        })
        //.classed('adjacencyShadow adjacencyHighlight', true)
            .attr("class","adjacencyShadow")
            .call(function(selection){
                _.forEach(layer.onLinkEvent(), function(callback, evt){
                    selection.on(evt, function(d){
                        callback({
                            event: d3.event,
                            data:  d
                        });
                    });
                });
            });
	
        //add a highlight path for new links
        linksEnter.append("path")
            .attr("d",function(d){return line(d.path)})
            .attr("class","adjacencyHighlight")
            .call(function(selection){
                _.forEach(layer.onLinkEvent(), function(callback, evt){
                    selection.on(evt, function(d){
                        callback({
                            event: d3.event,
                            data:  d
                        });
                    });
                });
            });
	
        //add directional indicator by appending yet another path to the g
        linksEnter.append("path")
            .attr("class","arrow")
            .attr("d","M.5,1 L0,2 L3,1 L0,0 Z")
            .attr("transform", arrowTranslate);
	
        //--- UPDATE -- update the paths of any existing links
	
        //update shadow path
        links.select(".adjacencyShadow")
            .attr("d",function(d){return line(d.path)})
            .style('stroke-width', function(d){
		var strokeWidth = d.lineColor === undefined ? (layer.lineWidth()-1) : (layer.lineWidth());
                if (d.selected) {
                    return (strokeWidth * 2)+'px';
                } else {
                    return strokeWidth+'px';
                }
            })
            .style('opacity',function(d){
                return d.lineOpacity === undefined ? layer.lineOpacity() : d.lineOpacity;
            })
            .style('stroke', function(d){
                return d.lineColor === undefined ? d3.rgb(layer.lineColor()).darker() : d3.rgb(d.lineColor).darker();
            });
        //update highlight path
        links.select(".adjacencyHighlight")
            .attr("d",function(d){return line(d.path)})
            .style('stroke-width', function(d){
                var strokeWidth = d.lineColor === undefined ? (layer.lineWidth()-2) : (layer.lineWidth()-1);
                if (d.selected) {
                    return (strokeWidth * 2)+'px';
                } else {
                    return strokeWidth+'px';
                }
            })
            .style('opacity', function(d){
                return d.lineOpacity === undefined ? layer.lineOpacity() : d.lineOpacity;
            })
            .style('stroke', function(d){
                return d.lineColor === undefined ? d3.rgb(layer.lineColor()) : d3.rgb(d.lineColor);
            });
        
        //update arrow path
        links.select('.arrow')
            .attr("transform",arrowTranslate);
	
        //--- EXIT -- remove any links we no longer need
        links.exit().remove();

       
        //--- Render Endpoints
        var endpoints = layer.endpoints()
            .data(layer.topology().data().endpoints, function(d){
                    return d.endpointId;
            });

        //--- ENTER -- add any new endpoints
        var endpointsEnter = endpoints.enter().append("g")
            .attr("id", function(d) { return d.endpointId; })
            .attr("class","pop");
        
        // Enter SVG Shape Elements
        endpointsEnter.append(function(d) {
                var svgTag = "circle";
                if (d.shape && ["triangle","square","diamond"].indexOf(String(d.shape).toLowerCase().trim()) !== -1) {
                    svgTag = "polygon";
                }
                return document.createElementNS("http://www.w3.org/2000/svg", svgTag);
            })
            .attr("class", function(d) {
                var shape = "circle";
                if (d.shape && ["triangle","square","diamond"].indexOf(String(d.shape).toLowerCase().trim()) !== -1) {
                    shape = String(d.shape).toLowerCase().trim();
                }
                return "popHighlight " + shape;
            })
            .call(function(selection){
                _.forEach(layer.onEndpointEvent(), function(callback, evt){
                    selection.on(evt, function(d){
                        callback({
                            event: d3.event,
                            data:  d
                        });
                    });
                });
            });

        // Default Drawing Radius for Markers
        var ddr = 5;

        // Draw Circular Markers
        endpoints.select(".popHighlight.circle")
            .attr("cx", function (d) {
                return layer.latLngToXy([d.lat, d.lon])[0];
            })
            .attr("cy", function (d) {
                return layer.latLngToXy([d.lat, d.lon])[1];
            })
            .attr("r", ddr+"px");
        
        // endpoints.selectAll('text').remove()

        // endpoints
        //     .append('text')
        //     .html(function(d) {
        //         return d.name
        //     })
        //     .attr("x", function (d) {
        //         let dimension = this.getBoundingClientRect()
        //         return layer.latLngToXy([d.lat, d.lon])[0] - (dimension.width/2);
        //     })
        //     .attr("y", function (d) {
        //         return layer.latLngToXy([d.lat, d.lon])[1] - (ddr*2);
        //     })
        
        // Draw Pointed Shapes
        endpoints.select(".popHighlight.triangle, .popHighlight.square, .popHighlight.diamond")
            .attr("points", function(d) {
                var xy = layer.latLngToXy([d.lat, d.lon]);
                if (d.shape.toLowerCase().trim() === "triangle") {
                    return xy[0]+","+(xy[1]-ddr)+" "+(xy[0]-ddr)+","+(xy[1]+ddr)+" "+(xy[0]+ddr)+","+(xy[1]+ddr);
                } else {
                    return (xy[0]-ddr)+","+(xy[1]-ddr)+" "+(xy[0]+ddr)+","+(xy[1]-ddr)+" "+(xy[0]+ddr)+","+(xy[1]+ddr)+" "+(xy[0]-ddr)+","+(xy[1]+ddr);
                }
            });

        // Rotate Diamonds
        endpoints.select(".popHighlight.diamond")
            .attr("transform", function(d) {
                var xy = layer.latLngToXy([d.lat, d.lon]);
                return "rotate(45 "+xy[0]+" "+xy[1]+")";
            });

        // Enter Node Labels
        var labelLift = 14; // Distance that labels will appear above their node
        // Label Text
        endpointsEnter.filter(function (d) {
                return (d.label && typeof d.label === "string"); // Add to nodes with labels
            })
            .append("rect")
            .attr("class", "nodeLabelBack")
            .attr("x", function (d) {
                return layer.latLngToXy([d.lat, d.lon])[0];
            })
            .attr("y", function (d) {
                return layer.latLngToXy([d.lat, d.lon])[1] - labelLift;
            })
            .attr("width", function (d) {
                return this.parentNode.getBBox().width;
            })
            .attr("height", "18") // Set as a default right now
            .attr("rx", "5")
            .attr("ry", "10")
            .style("fill", "#000")
            .style("fill-opacity", "0.5")
            .style("stroke", "#fff");
        // Label Background
        endpointsEnter.filter(function (d) {
                return (d.label && typeof d.label === "string"); // Add to nodes with labels
            })
            .append("text")
            .attr("x", function (d) {
                return layer.latLngToXy([d.lat, d.lon])[0];
            })
            .attr("y", function (d) {
                return layer.latLngToXy([d.lat, d.lon])[1] - labelLift;
            })
            .attr("class", "nodeLabel")
            .style("fill", "#fff") // Default set to white for now
            .style("font-weight", "300")
            .style("font-size","15px") // Default readable text size for now
            .text(function (d) { return d.label; });

        //--- UPDATE -- Update any existing endpoints
        endpoints.select('.popHighlight')
            .style("fill", function(d){
                return d.endpointColor === undefined ? layer.endpointColor() : d.endpointColor;
            })
        //.style('fill',layer.endpointColor()||d.endpointColor)
            .attr("fill-opacity", function(d){
                return d.endpointOpacity === undefined ? layer.endpointOpacity() : d.endpointOpacity;
            });

        // Update Circles
        endpoints.select(".popHighlight.circle")
            .attr("cx", function (d) {
                return layer.latLngToXy([d.lat, d.lon])[0];
            })
            .attr("cy", function (d) {
                return layer.latLngToXy([d.lat, d.lon])[1];
            })
            .attr("r",function(d) {
                var r = 3;
                if (layer.lineWidth()) {
                    r = layer.lineWidth()+2;
                }
                if (d.scale && !isNaN(d.scale)) {
                    r *= Math.abs(d.scale);
                }
                return r + "px";
            });

        // Update Pointed Shapes
        endpoints.select(".popHighlight.triangle, .popHighlight.square, .popHighlight.diamond")
            .attr("points", function(d) {
                var sdr = 3; // Scaled Drawing Radius
                var xy = layer.latLngToXy([d.lat, d.lon]);
                if (layer.lineWidth() > 1) {
                    sdr = layer.lineWidth()+2;
                }
                if (d.scale && !isNaN(d.scale)) {
                    sdr *= Math.abs(d.scale); // Does not need absolute because it is drawn
                }
                if (d.shape.toLowerCase().trim() === "triangle") {
                    return xy[0]+","+(xy[1]-sdr)+" "+(xy[0]-sdr)+","+(xy[1]+sdr)+" "+(xy[0]+sdr)+","+(xy[1]+sdr);
                } else {
                    return (xy[0]-sdr)+","+(xy[1]-sdr)+" "+(xy[0]+sdr)+","+(xy[1]-sdr)+" "+(xy[0]+sdr)+","+(xy[1]+sdr)+" "+(xy[0]-sdr)+","+(xy[1]+sdr);
                }
            });

        // Rotate Diamonds
        endpoints.select(".popHighlight.diamond")
            .attr("transform", function(d) {
                var xy = layer.latLngToXy([d.lat, d.lon]);
                return "rotate(45 "+xy[0]+" "+xy[1]+")";
            });

        // Update Node Labels
        endpoints.select(".pop .nodeLabel").filter(function (d) {
                return (d.label && typeof d.label === "string"); // Add to nodes with labels
            })
            .attr("x", function (d) {
                return layer.latLngToXy([d.lat, d.lon])[0] - (this.getBBox().width / 2);
            })
            .attr("y", function (d) {
                return layer.latLngToXy([d.lat, d.lon])[1] - labelLift;
            });

        var pad = 8; // Padding for label text
        endpoints.select(".pop .nodeLabelBack").filter(function (d) {
                return (d.label && typeof d.label === "string"); // Add to nodes with labels
            })
            .attr("x", function (d) {
                return layer.latLngToXy([d.lat, d.lon])[0] - ((this.parentNode.lastChild.getBBox().width + pad)  / 2);
            })
            .attr("y", function (d) {
                return layer.latLngToXy([d.lat, d.lon])[1] - labelLift - 16; // -16 centers bckgrd with text
            })
            .attr("width", function (d) {
                return this.parentNode.lastChild.getBBox().width + pad;
            })
            .attr("height", function (d) {
                return this.parentNode.lastChild.getBBox().height + (pad /2);
            });

        //--- EXIT-- remove any endpoint we no longer need
        endpoints.exit().remove();
	
	if(!this.isInitDone()){
	    console.log("Init Complete!");
	    this.isInitDone(true);
	    this.initComplete();
	}

        return true;
    });

    return layer;
};
module.exports = SingleTubeLayer;
