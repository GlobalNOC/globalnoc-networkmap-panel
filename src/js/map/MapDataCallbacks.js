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

var _           = require('lodash');
var d3          = require('d3');
var ARROW       = require('../util/Enums.js').ARROW;
var Color       = require('../util/Color.js');


//Helper function that takes a topology and an object keyed on node_name and interface name whose value is 
//an object containing metric counters. The method uses this information to determine line color
function applyData2Adjs(params){
    var layer         = params.layer; 
    var topology      = layer.topology();
    var nodeIntf2data = params.nodeIntf2data;
    var parentMap     = layer.map();
    var colorScheme   = (parentMap) ? parentMap.colorScheme() : null;
    if(!colorScheme){ colorScheme = Color.getDefaultScheme(); }
    // get the default maxBps from the layer or default to 100Gbps
    var layer_max_bps = layer.maxBps() || 1e11;

    _.forEach(topology.data().links, function(adj){
        //loop through each point of interest fetching and summing the data for it
        var input_bps  = null;
        var output_bps = null;
        var adj_max_bps = adj.maxBps || layer_max_bps;
        _.forEach(adj.poi, function(poi) {
            if( nodeIntf2data[poi.node_name] === undefined ||
                nodeIntf2data[poi.node_name][poi.interface_name] === undefined ){
                console.warn("Was not able to fetch data for adjacency, "+adj.name+"'s point of interest on "+poi.node_name+", "+poi.interface_name); 
                //continue loop
                return true;
            }
            var poi_data = nodeIntf2data[poi.node_name][poi.interface_name];
            poi.input_bps    = parseFloat((poi.is_a) ? poi_data.bps.input  : poi_data.bps.output);
            poi.output_bps   = parseFloat((poi.is_a) ? poi_data.bps.output : poi_data.bps.input);
            //poi.azLoadColor  = colorScheme.getColor((poi.input_bps  / max_bps) * 100);
            poi.azLoadColor  = colorScheme.getColor((poi.input_bps  / adj_max_bps) * 100);
            //poi.zaLoadColor  = colorScheme.getColor((poi.output_bps / max_bps) * 100);
            poi.zaLoadColor  = colorScheme.getColor((poi.output_bps / adj_max_bps) * 100);
            
            input_bps  += poi.input_bps;
            output_bps += poi.output_bps; 
        });
        
        //add special logic for removing color from links when there's no data 
        if((input_bps === null && output_bps === null) || (isNaN(input_bps) && isNaN(output_bps))){
            console.warn('Did not receive any data for adjacency, '+adj.name+', skipping coloring');
            //continue to next adjacency
            return true;
        }

        //store the input_bps and output_bps on the adjacency
        adj.input_bps  = input_bps;
        adj.output_bps = output_bps;
        
        //set direction of arrow, assume A end is always point of observation
        //also determine which point A or Z to show for load
        adj.arrow = ARROW.AZ;
        var single_tube_bps = adj.input_bps;
        if(adj.output_bps > adj.input_bps){
            adj.arrow    = ARROW.ZA;
            single_tube_bps = adj.output_bps;
        }

        //determine the percent load
        var single_tube_load = (single_tube_bps / adj_max_bps) * 100;
        var az_load          = (adj.input_bps   / adj_max_bps) * 100;
        var za_load          = (adj.output_bps  / adj_max_bps) * 100;

        //add some debug logging 
        if(adj.arrow === ARROW.AZ){
            console.debug("Adjacency "+adj.name+" is going towards A endpoint with load "+single_tube_load+"% from "+single_tube_bps+"/"+adj_max_bps);
        }else {
            console.debug("Adjacency "+adj.name+" is going away from A endpoint with load "+single_tube_load+"% from "+single_tube_bps+"/"+adj_max_bps);
        }

        adj.lineColor   = colorScheme.getColor(single_tube_load);
        adj.azLineColor = colorScheme.getColor(az_load);
        adj.zaLineColor = colorScheme.getColor(za_load);
        
        adj.azLoad     = az_load;
        adj.zaLoad     = za_load;
    });
}

/**
* If a map2dataSource parameter is used to generate map data on a layer, the MapDataCallback
* corresponding to the map2dataSource.type will be executed when the source successfully returns
* ```
* //given the map topology and data returned, execute the callback to color 
* //the ajacencies as specificied in the atlasUsage callback
* MapDataCallbacks.atlasUsage({
*   topology: topology,
*   data: data
* });
* ```
* @class MapDataCallbacks
* @static 
*/
var MapDataCallbacks = {
    /**
    * A helper function to determine which callback to use
    * @method getCallback
    * @param {Object} params - The configuration object for the us map background
    * @param {Object} params.layer - The map layer configuration 
    * @return {function} callback - A callback funciton that colors topology components based on the returned data and topology 
    */
    getCallback: function(params){
        var callback;

        //try to determine callback based on layer info
        if(params.layer){
            var layer = params.layer
            //try to determine callback based on layer.map2dataSource info
            if(layer.map2dataSource){
                callback = MapDataCallbacks[layer.map2dataSource.type];
            }
        }

        if(!callback){
            console.error("Could not determine callback to use");
            return;
        }

        return callback;
    },
    /**
    * Takes data returned from [DataSourceFormatter.atlasUsage](DataSourceFormatter.html#methods_atlasUsage), and maps the results back to an adjacency, and colors the 
    * adjacency accordingly
    * @method atlasUsage
    * @param {Object} params - The parameters needed to determine color based on atlas usage data
    * @param {Array} params.data - An array of object containing the utilization statistics 
    * @param {Object} params.topology - An object containing the network topology data 
    */
    atlasUsage: function(params){
        var data     = params.data;
        var layer    = params.layer;

        //create a map from node/intf pairs to their data
        var nodeIntf2data = {};
        var results  = data.evaluate('/opt/if-stat', data, null, XPathResult.ANY_TYPE, null);
        var result   = results.iterateNext();
        while(result){
            var node = result.getAttribute('node_name');
            var intf = result.getAttribute('name');
            
            var bps  = result.getElementsByTagName('bps')[0];
            if(nodeIntf2data[node] === undefined){
                nodeIntf2data[node] = {};
            }
            nodeIntf2data[node][intf] = {
                bps: { 
                    input:  bps.getAttribute('i'),
                    output: bps.getAttribute('o')
                }
            };

            result = results.iterateNext();
        }
        //now set the color 
        applyData2Adjs({
            layer: layer,
            nodeIntf2data: nodeIntf2data
        });
    },
    tsdsUsage: function(params){
        var data  = params.data;
        var layer = params.layer;

        //create a map from node/intf pairs to their data
        var nodeIntf2data = {};

        var results = data.results || [];
        _.forEach(results, function(result){
            var node           = result.node;
            var intf           = result.intf;
            var alternate_intf = result.alternate_intf;

            if(nodeIntf2data[node] === undefined){
                nodeIntf2data[node] = {};
            }
        
            var bps = { input: null, output: null }; 
            _.forEach(['input', 'output'], function(inout){
                //loop through series backwards (starting with most recent data point) until we find a defined value
		if( result[inout] != undefined){
		    for(var i = (result[inout].length - 1); i >= 0; i--){
			var value = result[inout][i][1];
			if(value !== undefined && value !== null){
			    bps[inout] = value;
			    //found value skip to next inout key
			    return true;   
			}
		    }
		}
            });

            //put the bps object under both intf and alternate_intf since we don't know
            //which one the topology will be using 
            nodeIntf2data[node][intf] = { bps: bps };
            if(alternate_intf){
                nodeIntf2data[node][alternate_intf] = { bps: bps };
            }
        });
        
        //now set the color 
        applyData2Adjs({
            layer: layer,
            nodeIntf2data: nodeIntf2data
        });
    },
    grafanaUsage: function(params){
	var data = params.data;
	var layer = params.layer;

	var nodeIntf2data = {};
	_.forEach(data, function(result){
	    //we expect the target to be in format
	    //[input|output] node interface
	    var [dir, node, intf] = result.target.split(" ");
	    for (var i = (result.datapoints.length - 1); i >= 0; i--){
		var value = results.datapoins[i];
		if(value !== undefined && value !== null){
		    nodeIntf2data[node][intf]['bps'][dir] = value;
		    return true;
		}
	    }
	});

	applyData2Adjs({
	    layer: layer,
	    nodeIntf2data: nodeIntf2data
	});

    }
};
module.exports = MapDataCallbacks;
