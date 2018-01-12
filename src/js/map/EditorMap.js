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

var L               = require('leaflet');
var d3              = require('d3');
var _               = require('lodash');
var BaseMap          = require('./BaseMap.js');
var EditorLayer     = require('./EditorLayer');
var SingleTubeLayer = require('./SingleTubeLayer');
var ds              = require('../util/DataSource.js');
var Topology        = require('../util/Topology.js');
var EDITOR_MAP_TYPE  = require('../util/Enums.js').MAP_TYPES.EDITOR;

//helper function to help to determine where to inject a control point into a path
//when one is added 
function onLine(a, b, p, tolerance) {
    var dy    = a.y - b.y;
    var dx    = a.x - b.x;
    var slope =  dy/dx ;

    if(dy == 0) { //horizontal line
        if(Math.abs(p.y - a.y) < tolerance) {
            if(a.x > b.x) {
                if(p.x <= a.x && p.x >= b.x){
                    return true;
                }
            }
            else {
                if(p.x >= a.x && p.x <= b.x){
                    return true;
                }
            }
        }
    }
    else if(dx == 0) { //vertical line
        if(Math.abs(p.x -  a.x) < tolerance) {
            if(a.y > b.y) {
                if(p.y <= a.y && p.y >= b.y){
                    return true;
                }
            }
            else {
                if(p.y >= a.y && p.y <= b.y){
                    return true;
                }
            }
        }
    }
    else { //slope line
        //--- y = mx+b
        //--- what b?
        var y_intercept_b = a.y - (slope*a.x);
        var py = (slope * p.x) + y_intercept_b;
        var distance = Math.abs(py-p.y)
        if(distance <= tolerance) {
            if(a.x > b.x) {
                if(p.x <= a.x && p.x >= b.x){
                    return true;
                }
            }
            else {
                if(p.x >= a.x && p.x <= b.x){
                    return true;
                }
            }
        }
    }
    return false;
}

//helper fucntion to instantiate the leaflet map
function Leaflet(params){
    var containerId = params.containerId;
    var width       = params.width;
    var height      = params.height;
    var lat         = params.lat;
    var lng         = params.lng;
    var zoom        = params.zoom || 2;

    var map = L.map(containerId).setView([lat,lng], zoom);

    var mapURL = 'https://carto.bldc.grnoc.iu.edu/globalnoc-simple/{z}/{x}/{y}.png';
    var mapAttribution = '';
    L.tileLayer(mapURL, {
        attribution: mapAttribution,
        maxZoom: 18,
    }).addTo(map);

    /* Initialize the SVG layer */
    map._initPathRoot()
    return map; 
}

/**
 * A tool that allows a map Topology to be edited by rendering a SingleTubeLayer representing the result of the edits that is updated on the fly and 
 * a EditorLayer that draws control lines and points for adjusting the topology.
 * ```
 * var editor = EditorMap({
 *   containerId: 'map',
 *   mapSource: '../networks/network.json'
 *});```
 * @class EditorMap
 * @extends BaseMap
 * @constructor EditorMap
 * @static 
 * @param {Object} params - The configuration object for the editor
 * @param {String} params.containerId - The container id of the map
 * @param {Array|Object|String} params.mapSource - Describes source of topology data, see [DataSource](DataSource.html)'s constructor parameter param.source for details 
 * @param {Object} params.topology - The topology data.
 * @param {Integer} params.lat - The latitude coordinate to instatiate the map at
 * @param {Integer} params.lng - The longitude coordiate to instatiate the map at
 */
var EditorMap = function(params) {
    params.mapType = EDITOR_MAP_TYPE;
    var map = BaseMap(params);
    var lmap;
    var bg;
    var tooltip;
    var topologyCache = [];

    /** 
     * The layer showing the user the end result of the edits 
     * @property {SingleTubeLayer} singleTubeLayer 
     * @private 
     */
    var singleTubeLayer;
    /** 
     * The layer providing the user with editing/control functionality 
     * @property {EditorLayer} editorLayer 
     * @private 
     */
    var editorLayer;
    /** 
     * The [DataSource](DataSource.html) source object representing where to find the topology information 
     * @property {Object} mapSource
     * @private 
     */
    var mapSource = params.mapSource;
    /** 
     * The [Topology](Topology.html) object containing the map information 
     * @property {Object} mapSource
     * @private 
     */
    var topology  = null;

    //--- this method will reset the topology to the last known topology.
    map.undo = function(){
        var topology = map.retrieveTopology();

        if(topology){
            map.topology(topology);
            return true;
        }
        return false;
    };

    //--- this method will handle saving a topolgy to the topology cache
    map.cacheTopology = function(topo){
        var t;
        if(!topo){
            t = _.cloneDeep(map.topology().data());
        }
        else{
            t = _.cloneDeep(topo);
        }

        if(topologyCache.length > 20){
            topologyCache.shift();
        }

        topologyCache.push(t);
    };

    //--- this method will retrieve the last topology cached
    map.retrieveTopology = function(){
        if(topologyCache.length > 1){
            topologyCache.pop();
            var topo = topologyCache.pop();
            map.cacheTopology(topo);
            return topo;
        }
        return;
    };

    //--- this routine handles case where a control point is added or removed
    var cktClick = function(d){
        var topology = _.cloneDeep(map.topology());

        var newLatLng  = lmap.mouseEventToLatLng(d3.event);
        var checkPoint = lmap.mouseEventToLayerPoint(d3.event);

        var path = d.data.path;

        //---- slog through data and figure out which 2 points the click is between and splice
        var lastPoint = lmap.latLngToLayerPoint(new L.LatLng(path[0].lat,path[0].lon));
        for(x=1; x<path.length; x++){
            var point = lmap.latLngToLayerPoint(new L.LatLng(path[x].lat,path[x].lon));
            if(onLine(lastPoint,point,checkPoint,16)){
                //--- sweet found place to splice
                path.splice(x,0,{lat: newLatLng.lat, lon: newLatLng.lng, name: 'Waypoint', adjacencyId: d.data.adjacencyId, waypointId: _.uniqueId('waypoint_')});
                //topology.setPath(adj.adjacencyId, path);
                //--- surely there is a better way but at this point , care I do not
                _.forEach(topology.data().adjacencies, function(adj){
                    if(adj.adjacencyId === d.data.adjacencyId){
                        adj.path = path;
                    }
                });
                break;
            }
            lastPoint = point;
        }
        map.topology(topology);
        map.cacheTopology();
    };

    //--- Remove Waypoint when alt+clicked
    var removeWaypoint = function(d){
        var topology = _.cloneDeep(map.topology());
        var adjacencies = topology.adjacencies({adjacencyIds:[d.data.adjacencyId]});
        var path = adjacencies[0].path;

        for(var i = 0; i < path.length; i++){
            var waypoint = path[i];
            if(waypoint.waypointId === d.data.waypointId){
                if(i != 0 && i != path.length - 1){
                    path.splice(i,1);
                }
            }
        }

        map.topology(topology);
        map.cacheTopology();
        lmap.dragging.enable();
    };

    /**
     * Function to be called whenever the topology is set
     * @method onTopology
     * @param {Topology} topology - The new topology object 
     * @chainable
     * @private
     */
    var onTopology = function(topology, params){
        if (singleTubeLayer && editorLayer) {
            singleTubeLayer.topology(topology);
            editorLayer.topology(topology, params);
            singleTubeLayer.update();
            editorLayer.update();
        }
    };

    /**
     * Getter/Setter of the topology object 
     * @method topology 
     * @param {Topology|Object} topology - Can either be an object represeting the topology or a [Topology](Topology.html) object 
     * @chainable
     * @return {Topology} topology - Returns the Topology Object
     */
    map.topology = function(value, params){
        if(!arguments.length){ return topology; }
        //convert to a Topology Object if it's not one already
        if(value.__factory__ === undefined || value.__factory__ !== 'Topology'){
            topology = Topology(value);
        }else {
            topology = value;
        }
        onTopology.call(map, topology, params);

        return map;
    };

    //define how to convert from lat/lng to xy coordinates
    map.onLatLngToXy(function(latlng){
        var point = lmap.latLngToLayerPoint(new L.LatLng(latlng[0], latlng[1]));
        return [point.x, point.y];
    });

    //noop
    map.onUpdate(function(){
        if(params.onUpdate){
            params.onUpdate();
        }     
    });

    //define what to do when the editor is initialized
    map.onInit(function(){
        //it's important that the leaflet map be created before selecting the bg svg layer
        lmap = Leaflet({
            containerId: map.containerId(),
            width:       map.width(), 
            height:      map.height(),
            lat:         (params.lat || 30),
            lng:         (params.lng || -90)
        });

        //grab our svg element to render the layers into
        var container = d3.select("#"+map.containerId());
        bg = container.select("svg");

        //instatiate the singleTubeLayer
        singleTubeLayer = SingleTubeLayer({
            map: map,
            svg: bg.append("g"),
            lineColor: '#666',
            onLatLngToXy: map.onLatLngToXy()
        });

        //instantiate the editorLayer
        editorLayer = EditorLayer({
            map: map,
            svg: bg.append("g"),
            onLatLngToXy: map.onLatLngToXy()
        })//.onAdjacencyEvent('click', cktClick)
            .onAdjacencyEvent('click', function(d) {
                if ( d3.selectAll('#'+d.data.adjacencyId).classed('selected') ) {
                    cktClick(d);
                } else {
                    // First, unselect all the adjacencies and hide all the control
                    // points
                    d3.selectAll('.adjacency').classed('selected', false);
                    d3.selectAll('.control-point').classed('hidden', true);
                    d3.selectAll('path.path-selected').classed({ 'path-selected': false });
                    // Next, unhide only the endpoints for the adjacencies
                    d3.selectAll('.adjacency').selectAll('.control-point:first-child').classed('hidden', false);
                    d3.selectAll('.adjacency').selectAll('.control-point:last-child').classed('hidden', false);
                    // Then, set the current adjacenty to be selected
                    d3.selectAll('#'+d.data.adjacencyId).classed('selected', true);
                    // Last, show all the control points for the selected adjacency and
                    // highlight the path
                    d3.selectAll('.selected .adjacency-control-points .control-point').classed('hidden', false);
                    d3.selectAll('.selected path.editorHighlight').classed({ 'path-selected': true });
                    d3.selectAll('.selected path.editorShadow').classed({ 'path-selected': true });
                }
            })
            .onPopEvent('mouseenter',function(d){
                lmap.dragging.disable();
            })
            .onPopEvent('mouseout' ,function(d){
                lmap.dragging.enable();
            })
            .onPopEvent('click', function(d){
                if(d.event.altKey){
                    removeWaypoint(d);
                }
            })
            .onXyToLatLng(function(xy){
                var latlng = lmap.layerPointToLatLng(L.point(xy[0], xy[1]));
                return [latlng.lat, latlng.lng];
            })
            .onEdit(function(){
                map.topology(editorLayer.topology());
            })
            .onEditEnd(function(){
                map.cacheTopology();
            });
        
        //--- tie d3 update to view change events in leaflet
        lmap.on("viewreset",function(d){
            singleTubeLayer.update();
            editorLayer.update();
        }); 
    });

    //if we already have the topology intialize the map and set the topology
    if (params.topology) {
        map.init();
        map.topology(params.topology);
        map.cacheTopology();
    }
    //if we just have a mapSource, fetch the topology first then initialize and set the topology
    else if (mapSource) {
        ds({
            source: mapSource,
            onSuccess: function(params){
                map.init();
                map.topology(params.data.results[0]);
                map.cacheTopology();
            }
        });
    }
    else {
        console.error("Could not get topology data. No mapsource and no topology data passed in.");
    }

    return map;
};

module.exports = EditorMap;
