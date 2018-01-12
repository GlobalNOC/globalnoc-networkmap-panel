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

/**
* ```
Interval(func, 60);```
* @class Interval
* @constructor Interval
* @static 
* @private
* @param {Object} params - The initialization parameters 
* @param {func} params.func- The function to call on an interval
* @param {integer} params.intervalSeconds - The seconds in between calling func
*/
var _ = require('lodash');
var Interval = function(params){
    if(!params.func){
        console.error("Must pass in func!");
        return;
    }
    if(!params.intervalSeconds){
        console.error("Must pass in intervalSeconds!");
        return;
    }

    var args;
    var active          = false;
    var intervalId      = _.uniqueId('interval_');
    var func            = params.func;
    //convert to milliseconds
    var intervalSeconds = params.intervalSeconds * 1000;

    var intervalFunc = function(){
        //apply new arguments to function if called again
        args = arguments;

        //don't call function again if we're already running
        if(active){ return true; }

        //set our state to active
        active = true;

        //define a loop function to keep
        var loop = function(){
            //short circuit execution if we toggled off after the timeout was set
            if(!active){ return; }

            func.apply(intervalFunc, args);
            setTimeout(loop, intervalSeconds);
        };
        loop.apply(intervalFunc, args);
    };

    /** 
     * Getter/Setter for intervalSeconds 
     * @method intervalSeconds
     * @param {Integer|Optional} value - The new value for intervalSeconds 
     */
    intervalFunc.intervalSeconds = function(value){
        if(!arguments.length){ return intervalSeconds; }
        //covert to milliseconds when setting
        intervalSeconds = value * 1000;
        return intervalSeconds;
    };

    /** 
     * Getter for the intervalId
     * @method intervalId
     */
    intervalFunc.intervalId = function(){
        return intervalId;
    };

    /** 
     * Stops the interval and sets func and the object itself to undefined
     * @method remove 
     * @param {Integer|Optional} value - The new value for intervalSeconds 
     */
    intervalFunc.remove = function(){
        intervalFunc.toggle(false);
        func         = undefined;
        intervalFunc = undefined;
    };

    /** 
     * Toggles whether the interval is running or not 
     * @method intervalFunc 
     * @param {Boolean} bool - A boolean flag that starts the interval when true and stops it when false 
     */
    intervalFunc.toggle = function(bool){
        var current_state = active;
        //start loop if we're toggling back on, otherwise this is 
        //a noop anyways
        intervalFunc.apply(intervalFunc, args);
    
        if(!arguments.length){
            active = !current_state;
        }else {
            active = bool;
        }
        
        return active;
    };
    
    return intervalFunc;
}
module.exports = Interval;
