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

var d3       = require('d3');
var _        = require('lodash');
var InfoDiv  = require('./InfoDiv.js');
/**
* A legendDiv widget for use in conjunction with the Map Widgets to display supplemental information when clicking on features
* ```
var legendDiv = Legend();
legendDiv.show({
    content: content,
    align: {
        node: document.getElementById('rect'),
        position: position,
        anchor: anchor
    }
});
```
* @class Legend
* @constructor Legend
* @static
* @param {Object} params - The configuration object for the editor
* @param {DOM Element} params.content - A [DOM Element](http://www.w3schools.com/jsref/dom_obj_all.asp) containing the legendDivs body markup
* @param {String} params.header - A string to use for the legendDiv's header 
* @param {String} params.onInit - A function that is executed the first time the legendDiv is shown 
*/
var Legend = function(params){
    params = params || {};

    var legend = {};
    
    if(!params.align){
        console.error("Must pass in an align object!");
        return;
    }
    if(!params.items){
        console.error("Must pass in a list of items to create a legend for");
    }
    
    var mode = params.mode;
    
    var infoDiv;
    var legendDiv = InfoDiv({
        className: 'atlas-legend', 
        align: params.align,
    }).className((params.orientation !== undefined) ? params.orientation : 'horizontal')
    .show();

    /**
    * Getter/Setter of the legenedDiv 
    * @method setContent
    * @param {Object} options - The method parameters
    * @param {String} options.content - The markup to set the infoDiv's innerHTML to 
    */
    legend.legendDiv = function(value){
        if(!arguments.length){ return legendDiv; }
        legendDiv = value;
        return legend;
    };

    /**
    * Getter/Setter of the infoDiv 
    * @method infoDiv 
    * @param {infoDiv} value - The new infoDiv object  
    * @return {infoDiv} infoDiv - The current infoDiv object
    * @chainable
    */
    legend.infoDiv = function(value){
        if(!arguments.length){ return infoDiv; }
        infoDiv = value;
        return legend;
    };

    legend.init = function(){

        _.forEach(params.items, function(item, i){
            var delta;
            if(i == 0){
                delta = params.items[i].value;
            }else {
                delta = params.items[i].value - params.items[i-1].value; 
            }
            item.width = delta; 
        });

        //create legend colors
        var updateItems = d3.select(legend.legendDiv().node())
            .selectAll('.item')
            .data(params.items);

        var enterItems = updateItems.enter();

        var items = enterItems.append('div')
            .classed('item', 'true')
            .style('width', function(d){
                return d.width + '%';
            })
            .style('height', function(d){
                return '8px';
            });

        items.append('div')
            .classed('color', true)
            .style('width', function(d){
                return '100%';
            })
            .style('height', function(d){
                return '100%';
            })
            .style('background-color', function(d){
                return d.color;
            });
        
        if(mode === 'spectrum'){
            items.selectAll('.color')
                .style('border-style', function(d){
                    return "none";
                });
        }
        
        if(mode === 'opacity' || mode === 'threshold'){
            items.selectAll('.color')
                .style('opacity', function(d){
                    return d.opacity;
                })
                .style('border-right-style', function(d){
                    return "solid";
                })
                .style('border-color', function(d){
                    return d3.rgb(d.color).darker();
                })
                .style('border-width', function(d){
                    return "1px";
                });
        }

        // create legend numbers
        var numberLocations = params.numberLocations;
        if(mode === 'opacity'){
            numberLocations = [0,25,50,75,100];
        }
        if(!_.isArray(numberLocations)){ numberLocations = [0,100]; }

        var numberDiv = d3.select(legend.legendDiv().node())
            .append('div')
            .classed('numbers', true)
            .style('color', 'white')
            .style('mix-blend-mode','exclusion');


        var numberItems = numberDiv.selectAll('.scale-num')
            .data(numberLocations).enter();
        numberItems.append('div')
            .classed('scale-num', true)      
            .classed('zero', function(d) { return d <= 0; })
            .classed('hundred', function(d) { return d >= 100; })
            .style('left', function(d){ return (d <= 0 || d >= 100) ? '0%' : (d-50) + '%'; })
            .html(function(d){ return d + '%'; });

        //if there's description text add another panel that appears when hovered over
        if(params.description){
            var infoDiv = InfoDiv({
                content: '<div>'+params.description+'</div>',
                className: 'atlas-legend-descr', 
                align: {
                    node: legendDiv.node(),
                    position: 'bl',
                    anchor: 'tl'
                } 
            }).className((params.orientation !== undefined) ? params.orientation : 'horizontal');
            d3.select(legendDiv.node()).on('mouseover', function(){
                infoDiv.show(); 
            });
            d3.select(legendDiv.node()).on('mouseout', function(){
                infoDiv.hide(); 
            });
            if(params.width){
                d3.select(legendDiv.node()).style('width', params.width + 'px');
            }
        }
    };

    legend.init();

    return legend;
};
module.exports = Legend;
