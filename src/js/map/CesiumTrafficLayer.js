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
var _                   = require('lodash');
var ds                  = require('../util/DataSource.js');
var SingleTubeLayer     = require('./SingleTubeLayer');
var NetworkLayer        = require('./NetworkLayer');
var Geometry            = require('../util/Geometry.js');

/**
* Modifies the SingleTubeLayer providing additional styling, pulling data on an interval, and coloring adjacencies 
* accordingly.
```
var layer = CesiumTrafficLayer({
    svg: bg,
    active: layer.active,
    name: layer.name,
    onLatLngToXy: map.onLatLngToXy(),
    onAdjacencyEvent: layer.onAdjacencyEvent,
    onPopEvent: layer.onPopEvent
}).lineWidth(map.lineWidth())
    .map2dataSource(layer.map2dataSource)
    .loadMap(layer.mapSource);
```
* @class CesiumTrafficLayer
* @extends NetworkLayer
* @constructor CesiumTrafficLayer
* @static
* @property {Object} params - The parameter object for the Layer
* @param {d3.selection(svg):Required} params.svg - A d3 selection of the svg element to render the editor layer into
* @param {Integer} params.dataIntervalSeconds - The amount of seconds to pull the data interval on
*/
var CesiumTrafficLayer = function(params){
    var maxAltitude      = 10000;
    var numSegments      = 90;
    var vertOffset       = 100;
    var popRadius        = 5000;
    var popHeight        = 100;
    var lineColor        = params.lineColor || '#262F36';
    var preRenderEventListener;

    var layer = NetworkLayer(params);

    if(!params.svg){
        console.error('Must pass in an svg element to render into');
        return;
    }
    if(!params.cesiumViewer){
        console.error('Must pass in an cesiumViewer element to render into');
        return;
    }

    // a internal variable mapping an adjacency id to all the cesium entity segments that make up the adjacency
    var adjacencyEntityIds = {};
    // a hash that maps from a cesium entity id to a adjacency
    var entityId2adjacency = {};

    var svg = params.svg;

    /** 
     * The CesiumViewer Object passed in from the CesiumMap
     * @property {Cesium.Viewer} cesiumViewer 
     * @private 
     */
    var cesiumViewer = params.cesiumViewer;

    //define what to do when a topology is set
    layer.onTopology(function(topology){
        //draw layer
        layer.update();
        //start interval
        layer.setDataInterval();
        
        return layer;
    });

    // adjust arrow scale when the lineWidth is adjusted 
    layer.onLineWidth(function(lineWidth){
        //noop for now
    });

    /**
     * Returns the d3 svg selection
     * @method svg
     * @return {d3.selection(svg)} params.svg - A d3 selection of the svg element
     */
    layer.svg = function(value){
        return svg;
    };

    // determines the altitude given the positiion
    // the altitude of the path should rise as the initial point 
    // approaches the midpoint and fall from the midpoint to the endpoint
    function _getAlt(params){
        var pos         = params.pos;
        var numSegments = params.numSegments;
        var pathlen     = params.pathlen;

        var alt = pathlen;   //-- peak alt should be 1/N ckt distance
        if(alt > maxAltitude){
            alt = maxAltitude;
        }

        var foo = numSegments/2;
        var c   = -(alt) / (foo*foo);
        var idx = pos - foo;
        var z   = (c * idx * idx);
        var result = (alt+z)*5000;
        return result;
    }

    // helper function to determine the shape of the polyLineVolume 
    // this function creates basically an offset and rotated C shape that creates 1/2 of the twin tube
    function _shape(params) {
        var radius   = params.radius;
        var offset   = params.offset;
        var rotation = params.rotation;

        rotation+=90;
        var positions = [];
        //---- the basic "C" shape
        for (var i = -45; i <= 225; i+=45) {
            var radians = Cesium.Math.toRadians(i+rotation);
            positions.push(new Cesium.Cartesian2((radius * Math.cos(radians))+offset, radius * Math.sin(radians)));
        }
        //--- hack that lets us ensure we can use a x offset and get the 2 tubes side by side
        positions.push(new Cesium.Cartesian2(0+offset,0));
        radians = Cesium.Math.toRadians(270+rotation);
        positions.push(new Cesium.Cartesian2((radius * Math.cos(radians))-offset, radius * Math.sin(radians)));
        positions.push(new Cesium.Cartesian2(0+offset,0));
        return positions;
    }

    //add an adjacency to cesium as a group of polyLineVolume segements
    function _addAdjacency(params){
        var adjacency = params.adjacency;
        var points    = params.points;
        var pathlen   = params.pathlen;

        var width=1;
        var X=points[0];
        var Y=points[1];
        var Z=points[2];
        var idx = 0;

        //delete any entity 2 adjacency info mappings for this adjacency
        _.forEach(entityId2adjacency, function(adj, entityId){
            if(adj.adjacencyId === adjacency.adjacencyId){
                entityId2adjacency[entityId] = undefined; 
            }
        });

        //initialize our id arrays for this adjacency
        adjacencyEntityIds[adjacency.adjacencyId] = {
            azIds: [],
            zaIds: []    
        };

        for(var x=3; x<points.length; x = x+3 ){
            var newX = points[x+0];
            var newY = points[x+1];
            var newZ = points[x+2];

            //make the width a function of the altitude
            width = _getAlt({
                pos: x, 
                numSegments: points.length, 
                pathlen: pathlen
            });
            if( width > 500000 ){
                width=500000;
            }
            var adjWidth = 5+(width/10);
            var pos = Cesium.Cartesian3.fromDegreesArrayHeights([X,Y,Z-adjWidth,newX,newY,newZ-adjWidth]);

            //add az line segement
            var azId = adjacency.adjacencyId+'_az_'+idx;
            adjacencyEntityIds[adjacency.adjacencyId].azIds.push(azId);

            cesiumViewer.entities.add({
                id: azId,
                description: adjacency.name,
                polylineVolume: {
                    positions: pos ,
                    shape: _shape({
                        radius: adjWidth,
                        offset: -adjWidth*.7,
                        rotation: 0
                    }),
                    material : Cesium.Color.GRAY,
                }
            });

            //add za line segement
            var zaId = adjacency.adjacencyId+'_za_'+idx;
            adjacencyEntityIds[adjacency.adjacencyId].zaIds.push(zaId);
            cesiumViewer.entities.add({
                id: zaId,
                description: adjacency.name,
                polylineVolume: {
                    positions: pos,
                    shape: _shape({
                        radius: adjWidth,
                        offset: adjWidth*.7,
                        rotation: 180
                    }),
                    material : Cesium.Color.GRAY,
                }
            });
           
            //create a map from the entity ids to the adjacency information for use in the event
            //handlers 
            entityId2adjacency[azId] = adjacency;
            entityId2adjacency[zaId] = adjacency;
            
            X = newX;
            Y = newY;
            Z = newZ;
            idx++;
        }
    }


    // computes the points along a path based on the minimap, besier curves adding height
    function _samplePath(params){
        var adj  = params.adjacency;

        var line = d3.svg.line()
        //--- there seems to be a bug that only affects ffox when using basis interpolation
        //--- and only in some cases where we perform getPointatLength?
        .interpolate("bundle")
            .x(function(d){
                return layer.latLngToXy([d.lat,d.lon])[0];
            })
            .y(function(d){
                return layer.latLngToXy([d.lat,d.lon])[1];
            });

        var pts = [];
        //--- render the circuits path using d3 to get curved lines
        var adjPath = svg.append("path")
            .attr("d",line(adj.path))
            .attr("class","circuit");

        var path = adjPath[0][0];
        var pathlen = path.getTotalLength();

        //----- take samples along path and inverse project
        for(var x=0; x <= numSegments; x++){
            var percentage = 0;
            if(x > 0){
                percentage = x / (numSegments * 1.0);
            }
            var length = pathlen * percentage;
            var point = path.getPointAtLength(length);
            //var pt = projection.invert([point.x,point.y]);
            var pt = layer.xyToLatLng([point.x,point.y]);

            var lat = pt[0];
            var lon = pt[1];
            var alt = vertOffset + _getAlt({
                pos: x, 
                numSegments: numSegments, 
                pathlen: pathlen
            });
            pts.push(lat);
            pts.push(lon);
            pts.push(alt);
        }

        //-- remove path to keep things from getting clutterd
        //-- might be good to disable for debugging
        adjPath.remove();

        return {
            points: pts,
            pathlen: pathlen
        };
    }

    //helper function to determine a d3 like join with enter, update, and exit properties
    function _getAdjacencyJoin() { 
        var enter  = [];
        var exit   = [];
        var update = [];


        //determine which adjacencies to add and update 
        _.forEach(layer.topology().data().adjacencies, function(adj){
            //if we don't already have cesium entites for this adjacency
            //add it to the enter array
            if(adjacencyEntityIds[adj.adjacencyId] === undefined){
                enter.push(adj);
            }
            //add it to the update array
            update.push(adj);
        });

        // determine which adjacencies to remove
        var topoAdjIds   = _.map(layer.topology().data().adjacencies, function(adj){
            return adj.adjacencyId;
        });
        var entityAdjIds = _.keys(adjacencyEntityIds);
        exit = _.difference(entityAdjIds, topoAdjIds);

        return {
            enter: enter,
            exit: exit,
            update: update
        };
    };

    //helper function to determine a d3 like join with enter, update, and exit properties
    function _getPopJoin() { 
        var enter  = [];
        var exit   = [];
        var update = [];


        //determine which pops to add and update 
        var entityPopIds = [];
        _.forEach(layer.topology().data().pops, function(pop){
            //if we don't already have cesium entites for this pop
            //add it to the enter array
            if(!cesiumViewer.entities.getById(pop.popId)){
                enter.push(pop);
            } else {
                entityPopIds.push(pop.popId);
            }
            //add it to the update array
            update.push(pop);
        });

        // determine which pops to remove
        var topoPopIds   = _.map(layer.topology().data().pops, function(pop){
            return pop.popId;
        });
        exit = _.difference(entityPopIds, topoPopIds);

        return {
            enter: enter,
            exit: exit,
            update: update
        };
    };

    //define how to get the DOM bounding box for an adjacency
    layer.onAdjacencyBoundingClientRect(function(params){
        var adj = params.adjacency;
        var adjEntityIds = adjacencyEntityIds[adj.adjacencyId];

        var xy = [];
        
        var entityIds = adjEntityIds.azIds.concat(adjEntityIds.zaIds);
        _.forEach(entityIds, function(id){
            var entity      = cesiumViewer.entities.getById(id);
            _.forEach(entity.polylineVolume.positions.getValue(), function(position){
                var point = Cesium.SceneTransforms.wgs84ToWindowCoordinates(
                    cesiumViewer.scene,
                    position
                )
                xy.push([point.x, point.y]);
            });
        });

        var bb = Geometry.getBoundingBox({ xy: xy });

        //make the bounding box absolute, not relative to the div
        bb = layer.subtractContainerBoundingClientRect({ bb: bb});

        return bb;
    });

    // define how to update the layer
    layer.onUpdate(function(){
        if(!layer.topology()){ return; }

        adjJoin = _getAdjacencyJoin();
        popJoin = _getPopJoin();

        //suspend updates to cesium unitl the entire layer is updated
        cesiumViewer.entities.suspendEvents();

        // ENTER

        //add adjacencies
        _.forEach(adjJoin.enter, function(adj){
            //--- for each adjacency in the map, figure out a set of points along the curved path
            var pathObj = _samplePath({
                adjacency: adj
            });

            console.debug(adj.name+" numseg: "+numSegments+" points: "+pathObj.points.length);
            console.debug(pathObj.points);

            _addAdjacency({ 
                adjacency: adj,
                points: pathObj.points,
                pathlen: pathObj.pathlen
            });
       });

        //add pops
        _.forEach(popJoin.enter, function(pop){
            cesiumViewer.entities.add({
                id: pop.popId,
                position: Cesium.Cartesian3.fromDegrees(pop.lon, pop.lat),
                description: pop.name,
                ellipse: {
                    semiMinorAxis : popRadius,
                    semiMajorAxis : popRadius,
                    extrudedHeight: popHeight,
                    material: Cesium.Color.fromCssColorString('#F7F0E0'),
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString('#424242') 
                }
            });
        });

        // #todo EXIT

        // UPDATE
        // update adjacencies 
        _.forEach(adjJoin.update, function(adj){
            var adjEntityIds = adjacencyEntityIds[adj.adjacencyId];

            // update the AZ segements
            _.forEach(adjEntityIds.azIds, function(id){
                var entity = cesiumViewer.entities.getById(id);
                var lineColor = adj.azLineColor || layer.lineColor();
                entity.polylineVolume.material = Cesium.Color.fromCssColorString(lineColor);
            });
            
            // update the ZA segements
            _.forEach(adjEntityIds.zaIds, function(id){
                var entity = cesiumViewer.entities.getById(id);
                var lineColor = adj.zaLineColor || layer.lineColor();
                entity.polylineVolume.material = Cesium.Color.fromCssColorString(lineColor);
            });
        });
          
        //now resumeEvents updates 
        cesiumViewer.entities.resumeEvents();

        return map;
    });

    // define how to toggle the layer
    layer.onToggle(function(active){
        if(!layer.topology()){ return; }

        //suspend updates to cesium unitl the entire layer is updated
        cesiumViewer.entities.suspendEvents();

        //toggle adjacencies
        _.forEach(adjacencyEntityIds, function(adjEntityIds){
            // update the AZ segements
            _.forEach(adjEntityIds.azIds, function(id){
                var entity = cesiumViewer.entities.getById(id);
                entity.show = (active) ? true : false;
            });

            // update the ZA segements
            _.forEach(adjEntityIds.zaIds, function(id){
                var entity = cesiumViewer.entities.getById(id);
                entity.show = (active) ? true : false;
            });
        });

        //toggle pops
        _.forEach(layer.topology().data().pops, function(pop){
            var entity  = cesiumViewer.entities.getById(pop.popId);
            if(!entity){ return true; }
            entity.show = (active) ? true : false;
        });
        
        //now resumeEvents updates 
        cesiumViewer.entities.resumeEvents();
    });

    //define how to remove the layer components
    layer.onRemove(function(){
        if(!layer.topology()){ return; }

        //remove our perRenderEventListener
        if(preRenderEventListener) { 
            cesiumViewer.scene.preRender.removeEventListener(preRenderEventListener);
        }

        //suspend updates to cesium unitl the entire layer is updated
        cesiumViewer.entities.suspendEvents();

        // remove adjacencies
        _.forEach(adjacencyEntityIds, function(adjEntityIds){
            // update the AZ segements
            _.forEach(adjEntityIds.azIds, function(id){
                var entity = cesiumViewer.entities.getById(id);
                cesiumViewer.entities.remove(entity);
                //there's no destroy so just set to undefined
                entity = undefined;
            });

            // update the ZA segements
            _.forEach(adjEntityIds.zaIds, function(id){
                var entity = cesiumViewer.entities.getById(id);
                cesiumViewer.entities.remove(entity);
                //there's no destroy so just set to undefined
                entity = undefined;
            });
        });
        
        //remove pops
        _.forEach(layer.topology().data().pops, function(pop){
            var entity  = cesiumViewer.entities.getById(pop.popId);
            if(!entity){ return true; }
            cesiumViewer.entities.remove(entity);
            //there's no destroy so just set to undefined
            entity = undefined;
        });

        adjacencyEntityIds = {};

        //now resumeEvents updates
        cesiumViewer.entities.resumeEvents();
    });

    layer.onInit(function(){
        var event_id = 0;

        //helper method for handling adjacency mouseover event
        function _adjMouseOver(adj){
            adj.mouseover = true;
            if(layer.onAdjacencyEvent().mouseover){
                layer.onAdjacencyEvent().mouseover({
                    data: adj
                });
            }
        }
        
        //helper method for handling adjacency mouseout event
        function _adjMouseOut(adj){
            adj.mouseover = false;
            if(layer.onAdjacencyEvent().mouseout){
                layer.onAdjacencyEvent().mouseout({
                    data: adj
                });
            }
        }
        
        //helper method for handling adjacency click events
        function _adjLeftClick(adj){
            if(layer.onAdjacencyEvent().click){
                layer.onAdjacencyEvent().click({
                    data: adj
                });
            }
        }

        //helper method for handling pop mouseover event
        function _popMouseOver(pop){
            pop.mouseover = true;
            if(layer.onPopEvent().mouseover){
                layer.onPopEvent().mouseover({
                    data: pop
                });
            }
        }

        //helper method for handling pop mouseout event
        function _popMouseOut(pop){
            pop.mouseover = false;
            if(layer.onPopEvent().mouseout){
                layer.onPopEvent().mouseout({
                    data: pop
                });
            }
        }

        //helper method for handling pop click events
        function _popLeftClick(pop){
            if(layer.onPopEvent().click){
                layer.onPopEvent().click({
                    data: pop
                });
            }
        }

        // set up mouseover and mouseout handlers for topology elements 
        var mouseOverHandler = new Cesium.ScreenSpaceEventHandler(cesiumViewer.scene.canvas);
        mouseOverHandler.setInputAction(function(movement) {
            if(!layer.active()){ return; }
            if(!layer.topology()){ return; }
            //first try to grab an object at the endPosition
            var pickedObject = cesiumViewer.scene.pick(movement.endPosition);
            //next try to grab an object at the startPosition if one wasn't defined at the end position
            if (!Cesium.defined(pickedObject)) {
                pickedObject = cesiumViewer.scene.pick(movement.startPosition);
            }

            //return early we're not on an object
            if (Cesium.defined(pickedObject)) {
                if(layer.onAdjacencyEvent().mouseover || layer.onAdjacencyEvent().mouseout){
                    //found adjacency
                    if(entityId2adjacency[pickedObject.id.id]){
                        var adj = entityId2adjacency[pickedObject.id.id]; 
                        //don't fire event if we've already moused over it
                        if(!adj.mouseover){
                            _adjMouseOver(adj);
                        }
                    }
                    var pop = layer.topology().pops({ popIds: [pickedObject.id.id]})[0];
                    if(pop){
                        //don't fire event if we've already moused over it
                        if(!pop.mouseover){
                            _popMouseOver(pop);
                        }
                    }
                } 
            }else {
                //trigger mouseout callbacks for any adjacencies we didn't mouse over this iteration that have 
                //there mouseover flag set
                _.forEach(layer.topology().data().adjacencies, function(adj){
                    //continue to next adjacency if this adjacency hasn't been hovered over
                    if(!adj.mouseover){ return true; }
                    _adjMouseOut(adj);
                });
                //do the same for pops
                _.forEach(layer.topology().data().pops, function(pop){
                    //continue to next adjacency if this adjacency hasn't been hovered over
                    if(!pop.mouseover){ return true; }
                    _popMouseOut(pop);
                });
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        //set up click handler for topology elements
        var leftClickHandler = new Cesium.ScreenSpaceEventHandler(cesiumViewer.scene.canvas);
        leftClickHandler.setInputAction((function(entityId2adjacency, action) {
            if(!layer.active()){ return; }
            if(!layer.topology()){ return; }
            //document.getElementsByClassName('cesium-infoBox')[0].style.visibility = "hidden";
            var pickedObject = cesiumViewer.scene.pick(action.position);
            //don't do anything if we didn't click on an object
            if (!Cesium.defined(pickedObject)) {
                //deselect everything and redraw!
                layer.map().deselectAll();
                layer.map().infoDiv().hide({
                    pin: false
                });
                layer.map().update();
                return;
            }
            //hack to prevent tile layers from showing an infoBox that never loads any data
            document.getElementsByClassName('cesium-infoBox')[0].style.visibility = "visible";
            //reset visibility of selection target 
            cesiumViewer.selectionIndicator.viewModel.selectionIndicatorElement.style.visibility = 'visible';

            //don't do anything if the object is not an adjacency and not a pop
            var pop = layer.topology().pops({ popIds: [pickedObject.id.id]})[0];
            if(!entityId2adjacency[pickedObject.id.id] && !pop){ return; }
            //disable default click handling

            //check if we clicked an adjacency and fire the event handler
            var adj = entityId2adjacency[pickedObject.id.id];
            if(adj){
                _adjLeftClick(adj);
            }
            //check if we clicked a pop and fire the event handler
            if(pop){
                _popLeftClick(pop);
            }

            //if this is an entity we control don't show the selection target and don't show the infoBox
            cesiumViewer.selectionIndicator.viewModel.selectionIndicatorElement.style.visibility = 'hidden';
            document.getElementsByClassName('cesium-infoBox')[0].style.visibility = "hidden";
        }).bind(null, entityId2adjacency), Cesium.ScreenSpaceEventType.LEFT_CLICK);


        //make the pop radius a function of the camera height      
        /*
        preRenderEventListener = cesiumViewer.scene.preRender.addEventListener(function(){
            if(!layer.active()){ return; }
            if(!layer.topology()){ return; }
            var height = cesiumViewer.scene.camera.positionCartographic.height;

            var newPopRadius;
            // fix the radius at 40,000 when the camera height is gte 2,000,000 meters
            if(height >= 2000000){
                newPopRadius = 10000;
            }
            // fix the radius at 800 when the camera height is lte 40,000 meters
            else if(height <= 40000){
                newPopRadius = 800; 
            }
            // otherwise make adjust the pop radius be a fucntion of the height
            else {
                newPopRadius = (height / 50) % 10000;
            }

            //if the pop radius is different from it's previous setting adjust all the pops
            if(popRadius !== newPopRadius){
                popRadius = newPopRadius;

                //suspend events until we're done making our changes
                cesiumViewer.entities.suspendEvents();
        
                _.forEach(layer.topology().data().pops, function(pop){
                    var entity = cesiumViewer.entities.getById(pop.popId);
                    if(!entity){ return true; }
                    entity.ellipse.semiMinorAxis = newPopRadius;
                    entity.ellipse.semiMajorAxis = newPopRadius;
                });

                //now resumeEvents updates 
                cesiumViewer.entities.resumeEvents();
            }
        });*/

    });    

    //initialize the layer
    layer.init();

    return layer; 
};
module.exports = CesiumTrafficLayer;
