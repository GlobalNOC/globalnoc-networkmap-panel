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

var topojson  = require('topojson');
var d3        = require('d3');
var WORLD_50m = require('../../geo_data/world-50m.json');
var US        = require('../../geo_data/us.json');
var US2       = require('../../geo_data/us2.json');
require('d3-geo-projection')(d3); //externd d3 with extra geo projections

var MapData = {
    us: US,
    us2: US2,
    world_50m: WORLD_50m
};

/**
 * An object containing various functions that will generate a map background
* ```
* var bg = MapBackgrounds['us']({
    containerId: 'map',
    scale: 220,
    width: 800,
    height: 250,
    lat: 40,
    lng: -80
* });
* ```
* @class MapBackgrounds
* @static 
*/
var MapBackgrounds = {
    /**
     * An function that will create a us map background
    * @method us
    * @param {Object} params - The configuration object for the us map background
    * @param {String} params.containerId - The container id the map background should be rendered into 
    * @param {Number} params.scale - An integer representing the scale of the map
    * @param {Number} params.width - An integer representing the pixel width of the background
    * @param {Number} params.height - An interger representing the pixel height of the background
    * @return {Object} map - A map object containing the map projection
    */
    us: function(params){
        var divID  = params.containerId;
        var scale  = params.scale;
        var width  = params.width;
        var height = params.height;

        //--- get background map going
        var projection = d3.geo.albersUsa()
            .scale(scale)
            .translate([width / 2, height / 2]);

        var path = d3.geo.path()
            .projection(projection);

        var svg = params.svg;

        //--- background Group
        var g = svg.append("g");

        var world = MapData.us;
        g.insert("path")
            .datum(topojson.feature(world, world.objects.land))
            .attr("class", "land")
            .attr("d", path);

        g.insert("path")
            .datum(topojson.mesh(world, world.objects.states, function(a, b) { return a !== b; }))
            .attr("class", "bounds1")
            .attr("d", path);

        g.insert("path")
            .datum(topojson.mesh(world, world.objects.counties, function(a, b) { return a !== b; }))
            .attr("class", "bounds2")
            .attr("d", path);

        var map = {}; 

        map.projection = function(){return projection;}
        map.width      = function(){return width;}
        map.height     = function(){return height;}
        map.divID      = function(){return divID;}
        map.svg        = function(){return svg;};

        return map;
    },
    /**
     * An function that will create a us map background
     * @method us2
     * @param {Object} params - The configuration object for the us map background
     * @param {String} params.containerId - The container id the map background should be rendered into
     * @param {Number} params.scale - An integer representing the scale of the map
     * @param {Number} params.width - An integer representing the pixel width of the background
     * @param {Number} params.height - An interger representing the pixel height of the background
     * @return {Object} map - A map object containing the map projection
     */
    us2: function(params){
        var divID  = params.containerId;
        var scale  = params.scale;
        var width  = params.width;
        var height = params.height;
        var lat    = params.lat;
        var lng    = params.lng;

        //--- get background map going
        var projection = d3.geo.albers()
	.scale(scale)
	.translate([width / 2, height / 2])
        .precision(0.1)
        .center([0,lat])
        .rotate([1-lng,0,0]);

        var path = d3.geo.path()
	.projection(projection);

        var svg = params.svg;

        //--- background Group
        var g = svg.append("g");

        var world = MapData.us2;
        g.insert("path")
	.datum(topojson.feature(world, world.objects.counties))
	.attr("class", "land")
	.attr("d", path);

        g.insert("path")
	.datum(topojson.mesh(world, world.objects.states, function(a, b) { return a !== b; }))
	.attr("class", "bounds1")
	.attr("d", path);

        g.insert("path")
	.datum(topojson.mesh(world, world.objects.counties, function(a, b) { return a !== b; }))
	.attr("class", "bounds2")
	.attr("d", path);

        var map = {};

        map.projection = function(){return projection;}
        map.width      = function(){return width;}
        map.height     = function(){return height;}
        map.divID      = function(){return divID;}
        map.svg        = function(){return svg;};

        return map;
    },
    /**
    * Creates a world background 
    * @method world
    * @param {Object} params - The configuration object for the us map background
    * @param {String} params.containerId - The container id the map background should be rendered into 
    * @param {Number} params.scale - An integer representing the scale of the map
    * @param {Number} params.width - An integer representing the pixel width of the background
    * @param {Number} params.height - An interger representing the pixel height of the background
    * @param {Number} params.lat - An interger representing what latitude coordinate to center the map background at
    * @param {Number} params.lng - An interger representing what longitude coordinate to center the map background at
    * @return {Object} map - A map object containing the map projection
    */
    world: function(params){
        var divID  = params.containerId;
        var scale  = params.scale;
        var width  = params.width;
        var height = params.height;
        var lat    = params.lat;
        var lng    = params.lng;

        var projection = d3.geo.naturalEarth()
        .scale(scale)
        .translate([width / 2, height / 2])
        .precision(0.1)
        .center([0,lat])
        .rotate([1-lng,0,0]); 

        var path = d3.geo.path()
        .projection(projection);

        var svg = params.svg;

        //--- background Group
        var g = svg.append("g");

        var world = MapData.world_50m;
        g.insert("path")
            .datum(topojson.feature(world, world.objects.land))
            .attr("class", "land")
            .attr("d", path);

        g.insert("path")
            .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
            .attr("class", "bounds1")
            .attr("d", path);

        var map = {}; 

        map.projection = function(){return projection;}
        map.width      = function(){return width;}
        map.height     = function(){return height;}
        map.divID      = function(){return divID;}
        map.svg        = function(){return svg;};


        return map;
    },
    /**
    * Returns an unprojected world background 
    * @method worldUnprojected
    * @param {Object} params - The configuration object for the us map background
    * @param {String} params.containerId - The container id the map background should be rendered into 
    * @param {Number} params.scale - An integer representing the scale of the map
    * @param {Number} params.width - An integer representing the pixel width of the background
    * @param {Number} params.height - An interger representing the pixel height of the background
    * @param {Number} params.lng - An interger representing what longitude coordinate to center the map background at
    * @return {Object} map - A map object containing the map projection
    */
    worldUnprojected: function(params){
        var divID  = params.containerId;
        var scale  = params.scale;
        var width  = params.width;
        var height = params.height;
        var lng    = params.lng;

        var projection = d3.geo.equirectangular()
            .scale(scale)
            .translate([width / 2, height / 2])
            .precision(0.1)
            .rotate([1-lng,0,0]);

        var path = d3.geo.path()
            .projection(projection);


        var svg = params.svg;
        //--- background Group
        var g = svg.append("g");

        var world = MapData.world_50m;
        g.insert("path")
            .datum(topojson.feature(world, world.objects.land))
            .attr("class", "land")
            .attr("d", path);

        g.insert("path")
            .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
            .attr("class", "bounds1")
            .attr("d", path);

        var map = {}; 

        map.projection = function(){return projection;}
        map.width      = function(){return width;}
        map.height     = function(){return height;}
        map.divID      = function(){return divID;}
        map.svg        = function(){return svg;};


        return map;
    }
};
module.exports = MapBackgrounds;
