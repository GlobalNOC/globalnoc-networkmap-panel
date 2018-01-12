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
var urlFormatter = require('./UrlFormatter.js');

/**
* ```
DataSourceArray({
    source: [{
        type: 'grnocProxy',
        config: {
            urn: 'urn:publicid:IDN+grnoc.iu.edu:GlobalNOC:CDS:2:Node',
            params: {
                method: 'get_nodes',
                node_id: 1172 
            }
        }
    }...],
   //returns data in same order sources were passed in
    onSuccess: function(params){
        for(var i=0; i<params.length; i++){
            console.log('do something with returned data: '+params[i].data);
        }
    },
   //returns errors in same order sources were passed in
   //any source failing treats the entire batch request as an error
    onError: function(params){
        for(var i=0; i<params.length; i++){
            console.log('do something with error from, '+params[i].url+': '+params[i].error_text);
        }
    }
});```
* @class DataSourceArray
* @constructor DataSourceArray
* @static 
* @private
* @param {Object} params - The configuration object for the editor
* @param {String|Array} params.source - An array of DataSource params.source parameters
* @param {function} params.onSuccess - The callback to be executed when the source successfully returns
* @param {function} params.onError - Optional callback to be executed when the source receives an error. The error is just logged to the console if no 
* callback is provided
*/

var DataSourceArray = function(params){
    var sources = params.source;

    var result_hash = {};
    var error_hash  = {};

    //helper function to return results in the same order as the sources were given
    function _orderResults(hash){
        var array = [];
        var sorted_keys = Object.keys(hash).sort(function(a, b){return a-b});
        for(var i=0; i < sorted_keys.length; i++){
            var index = sorted_keys[i];
            hash[index].index = index;
            array.push(hash[index]); 
        }

        return array;
    }

    //helper function to call when any source returns
    function _onResponse(){
        //if we haven't gotten responses from all the datasources yet return
        if( (Object.keys(result_hash).length + Object.keys(error_hash).length) !== sources.length){
            return; 
        }
        //if any request failed treat the whole batch as a failure 
        if(Object.keys(error_hash).length > 0){
            if(params.onError){ 
                params.onError(_orderResults(error_hash));
            }
            return;
        }
        //all requests have returned and all were a success, call the onSuccess function
        params.onSuccess(_orderResults(result_hash));
    }

    //make a request for each source
    var results = [];
    for(var i=0; i<sources.length; i++){
        var source = sources[i];
        results.push(DataSource({
            source: source,
            onSuccess: function(index){
                return function(resp){
                    result_hash[index] = resp;
                    _onResponse();
                };
            }(i),
            onError: function(index){
                return function(resp){
                    console.error('Error retrieving data from url, '+resp.url+': '+resp.error_text);
                    error_hash[index] = resp;
                    _onResponse();
                };
            }(i)
        }));
    }

    return results;
};

/**
* ```
DataSource({
    source: {
        type: 'grnocProxy',
        config: {
            urn: 'urn:publicid:IDN+grnoc.iu.edu:GlobalNOC:CDS:2:Node',
            params: {
                method: 'get_nodes',
                node_id: 1172 
            }
        }
    },
    onSuccess: function(params){
        console.log('do something with returned data: 'params.data);
    },
    onError: function(params){
        console.log('hanlde the returned error, '+resp.url+': '+resp.error_text);
    }
});```
* @class DataSource
* @constructor DataSource
* @static 
* @param {Object} params - The configuration object for the editor
* @param {String|Object|Array} params.source - The source of the data to be retrieved can be a url string, a source object, or an array of source objects
* @param {String} params.source.type - If source is an object or an array of objects, the type describes the type of source object it is. Can either be [grnocProxy]() or [url]()
* @param {Object} params.source.config - If source is an object or an array of objects, the config provides the necessary information needed to craft the url.
* See (UrlFormatter)[] for the config options needed by the source.type you wish to use
* @param {String} params.source.respType='json' - The format of data you expect from the response, can be 'xml' or 'json'
* @param {function} params.onSuccess - The callback to be executed when the source successfully returns
* @param {function} params.onError - Optional callback to be executed when the source receives an error. The error is just logged to the console if no 
* callback is provided
*/
var DataSource = function(params){
    if(!params.source){
        console.error("Must pass in a source");
        return;
    }
    if(!params.noRequest && !params.onSuccess){
        console.error("Must pass in an onSuccess callback");
        return;
    }

    //default respType to json
    var respType = 'json';

    //format the url string if an object was passed in for the url
    var url_str;
    if(params.source.constructor === Array){
        return DataSourceArray(params);
    }
    else if(params.source.constructor === Object){
        var formatter = urlFormatter.getFormatter(params.source);
        if(!formatter){ return; } 
        url_str = formatter(params.source.config); 

        //let user manually override respType
        if(params.source.respType){
            respType = params.source.respType;
        }
    }
    //otherwise jsut assume they passed in a raw urlString
    else {
        url_str = params.source;
    }

    var reqCallback = function(error, d) {
        if(error){
            if(params.onError){
                return params.onError({ url: url_str, error_text: error.statusText });
            }
            console.error('Error retrieving data from url, '+url_str+': '+error.statusText);
            return;
        }

        var results;
        if(respType == 'json'){
            try {
                results = JSON.parse(d.response);
            } catch(e){
                error = { statusText: e.stack };
            }
            if(error){
                if(params.onError){
                    return params.onError({ url: url_str, error_text: error.statusText });
                }
                console.error('Error retrieving data from url, '+url_str+': '+error.statusText);
                return;
            }
        }else if(respType == 'xml'){
            results = d.responseXML;
        }
        return params.onSuccess({ data: results });
    };

    // To prevent an HTTP 414 error (GET request too long), we switch to a POST if the 
    // request is  close to over 2000 characters.  This is the GET limit on Internet Explorer
    var query_str;
    var conn_type = 'GET';
    if (url_str.length > 1500) {
        conn_type = 'POST';
        query_str = url_str.split('?')[1];
        url_str   = url_str.split('?')[0];
    }


    var mime_type;
    if(respType == 'json'){
        mime_type = 'application/json';
    }
    else if(respType == 'xml'){
        mime_type = 'application/xml';
    } 
    else {
        console.error("Do not know how to handle response type: "+respType);
        return;
    }

    //make the request
    if(!params.noRequest){
        if(conn_type == 'GET'){
            d3.xhr(url_str, mime_type)
                .get(reqCallback)
        }else {
            //d3.xhr(url_str, mime_type, reqCallback)
            d3.xhr(url_str, mime_type)
                .header("Content-Type","application/x-www-form-urlencoded")
                .post(query_str, reqCallback);
        }
    }

    return {
        url: url_str,
        queryStr: query_str,
        connType: conn_type,
        mimeType: mime_type
    };
};
module.exports = DataSource;
