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

import _ from "lodash";
import  * as d3 from 'd3';

let colorSchemes = [
      {name: 'RdYlGn',    value: 'interpolateRdYlGn',   invert: 'always'},
      {name: 'Blues',     value: 'interpolateBlues',    invert: 'dark'},
      {name: 'Greens',    value: 'interpolateGreens',   invert: 'dark'},
      {name: 'Greys',     value: 'interpolateGreys',    invert: 'dark'},
      {name: 'Oranges',   value: 'interpolateOranges',  invert: 'dark'},
      {name: 'Purples',   value: 'interpolatePurples',  invert: 'dark'},
      {name: 'Reds',      value: 'interpolateReds',     invert: 'dark'},
      {name: 'BuGn',    value: 'interpolateBuGn',       invert: 'dark'},
      {name: 'BuPu',    value: 'interpolateBuPu',       invert: 'dark'},
      {name: 'GnBu',    value: 'interpolateGnBu',       invert: 'dark'},
      {name: 'OrRd',    value: 'interpolateOrRd',       invert: 'dark'},
      {name: 'PuBuGn',  value: 'interpolatePuBuGn',     invert: 'dark'},
      {name: 'PuBu',    value: 'interpolatePuBu',       invert: 'dark'},
      {name: 'PuRd',    value: 'interpolatePuRd',       invert: 'dark'},
      {name: 'RdPu',    value: 'interpolateRdPu',       invert: 'dark'},
      {name: 'YlGnBu',  value: 'interpolateYlGnBu',     invert: 'dark'},
      {name: 'YlGn',    value: 'interpolateYlGn',       invert: 'dark'},
      {name: 'YlOrBr',  value: 'interpolateYlOrBr',     invert: 'dark'},
      {name: 'YlOrRd',  value: 'interpolateYlOrRd',     invert: 'dark'}
];

export class Scale {
    constructor($scope, colorScheme)  {
        this.colorScheme = $scope.ctrl.panel.colorScheme;
        this.hexArray = [];
        this.rgbArray = [];
        this.opacity_values = [];
    }

    setColorScheme(colorScheme)  {
        this.colorScheme = colorScheme;
    }

    getColorSchemes()  {	
        return colorSchemes;
    }

    getColor(percentage) {
        if(percentage<0){
            return this.hexArray[0];
        }
        for(var i=1; i < this.hexArray.length;i++){
            if (i * (100 / this.hexArray.length) >= percentage){
                return this.hexArray[i];
            }
        }
        return this.hexArray[this.hexArray.length-1];
    }

    getOpacity(percentage, opacity_values){
        if(percentage<0){
            return opacity_values[0];
        }
        for(let i = 0;i < opacity_values.length; i++){
            if(i*(100/opacity_values.length)>=percentage){
                return opacity_values[i];
            }
        }
        return opacity_values[opacity_values.length-1];
    }
    
    componentToHex(c) {
        var hex = c.toString(16);
        var code = hex.length === 1 ? '0' + hex : hex;
        return code.charAt(0) === '-'? code.slice(1,code.length):code; 
    }

    calculate(r,g,b,x,y,z) {  
        for(var i=0;i<50;i++) {
            r=r+x;
            g=g+y;
            b=b+z;
            var str='rgb('+r+','+g+','+b+')';
            this.rgbArray.push(str);
            this.hexArray.push("#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b));
        }
    }

    displayColor(color) {
        this.rgbArray=[];
        this.hexArray=[];
    	var r=0;
        var g=0;
        var b=0;

        switch(color) {
            case 'interpolateRdYlGn':
                this.calculate(255,g,b,-3,5,0);
                break;

            case 'interpolateOranges':
                this.calculate(255,46,0,0,3,0);
                break;

            case 'interpolateGreens':
                this.calculate(r,255,b,5,0,5);
                break;

            case 'interpolateBlues':
                this.calculate(r,g,255,4,4,0);
                break;

            case 'interpolateReds':
                this.calculate(250,g,b,0,5,5);
                break;

            case 'interpolateYlOrBr':
	            this.calculate(245,230,10,-2,-3,1);
                break;

            case 'interpolateGreys':
                this.calculate(r,g,b,5,5,5);
                break;

            case 'interpolatePurples':
                this.calculate(100,g,255,3,5,0);
                break;

            case 'interpolateBuGn':
                this.calculate(r,g,255,0,5,-5);
                break;

            case 'interpolateBuPu':
                this.calculate(r,g,255,2,0,-3);
                break;

            case 'interpolateGnBu':
                this.calculate(r,255,b,0,-5,5);
                break;

            case 'interpolateOrRd':
                this.calculate(205,150,b,1,-3,0);
                break;

            case 'interpolatePuBuGn':
                this.calculate(200,g,255,-4,5,-5);
                break;

            case 'interpolatePuBu':
                this.calculate(200,g,255,-4,3,0);
                break;

            case 'interpolatePuRd':
                this.calculate(90,g,255,3,0,-5);
                break;

            case 'interpolateRdPu':
                this.calculate(255,g,b,-1,0,5);
                break;

            case 'interpolateYlGn':
                this.calculate(245,245,b,-4,0,0);
                break;

            case 'interpolateYlGnBu':
                this.calculate(255,255,b,-3,-2,2);
                break;

            case 'interpolateYlOrRd':
                this.calculate(255,255,b,0,-5,0);
                break;

        }
        return {
            rgb_values: this.rgbArray,
            hex_values: this.hexArray
        }
    }

    

    getOpacityScale(options, legendWidth){
        let legendOpacityScale;
        let opacity_values = [];
        if(options.colorScale === 'linear'){
            legendOpacityScale = d3
                .scaleLinear()
                .domain([0, legendWidth])
                .range([0,1]);
        } else if (options.colorScale === 'sqrt') {
            legendOpacityScale = d3
                .scalePow()
                .exponent(options.exponent)
                .domain([0, legendWidth])
                .range([0,1]);
        }
        let valueRange = d3.range(0, legendWidth, 22);
        for(let i = 0; i< valueRange.length; i++){
            opacity_values.push(legendOpacityScale(valueRange[i]));
        }
        return opacity_values;
    }
}
