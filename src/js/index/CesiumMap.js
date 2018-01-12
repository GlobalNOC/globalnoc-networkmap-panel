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

var ds        = require('../util/DataSource.js');
var CesiumMap = require('../map/CesiumMap.js');

//the last script tag in the array at execution time is the script tag that loaded this javascript
//we'll need this lata to load the configuration
var scriptTag = document.scripts[document.scripts.length - 1];

//allow automatic bootstrapping from config file
window.addEventListener("load", function(){
    var config_file = scriptTag.getAttribute("data-config");

    //if config_file is not defined we're not bootstraping ourselves off of a json
    //config file, just return
    if(config_file === undefined || config_file === null){
        return;
    }

    ds({
        source: config_file,
        onSuccess: function(params){
            var map_configs = params.data;
            for(var i = 0; i < map_configs.length; i++){
                CesiumMap(map_configs[i]);
            }
        },
        onError: function(param){
            console.error('Could not retrieve config file at, '+config_file+': '+param.error_text);
        }
    });

},true);

module.exports = CesiumMap;
