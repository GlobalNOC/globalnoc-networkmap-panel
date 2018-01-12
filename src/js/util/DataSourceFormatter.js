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

var d3    = require('d3');
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
var DataSourceFormatter = {
    /**
    * Does some error checking on a config passed in and returns the appropriate formatter if it checks out
    * @method getFormatter 
    * @param {Object} params - The method parameters 
    * @param {String} params.type - The type of formatter to return (tsdsUsage|atlasUsage) 
    * @param {Number} params.config - The formatter configuration
    */
    getFormatter: function(params){
        if(!params.type){
            console.error('Must pass in the type if using a formatter to generate the dataSource');
            return;
        }
        if(!params.config){
            console.error('Must pass in the config if using a formatter to generate the dataSource');
            return;
        }

        if(DataSourceFormatter[params.type] === undefined){
            console.error('Do not know haw to format url.type '+params.type);
            return;
        }
            
        return DataSourceFormatter[params.type];
    },
    /**
    * A datasource formatter that automatically creates a tsds query whose where clase is derived from the passed in topology
    * @method tsdsUsage 
    * @param {Object} params - The method parameters 
    * @param {Object|String} params.source - The datasource parameter 
    * @param {Object} params.topology - An object containing the network topology information
    */
    tsdsUsage: function(params){
        var source   = params.source;
        var topology = params.topology;

        //construct a query to fetch data for our points of interest
        var query = 'get node, intf, alternate_intf, values.input as input, values.output as output '+
                    'between(now -20m, now) ' +
                    'by node, intf '+
                    'from interface '+
                    'where ('+topology.poi().map(function(p){ 
                        return '( node = "'+p.node_name+'" and ( intf = "'+p.interface_name+'" or alternate_intf = "'+p.interface_name+'"))';
                    }).join(' or ')+')';

        //if this is a source object append the node and interface information to it
        if(source.constructor === Object){
            if(!source.config.params){ source.config.params = {}; }
            source.config.params.query = query;
            if(source.type == 'grnocProxy'){
                source.config.method = 'query';
            }else {
                source.config.params.method = 'query';
            }
        }
        //assume it is a string and convert it into a source object of type url
        else {
            var url = source;
            source = {
                type: 'url',
                config: {
                    url: url,
                    params: {
                        method: 'query',
                        query: query
                    }
                }
            };
        }

        //return a separate source for each batch
        return source;
    },
    /**
    * A datasource formatter that automatically appends endpoint information onto the base source passed in based on the topology as querystring parameters 
    * @method atlasUsage 
    * @param {Object} params - The method parameters 
    * @param {Object|String} params.source - The datasource parameter 
    * @param {Object} params.topology - An object containing the network topology information
    */
    atlasUsage: function(params){
        var source   = params.source;
        var topology = params.topology;
    
        //if this is a source object append the node and interface information to it
        if(source.constructor === Object){
            source.respType = 'xml';
            if(!source.config.params){ source.config.params = {}; }
            if(source.type == 'grnocProxy'){
                source.config.method = 'get_atlas_data';
            }else {
                source.config.params.method = 'get_atlas_data';
            }
            source.config.params.nodes      = topology.poi().map(function(p){ return p.node_name; }).join(',');
            source.config.params.interfaces = topology.poi().map(function(p){ return p.interface_name; }).join(','); 
        }
        //assume it is a string and convert it into a source object of type url
        else {
            var url = source;
            source = {
                type: 'url',
                respType: 'xml',
                config: {
                    url: url,
                    params: {
                        method: 'get_atlas_data',
                        nodes: topology.poi().map(function(p){ return p.node_name; }).join(','),
                        interfaces: topology.poi().map(function(p){ return p.interface_name; }).join(',')
                    }
                }
            };
        }

        return source;
    },

    grafanaUsage: function(params){
	var source = params.source;
	var topology = params.topology;

	return {type: 'grafana'};
    }

};

module.exports = DataSourceFormatter;
