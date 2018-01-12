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

var _  = require('lodash');

//hlper function to get bounding box for an array of xy coordiantes
function _getBoundingBoxXy(params){
    //initialize values to be the first data point
    var min_x = params.xy[0][0];
    var max_x = params.xy[0][0];
    var min_y = params.xy[0][1];
    var max_y = params.xy[0][1];

    _.forEach(params.xy, function(xy){
        if(min_x > xy[0]){
            min_x = xy[0];
        } 
        if(max_x < xy[0]){
            max_x = xy[0];
        } 
        if(min_y > xy[1]){
            min_y = xy[1];
        } 
        if(max_y < xy[1]){
            max_y = xy[1];
        } 
    });

    return {
        left: min_x,
        right: max_x,
        top: min_y,
        bottom: max_y,
        width: max_x - min_x,
        height: max_y - min_y
    };
};

//hlper function to get bounding box for an array of latlng coordiantes
function _getBoundingBoxLatLng(params){
    //#todo don't need it yet
};

//fixes absolute position when scrolling see...
// http://stackoverflow.com/questions/17656623/position-absolute-scrolling
function absolutePosition(el) {
    var
        found,
        left = 0,
        top = 0,
        width = 0,
        height = 0,
        offsetBase = absolutePosition.offsetBase;
    if (!offsetBase && document.body) {
        offsetBase = absolutePosition.offsetBase = document.createElement('div');
        offsetBase.style.cssText = 'position:absolute;left:0;top:0';
        document.body.appendChild(offsetBase);
    }
    if (el && el.ownerDocument === document && 'getBoundingClientRect' in el && offsetBase) {
        var boundingRect = el.getBoundingClientRect();
        var baseRect = offsetBase.getBoundingClientRect();
        found = true;
        left = boundingRect.left - baseRect.left;
        top = boundingRect.top - baseRect.top;
        width = boundingRect.right - boundingRect.left;
        height = boundingRect.bottom - boundingRect.top;
    }
    return {
        found: found,
        left: left,
        top: top,
        width: width,
        height: height,
        right: left + width,
        bottom: top + height
    };
}

/**
* An object containing geometry related helper functions
* ```
* var bb = Geometry.getBoundingBox({ xy: xy });
* ```
* @class Geometry 
* @static 
*/
var Geometry = {
    /** 
     * Returns a bounding box given an array cartesian or latitude/longitude coordiates 
     * @method getBoundingBox
     * @param {Object} params - The method parameters
     * @param {Array} params.xy - An array of xy coordinates
     * @param {Array} params.latlng - An array of lat/lng  coordinates
     * @private 
     */
    getBoundingBox: function(params){
        var bb;
        if(params.xy){
            bb = _getBoundingBoxXy(params);
        }
        else if(params.latlng){
            bb = _getBoundingBoxLatLng(params);
        }
        else {
            console.error('Must pass in xy array or latlng array');
        }
        return bb;
    },
    /** 
     * Gets the xy coordinates of relative to a point on the outter edget of a bounding box or a DOM element 
     * @method align
     * @param {Object} params - The method parameters
     * @param {DOM Element|Optional} params.node - The DOM node to derive a bounding box from
     * @param {DOM Element|Optional} params.bb - The bounding box to retrieve a point from 
     * @param {Integer|Optional} params.height - The height of the element you're aligning to the node or bounding box
     * @param {Integer|Optional} params.width - The width of the element you're aligning to the node or bounding box
     * @param {String} params.position - The point on the bounding box to retrieve (c, ls, tc, rc, bc, bl, tl, tr, br)
     * @param {String|Optional} params.anchor - The point on the element you're aligning to the node or bounding box to anchor to 
     * @private 
     */
    align: function(params){
        if((!params.node && !params.bb) || !params.position){
            console.error("Must pass in a node|bb (bounding box) and position to align the dialog!");
            return;
        }

        var bb; 
        if(params.node){
            //bb = params.node.getBoundingClientRect();
            bb = absolutePosition(params.node);
        }else {
            bb = params.bb;
        }

        //calculate the center points 
        var xc = bb.left + (bb.width / 2);
        var yc = bb.top  + (bb.height / 2);

        var xy = [];
        switch(params.position){
            case 'c':
                xy[0] = xc;
                xy[1] = yc;
                break;
            case 'lc':
                xy[0] = bb.left;
                xy[1] = yc;
                break;
            case 'tc':
                xy[0] = xc;
                xy[1] = bb.top;
                break;
            case 'rc':
                xy[0] = bb.right;
                xy[1] = yc;
                break;
            case 'bc':
                xy[0] = xc;
                xy[1] = bb.bottom;
                break;
            case 'bl':
                xy[0] = bb.left;
                xy[1] = bb.bottom;
                break;
            case 'tl':
                xy[0] = bb.left;
                xy[1] = bb.top;
                break;
            case 'tr':
                xy[0] = bb.right;
                xy[1] = bb.top;
                break;
            case 'br':
                xy[0] = bb.right;
                xy[1] = bb.bottom;
                break;
            default:
                console.error('Do not know how to align to: '+params.position);
        }

        if(params.anchor){
            switch(params.anchor){
                case 'lc':
                    xy[1] -= (params.height / 2);
                    break;
                case 'tc':
                    xy[0] -= (params.width / 2);
                    break;
                case 'rc':
                    xy[0] -= params.width;
                    xy[1] -= (params.height / 2);
                    break;
                case 'bc':
                    xy[0] -= (params.width / 2);
                    xy[1] -= params.height
                    break;
                case 'bl':
                    console.log('height='+params.height);
                    xy[1] -= params.height
                    break;
                case 'tl':
                    //this is the default
                    break;
                case 'tr':
                    xy[0] -= params.width;
                    break;
                case 'br':
                    xy[0] -= params.width
                    xy[1] -= params.height;
                    break;
                default:
                    console.error('Do not know how to align to: '+params.position);
            }
        }
        
        console.debug(xy);

        return xy;
    }
};
module.exports = Geometry;
