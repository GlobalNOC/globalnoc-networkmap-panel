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

var d3   = require('d3');
/**
* An object containg methods that help to form a url from an object
* ```
var url = urlFormatter.grnocProxy({
    urn: 'urn:publicid:IDN+grnoc.iu.edu:ThompsbpDEV:CDS:2:Network',
    method: 'get_network_maps',
    params: {
        network_map_id: 1
    }
});
```
* @class UrlFormatter
* @constructor UrlFormatter 
* @static
*/
var UrlFormatter = {
    /**
     * Does some error checking on a config passed in and returns the appropriate formatter if it checks out
     * @method getFormatter 
     * @param {Object} params - The method parameters 
     * @param {Object} params.type - The type of formatter to retrieve
     * @param {Object} params.config - The url config
     * @return {Function} formatter - The url formatter given the passed in type
     */
    getFormatter: function(params){
        if(!params.type){
            console.error('Must pass in the url.type if using a formatter to generate the url');
            return;
        }
        if(!params.config){
            console.error('Must pass in the url.config if using a formatter to generate the url');
            return;
        }

        if(UrlFormatter[params.type] === undefined){
            console.error('Do not know haw to format url.type '+params.type);
            return;
        }
            
        return UrlFormatter[params.type];
    },
    /**
     * Function that takes the value of a url parameter and looks for special placeholders in the form of [% PLACEHOLDER %]
     * and replaces them with real values
     * @method paramTemplate
     * @param {String} param - The param to interpolate  
     * @return {String} param - The interpolated parameter 
     */
    paramTemplate: function(param){
        if(param.constructor !== String){ return param; }

        //HANDLE DATE PLACEHOLDERS
        var format = d3.time.format("%m/%d/%Y %H:%M:%S");
        var now = new Date();
        now.setSeconds(0);

        // replace any instances of a now time placeholder
        var now_time_regex = /\[% *NOW *%\]/g;
        param = param.replace(now_time_regex, function(){
            return format(now);
        });

        // replace any instances of a time offset placeholder
        var time_offset_regex = /\[% *NOW_(MINUS|PLUS)_(\d+)_(MINUTES|HOURS|DAYS|WEEKS|MONTHS|YEARS) *%\]/g;
        param = param.replace(time_offset_regex, function(full_string, operator, unit, metric){
            var minutes;
            switch(metric){
                case 'MINUTES':
                    minutes = unit;
                    break;
                case 'HOURS':
                    minutes = unit * 60;
                    break;
                case 'DAYS':
                    minutes = unit * 1440;
                    break;
                case 'WEEKS':
                    minutes = unit * 1440 * 7;
                    break;
                case 'MONTHS':
                    minutes = unit * 1440 * 30;
                    break;
                case 'YEARS':
                    minutes = unit * 1440 * 365;
                    break;
                default:
                    console.error('How did this happen!?');
                    return;
            }
            if( operator == 'MINUS' ){
                minutes *= -1;
            }

            var past = d3.time.minute.offset(now,minutes);
            return format(past);
        }); 

        return param;
    },
    /**
     * Function to transform an object into url query string parameters
     * @method params
     * @param {Object} params - The hash of parameters to convert to querystring parameters 
     * @return {String} querystring - The querystring representation of the parameters 
     */
    params: function(params){
        if(!params){ return ''; }
        param_strs = [];
        for (var field in params) {
            if (params.hasOwnProperty(field)) {
                var value = params[field];
                if(value.constructor === Array){
                    param_strs.push(value.map(function(v){ 
                        return field+'='+encodeURIComponent(UrlFormatter.paramTemplate(v)); 
                    }).join('&'));
                }else {
                    param_strs.push(field+'='+encodeURIComponent(UrlFormatter.paramTemplate(value)));
                }
            }
        }
        return param_strs.join('&');
    },
    /**
     * A formatter that takes a url and a hash of parameters and returns a url with querystring parameters concatinated
     * @method url 
     * @param {Object} params - The method parameters 
     * @param {String} params.url - The base url
     * @param {Object} params.params - The hash of parameters to append to the url 
     * @return {String} url - The formed url 
     */
    url: function(params){
        var url = params.url;
        if(params.params){
            url += '?'+UrlFormatter.params(params.params);
        }
        return url;
    },
    /**
     * Function to transform an object into a grnocProxy request
     * @method grnocProxy
     * @param {Object} params - The method parameters 
     * @param {String|Options} params.url - The base url
     * @param {String|Options} params.urn - The URN of the service
     * @param {String} params.method - The method to call at the url or urn
     * @return {String} url - The formed url
     */
    grnocProxy: function(params){
        var url = '/proxy/remote_webservice.cgi?';
        if(params.url){
            url += '&method=remote_method';
            url += '&remote_webservice='+params.url;
        }
        if(params.urn){
            url += '&method=remote_urn_method';
            //allow the user to send in an object containing just the cloud and the resource
            if(params.urn.constructor === Object){
                url += '&service_identifier='+
                    encodeURIComponent('urn:publicid:IDN+grnoc.iu.edu:'+params.urn.cloud+':'+params.urn.resource);
            }
            //otherwise they passed in the whole urn
            else {
                url += '&service_identifier='+encodeURIComponent(params.urn);
            }
        }
        //remote_method_name and remote_parameters are required so send garbage if we don't need them
        url += '&remote_method_name='+((params.method) ? params.method : 'foo');
        url += '&remote_parameters='+((params.params) ? encodeURIComponent(UrlFormatter.params(params.params)) : 'bar');
        if(params.timeout){
            url += '&timeout='+params.timeout;
        }
                
        return url;
    }
};
module.exports = UrlFormatter;
