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
var Geometry = require('../util/Geometry.js');
/**
* A infoDiv widget for use in conjunction with the Map Widgets to display supplemental information when clicking on features
* ```
var infoDiv = InfoDiv();
infoDiv.show({
    content: content,
    align: {
        node: document.getElementById('rect'),
        position: position,
        anchor: anchor
    }
});
```
* @class InfoDiv
* @constructor InfoDiv
* @static
* @param {Object} params - The configuration object for the editor
* @param {DOM Element} params.content - A [DOM Element](http://www.w3schools.com/jsref/dom_obj_all.asp) containing the infoDivs body markup
* @param {String} params.header - A string to use for the infoDiv's header 
* @param {String} params.onInit - A function that is executed the first time the infoDiv is shown 
*/
var InfoDiv = function(params){
    params = params || {};

    var infoDiv = {};

    var pin = false;


    var _infoDiv;
    if(params.align && params.align.relative){
        _infoDiv = d3.select(params.align.node).append('div');

        switch (params.align.position){ 
            case 'tl': 
                _infoDiv.style('position', 'relative')
                    .style('top', '0px')
                    .style('left', '0px');
                break;
            case 'bl': 
                _infoDiv.style('position', 'relative')
                    .style('bottom', '0px')
                    .style('left', '0px');
                break;
            case 'tr': 
                _infoDiv.style('position', 'relative')
                    .style('top', '0px')
                    .style('right', '0px');
                break;
            case 'br': 
                _infoDiv.style('position', 'relative')
                    .style('bottom', '0px')
                    .style('right', '0px');
                break;
            default: 
                console.error("Don't know how to render infoDiv with these parameters");
        } 
    }
    else if(params.align) {
        _infoDiv = d3.select('body').append('div')
            .style('position', 'absolute');
    }
    else {
        console.error('Must pass in align parameter!');
        return;
    }

    _infoDiv.attr('class', 'atlas-info-div')
        .style('opacity', 0);

    /**
    * Applies a class to the info div 
    * @method className 
    * @param {String} className - The name of the class to apply to the info di 
    * @return infoDiv object
    */
    infoDiv.className = function(className){
        _infoDiv.classed(className, true);
        return infoDiv;
    };

    /**
    * Shows the infoDiv
    * @method show
    * @param {Object} options - The configuration object for the editor
    * @param {Object} options.align - An object that defines what to align the infoDiv to, if not present it displays in the center of the screen 
    * @param {DOM Element} options.align.node The DOM Element to align the infoDiv to 
    * @param {String} options.align.position - A string representing which part of the node to align the infoDiv to
    * @param {String} options.align.anchor - A string representing which part of the infoDiv to align to the node
    * @param {DOM Element} options.content - A DOM Element containing the infoDivs body markup
    * @param {String} options.header - A string to use for the infoDiv's header 
    * @param {String} options.onInit - A function that is executed the first time the infoDiv is shown 
    */
    infoDiv.show = function(options){
        options = options || {};
        options.align = options.align || params.align;
        options.content = options.content || params.content;
	options.pos = options.pos;
        //options.height = options.height || params.height;
        //options.width = options.width || params.width;


        if(options.pin !== undefined){ infoDiv.pin(options.pin); }
        else if(infoDiv.pin()){ return; }

        if(options.height){
        //    _infoDiv.style('height', options.height+'px');
        }
        if(options.width){
        //    _infoDiv.style('width', options.width+'px');
        }
        if(options.content){
            infoDiv.setContent({ content: options.content });
        }


        if(options.align && !options.align.relative){
            var xy = Geometry.align(_.merge(options.align, {
                height: _infoDiv.node().getBoundingClientRect().height,            
                width:  _infoDiv.node().getBoundingClientRect().width
            })); 
            infoDiv.moveTo(options.pos);
        }

        _infoDiv 
          .transition()
          .duration(500)
          .style('opacity', 1);
	//console.log("Returning infoDiv in show(): ",infoDiv);
        return infoDiv;
    };

    /**
    * Getter/Setter of the pin flag for the dialog
    * @method pin
    * @param {String} className - The name of the class to apply to the info di 
    * @return {Bool} pin - The flag representing whether or not the info div is pinned
    */
    infoDiv.pin = function(isPinned){
        if(arguments.length){ pin = isPinned; }
        return pin;
    };

    /**
    * Moves the info div to the provided xy coordinates 
    * @method moveTo
    * @param {Object} options - The method parameters
    * @param {Array} options.xy - The xy position to move the info div to
    */
    infoDiv.moveTo = function(position){
	const padding_x = 20;
	const padding_y = 10;
	const infoDivWidth = _infoDiv.clientWidth;
	const infoDivHeight = _infoDiv.clientHeight;

	let left = position.page_x + padding_x;
	let top = position.page_y + padding_y;
	if(position.page_x + infoDivWidth > window.innerWidth){
	  left = position.page_x - infoDivWidth - padding_x;
	}

	if(position.page_y - window.pageYOffset + infoDivHeight > window.innerHeight){
	  top = position.page_y - infoDivHeight - padding_y;
	}
        //var cur_x = position.cur_x+10;
	//var cur_y = position.cur_y+15;
        _infoDiv.style('left', left+'px'); 
        _infoDiv.style('top',  top+'px'); 
    };

    /**
    * Hides the infoDiv
    * @method hide 
    * @param {Object} options - The method parameters
    * @param {Bool} options.pin - Whether or not the info div should stay visible 
    */
    infoDiv.hide = function(options){
        options = options || {};
        if(options.pin !== undefined){ infoDiv.pin(options.pin); }
        if(infoDiv.pin()){ return; }

        _infoDiv 
          .transition()
          .duration(500)
          .style('opacity', 0);
    };

    /**
    * Returns the DOM node of the infoDiv 
    * @method node 
    */
    infoDiv.node = function(){
        return _infoDiv.node();
    };

    /**
    * Sets the content of the info div 
    * @method setContent
    * @param {Object} options - The method parameters
    * @param {String} options.content - The markup to set the infoDiv's innerHTML to 
    */
    infoDiv.setContent = function(options){
        _infoDiv.html(options.content);
    };
    
    if(params.className){
        infoDiv.className(params.className);
    }
    //console.log("Returning infoDiv: ",infoDiv);
    return infoDiv;
};
module.exports = InfoDiv;
