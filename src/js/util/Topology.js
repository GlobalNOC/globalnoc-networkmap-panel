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

var         _ = require('lodash');
var Functions = require('./Functions.js');
/**
* ```
*
* var topology = Topology(value);
* ```
* @class Topology 
* @constructor DataSourceArray
* @static 
* @private
* @param {Object} params - The object representing the network topology 
*/
var Topology = function(params, offsets){
    var data     = _.cloneDeep(params);
    var offsets = offsets;
    var poi            = [];
    var topology       = {};
    topology.__factory__ = 'Topology';

    var links = [];
    var endpoints = [];
    /** 
     * Sets the path for a given link 
     * @method getBoundingBox
     * @param {Integer} linkId - The link id of the link to modify 
     * @param {Array} path - The array of points that represent the link path 
     */
    topology.setPath = function(linkId, path) {
        var newPath = _.cloneDeep(path);
        var linkIdx = _.findIndex(data.links, function(link) {
            return link.linkId === linkId;
        });
        if (linkIdx) {
            data.links[linkIdx].path = newPath;
            data.links[linkIdx].name = 'Waypoint';
        } else {
            console.error('Could not find the links to add the new path.');
        };
    };

    /** 
     * When an adjacency endpoint is moved this function moves the relevant POP
     * with it along with the relevant endpoints of any adjacencies that terminate
     * on that endpoint
     * @method syncAdjEndpoints 
     * @param {Object} params - The method parameters 
     * @param {Object:Required} params.adj_moved - The topology's adjacency object whose position moved 
     */
    topology.syncLinkEndpoints = function(params){
        params = params || {};
        if(!params.link_moved && !params.endpoint_moved){
            console.error('Must pass in link_moved or endpoint_moved as an argument');
            return;
        }

        // build a hash of our adjacencies
        var adj_hash     = {};
        _.forEach(topology.data().links, function(link){
            var name   = link.name;
            var endp_a = link.path[0];
            var endp_z = link.path[adj.path.length - 1];

            var match  = name.match(/([^-]+)-([^-]+)/)
            adj_hash[name] = {};
            adj_hash[name].pops = [
                { name: match[1], coord: endp_a },
                { name: match[2], coord: endp_z }
            ];
        });

        // build a hash of our pops
        var pop_hash = {};
        if(params.pop_moved){
            pop_hash[params.pop_moved.name] = {
                updated: true,
                lat: params.pop_moved.lat,
                lon: params.pop_moved.lon
            };
        };
        _.forEach(topology.data().pops, function(pop){
            var name = pop.name;
            pop_hash[name] = {};
            pop_hash[name].updated = false;
        });
        
        // if an adjacency was moved, make the adjacency that has been moved first in the list so its 
        // pops are updated, then we can sync the other adjacencies to be aligned
        // with the new pop/endpoint locations
        if(params.adj_moved){
            var adjIndex      = _.findIndex(topology.data().adjacencies, { 'adjacencyId': params.adj_moved.adjacencyId });
            var adj_moved_obj = topology.data().adjacencies[adjIndex];
            _.remove(topology.data().adjacencies, function(adj) {
                return adj.adjacencyId === params.adj_moved.adjacencyId;
            });
            topology.data().links.unshift(adj_moved_obj);
        }

        _.forEach(topology.data().links, function(adj){
            var name = adj.name;
            for(var popIndex = 0; popIndex < adj_hash[name].pops.length; popIndex++){
                var adj_pop  = adj_hash[name].pops[popIndex];
                var pop_name = adj_pop.name;
                var coord    = adj_pop.coord;
                var pop_obj  = pop_hash[pop_name];
               
                // if we've already adjusted this pops coordinates
                // update the coord in this adjacencies path to be in
                // sync with the pops and move on
                if(pop_obj.updated){
                    var a_or_z = (popIndex == 0) ? 0 : (adj.path.length - 1);
                    adj.path[a_or_z].lat = pop_obj.lat;
                    adj.path[a_or_z].lon = pop_obj.lon;
                    
                    continue; 
                }

                // if we haven't updated this pop to be in sync with an
                // adj yet, use this adjacencies coord
                _.forEach(topology.data().pops, function(pop){
                    if(pop.name != pop_name){ return true; } //lodash continue
                    
                    pop.lat = coord.lat;
                    pop.lon = coord.lon;
                });
            
                // update pop hash
                pop_hash[pop_name] = {
                    updated: true,
                    lat: coord.lat,    
                    lon: coord.lon
                };
            }
        });

        var here = {};
    };

    topology.init = _.once(function(){
        //process links
        if(!data.links) data.links = [];    
    
        for(var i=0; i < data.links.length; i++){
            _.forEach(offsets, function(off){
		var link = data.links[i];
		link.az = {min: -1, max: -1, avg: -1};
		link.za = {min: -1, max: -1, avg: -1};

		var l = _.cloneDeep(link);
		
		if(!l.linkId || l.linkId === null || l.linkId === undefined){
                    l.linkId = _.uniqueId('link_');
		}
		var lastIndex = l.path.length - 1;
		
		//determine if this passes the 180/-180 boundary
		//if it does what is the shortest path?
		
		var firstPathElm = _.first(l.path);
		var firstEndpoint = _.get(l, ['endpoints', '0', 'name'], 'Waypoint');
		if (firstPathElm) { firstPathElm.name = firstEndpoint; }
		
		var lastPathElm = _.last(l.path);
		var lastEndpoint = _.get(l, ['endpoints', '1', 'name'], 'Waypoint');
		if (lastPathElm) { lastPathElm.name = lastEndpoint; }
		
		//so take lon and subtract them and take abs
		//if > 180 you want to go the other way!
		var dist = Math.abs(firstPathElm.lon - lastPathElm.lon);
		var path1 = [];
		var path2 = [];
		
		if(dist > 180){
		    
                    //ok we now know that we are not going the "best way"
                    //we need to break this into 2 paths!
                    //take the first endpoint follow the 
                    var first_path = 0;
                    var previous;
                    
                    _.each(l.path, function(p){
			
			if(previous !== undefined){
                            if(Math.abs(previous.lon - p.lon) > 180){
				first_path = 1;
                            }
			}
			
			previous = p;
			
			if(first_path == 0){
                            var new_p = _.cloneDeep(p);
                            if(p.lon >= 0){
				new_p.lon = parseFloat(new_p.lon) - 360;
                            }else{
				new_p.lon = parseFloat(new_p.lon) + 360;
                            }
                            path1.push(p);
                            path2.push(new_p);
			}else{
                            var new_p = _.cloneDeep(p);
                            if(p.lon >= 0){
				new_p.lon = parseFloat(new_p.lon) - 360;
                            }else{
				new_p.lon = parseFloat(new_p.lon) + 360;
                            }
                            path1.push(new_p);
                            path2.push(p);
			}
			
                    });
		    
                    var new_l_1 = _.cloneDeep(link);
                    new_l_1.path = path1;
                    var new_l_2 = _.cloneDeep(link);
                    new_l_2.path = path2;
                    data.links.push(new_l_1);
                    data.links.push(new_l_2);   
		}else{

		    _.each(l.path, function(p,i) {
			p.endpoint = false;
			if(i === 0 || i === lastIndex){
			    p.endpoint = true;
			}
			p.lon = parseFloat(p.lon) + off;
			p.name = 'Waypoint';

			if(!p.linkId || p.linkId === null || p.linkId === undefined){
			    p.linkId   = l.linkId;
			    p.linkName = l.name;
			}

			if(!p.waypointId || p.waypointId === null || p.waypointId === undefined){
			    p.waypointId = _.uniqueId('waypoint_');
			}
		    });
		    
		    //add points of interest as an element of adjacency to easily determine
		    //where to get utilization data from
		    //link.poi = getAdjPOI(adj);
		    links.push(l);
		}
            });
            
        }
	
        data.links = links;
        
        if(!data.endpoints) data.endpoints = [];    
        //add unique ids to all endpoints
	    _.forEach(data.endpoints, function(endpoint){
            _.forEach(offsets, function(off){
                endpoint.endpointId = _.uniqueId('endpoint_');
                endpoint.min = -1;
                endpoint.max = -1;
                endpoint.cur = -1;
                endpoint.avg = -1;
                endpoint.sum = -1;
                endpoint.count = -1;
            });
	    });
    });

    /** 
     * Returns an array of endpoints with respect to any filters passed in 
     * @method endpoints
     * @param {Object} params - The method parameters 
     * @param {Array} params.endpointIds - The array of pop ids of the endpoints to return 
     * @return {Array} endpoints - An array of endpointss
     */
    topology.endpoints = function(params){
        var my_endpoints = data.endpoints;
        if(!params){ return my_endpoints; }

        //filter by endpointIds if passed in
        if(params.endpointIds){
            if(params.endpointIds.length === 0) { return []; }
            my_endpoints = _.filter(my_endpoints, function(d){
                return _.indexOf(params.endpointIds, d.endpointId) !== -1;
            });
        }

        return my_endpoints;
    };

    /** 
     * Returns an array of links with respect to any filters passed in 
     * @method links
     * @param {Object} params - The method parameters 
     * @param {Array} params.linkIds - The array of link ids of the links to return 
     * @return {Array} links - An array of links
     */
    topology.links = function(params){
        var my_links = data.links;
        if(!params){ return my_links; }

        //filter by linkIds if passed in
        if(params.linkIds){
            if(params.linkIds.length === 0) { return []; }
            my_links = _.filter(my_links, function(d){
                return _.indexOf(params.linkIds, d.linkId) !== -1;
            });
        }

        //filter by endpointNames if passed in
        if(params.endpointNames){
            if(params.endpointNames.length === 0) { return []; }
            my_links = _.filter(my_links, function(d){
                for(var i = 0; i < d.path.length; i++){
                    var path = d.path[i];
                    if(_.indexOf(params.endpointNames, path.name) !== -1){
                        return true;
                    }
                }
                return false;
            });
        }

	if(params.linkNames){
	    if(params.linkNames.length === 0){ return []; }
	    my_links = _.filter(my_links, function(l){
		if(_.indexOf(params.linkNames, l.name) !== -1){
		    return true;
		}
		return false;
	    });
	}

        return my_links;
    };

    /** 
     * Sets the selected flag to false on all links and endpoints 
     * @method deselectAll 
     */
    topology.deselectAll = function() {
        _.forEach(data.endpoints, function(endpoint){
            endpoint.selected = false;
        });
        _.forEach(data.links, function(link){
            link.selected = false;
        });
    };
    
    /** 
     * Returns a list of all the unique points of interest for this topology (i.e. all of the node/interface pairs we wish to use to gather data for links)
     * @method poi 
     * @return {Array} poi - Array of node/interfaces
     */
    topology.poi = function(){
        return poi;
    };

    /** 
     * Returns the object of topology data 
     * @method data
     * @return {Object} data - The topology data 
     */
    topology.data = function(){
        return data;
    };

    topology.init();

    return topology;
}

module.exports = Topology;
