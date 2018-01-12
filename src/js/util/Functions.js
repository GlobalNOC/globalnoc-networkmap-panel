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
* An object containing helper functions
* ```
* Functions.wrap(d3.select('#my_wrapper').node(), d3.select('#my_content').node());
* ```
* @class MapBackgrounds
* @static 
*/
var Functions = {
    /**
     * A method that wraps an HTMLElement around each element in an HTMLElement array.
     * @method onInit
     * @param {DOM Node} wrapper - The DOM Node to wrap around an element(s) 
     * @param {DOM Node|Array} elms - The elements to be wrapped 
     */
    wrap: function(wrapper, elms) {
        // Convert `elms` to an array, if necessary.
        if (!elms.length) elms = [elms];
        
        // Loops backwards to prevent having to clone the wrapper on the
        // first element (see `child` below).
        for (var i = elms.length - 1; i >= 0; i--) {
                console.log('here');
            var child = (i > 0) ? wrapper.cloneNode(true) : wrapper;
            var el    = elms[i];
            
            // Cache the current parent and sibling.
            var parent  = el.parentNode;
            var sibling = el.nextSibling;
            
            // Wrap the element (is automatically removed from its current
            // parent).
            child.appendChild(el);
            
            // If the element had a sibling, insert the wrapper before
            // the sibling to maintain the HTML structure; otherwise, just
            // append it to the parent.
            if (sibling) {
                parent.insertBefore(child, sibling);
            } else {
                parent.appendChild(child);
            }
        }
    },

    /**
     * A method that takes a string, optionally with appended SI prefix (k, M, G, etc.) and turns it into a number.
     * @method siToNumber
     * @param {string} str - string w/ SI size to convert to a number
     */
    siToNumber: function(str) {
        //must have at least 1 number (may be floating point), 0 or more spaces, and an optional si_prefix
        //of k, m, g or t case insensitive
        var match = str.toString()
            .replace(/,/g,'')
            .match(/^ *(-?\d+(?:\.\d+)?) *(k|m|g|t|p)? *$/i);

        // fails if it did not match our regex
        if (!match) { return null; }

        //otherwise pull out our value and si_prefix
        var val       = Number(match[1]);
        var si_prefix = match[2];

        //if the user did included an si prefix, adjust val
        if (si_prefix) {
            //convert the value to appropriate number given the si_prefix
            switch (si_prefix.toLowerCase()) {
                case 'k':
                    val *= 1e3;
                    break;
                case 'm':
                    val *= 1e6;
                    break;
                case 'g':
                    val *= 1e9;
                    break;
                case 't':
                    val *= 1e12;
                    break;
                case 'p':
                    val *= 1e15;
                    break;
                default:
                    console.error('Do not know how to convert maxBps to bits for value of ' + str);
                    return; 
            }
        }

        return val;
    }
};

module.exports = Functions;
