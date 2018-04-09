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


import './css/atlas3_leafletmap.css!';
import _ from 'lodash';
import $ from 'jquery';
import {MetricsPanelCtrl} from 'app/plugins/sdk';
import LeafletMap from './js/atlas3_leafletmap.js';
import {Scale} from './scale';
import {CustomHover} from './CustomHover';

const panelDefaults = {
    map_tile_url: "http://api.tiles.mapbox.com/v4/mapbox.dark/{z}/{x}/{y}.png?access_token=",
    data: [],
    lat: 33,
    lng: -80,
    zoom: 3,
    choices: [],
    name: [],
    mapSrc: [],
    max: [],
    min: [],
    layers: [],
    hide_layers: false,
    color: {
        mode: 'spectrum',
        colorScale: 'linear',
        cardColor: '#2f575e',
        exponent: 0.5,
        colorScheme: 'interpolateOranges',
        fillBackground: false
    },
    legend: {
        show: true,
        mode: 'spectrum',
        legend_colors: [],
        opacity: [],
        thresholds: []
    },
    tooltip:{
        show: true,
        showLinkHover: false,
        showNodeHover: false,
        content: ' ',
        node_content: ' '
    },
    line: {
        criteria: ['Minimum', 'Maximum', 'Average', 'Current'],
        selected: 'Current'
    },
    to_si: 1000000000,
    legendTypes: ['opacity','spectrum','threshold'],
    opacityScales: ['linear', 'sqrt'],
    colorScheme : 'interpolateRdYlGn',
    rgb_values:[],
    hex_values:[],
    threshold_colors: [],
    opacity_values: [],
};

var tempArray=[];

export class Atlas3 extends MetricsPanelCtrl {
    constructor($scope, $injector) {
        super($scope, $injector);	
        _.defaults(this.panel, panelDefaults);
        this.panel.title = "GlobalNoc Network Map";
        this.map_holder_id = 'map_' + this.panel.id;
        this.containerDivId = 'container_'+this.map_holder_id;
        this.recentData = [];
        this.json_info=null;
        this.map_drawn = false; 
        this.layer_ids = [];
        this.show_legend = true;
        this.opacity = [];
        this.json_index = null;
        this.custom_hover = new CustomHover();
        this.scale = new Scale($scope,this.panel.colorScheme);
        this.colorSchemes=this.scale.getColorSchemes(); 
        this.events.on('data-received', this.onDataReceived.bind(this));
        this.events.on('data-error', this.onDataError.bind(this));
        this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
        this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
        this.events.on('init-panel-actions', this.onInitPanelActions.bind(this));
        console.log("Calling editPanelJson from panelCtrl:",this.editPanelJson);
    }
    
    onDataReceived(dataList) {
        if(!this.map_drawn){
            this.recentData = dataList;
            this.render();
            this.map_drawn = true;
        }

        this.recentData = dataList;
        this.process_data(dataList);
    }

    jsonModal(){
        var modalScope = this.$scope.$new(true);
        modalScope.panel = this.panel; 

        this.publishAppEvent('show-modal', {
            src: 'public/plugins/networkmap/json_editor.html',
            scope: modalScope,
        });
    }
    
    process_data(dataList){
        var self = this;
	    var data_targets = dataList.map(target => target.target);
        //update with the data!
        _.forEach(dataList, function(data){
            _.forEach(self.panel.layers, function(layer){
                //find the link associated with this data

                if(typeof layer.active !== "function"){
                    return;
                }
		
                if(layer.topology() === undefined){
                    return;
                }
		
                var links = layer.topology().links();
                var endpoints = layer.topology().endpoints();

                // Hide layers without data
                if(self.panel.hide_layers){
                    _.forEach(links, function(l){
                        _.forEach(l.endpoints, function(ep){
                            if(!data_targets.includes(ep.name)){       
                                layer.toggle(false);
                            }
                        }); 
                    }); 
                }
                var target;
                var dir;
                
                // Match endpoints to visualize the data
                var target_endpoints = [];
                _.forEach(endpoints, function(pop){
                    if(data.target == pop.name){
                        target_endpoints.push({endpoint: pop, name: pop.name, label: pop.label});
                    }
                });
                

                // Match links to visualize the data
                var target_links = [];
                _.forEach(links, function(l){
                    _.forEach(l.endpoints, function(ep){
                        var str =  l.name + " " + ep.name;
                        if(data.target == ep.name){
                            if(ep.label){
                                target_links.push({link: l, endpoint: ep.name, label: ep.label, full: str});
                            }else{
                                target_links.push({link: l, endpoint: ep.name, label: null, full: str});
                            }
                        }
                    });
                });

                var cur;
                var color_criteria = self.panel.line.selected;
                var min;
                var max;
                var sum = 0;
                var count = 0;
                var avg;
                var interval;

                //find the last valid value i.e. the current value
                //find the min
                //find the max
                //find the average
                //find the total datapoints
                for (var i = (data.datapoints.length - 1); i >= 0; i--){
                    var value = data.datapoints[i][0];
                    if(value !== undefined && value !== null){
                        sum += value;
                        count += 1;
                        if(min === undefined){
                            min = value;
                            max = value;
                        }
                        if(value < min){
                            min = value;
                        }
                        if(value > max){
                            max = value;
                        }
			
                        if(cur === undefined){
                            cur = value;
                        }
                    }
                }

                if(count > 1){
                    var start = data.datapoints[0][1];
                    var end = data.datapoints[1][1];
                    interval = start - end;
                }
	           
                // if target_endpoints is not empty, visualize the data
                if(target_endpoints.length > 0){
                    _.forEach(target_endpoints, function(obj){
                        var e = obj.endpoint;
                        e.cur = cur;
                        e.min = min;
                        e.max = max;
                        e.sum = sum;
                        e.count = count;
                        avg = sum/count;
                        e.avg = avg.toFixed(2);
                        let color_value; 
                        if(color_criteria === "Average"){
                            color_value = avg;
                        } else if(color_criteria === "Minimum") {
                            color_value = min;
                        } else if(color_criteria === "Maximum") {
                            color_value = max;
                        } else {
                            color_value = cur;
                        }
                        // use the color value to get color if mode === spectrum || opacity if mode === opacity
                        // set color or opacity for the endpoint (e.opacity, e.color)
                        // use these values in the single tube layer
                        let mode = self.panel.color.mode;
                        var popColor;
                        var popOpacity;
                        if(mode === 'spectrum'){
                            popColor =self.scale.getColor(color_value);
                            e.endpointColor = popColor;
                            e.endpointOpacity = 1;
                        }else if(mode === 'opacity'){
                            popColor = self.panel.color.cardColor;
                            popOpacity = self.scale.getOpacity(color_value, self.panel.opacity_values);
                            e.endpointColor = popColor;
                            e.endpointOpacity = popOpacity;
                        }
                    });
                }
                

                // updating link information with the calculated values
                // set line color for the lines based on these values
                        
                _.forEach(target_links, function(obj){
                    var layer_max = layer.max();
                    var layer_min = layer.min();

                    var l = obj.link
                    l.count = count;
                    avg = sum/count;
                    let color_value;
                    if(color_criteria === "Average") {
                        color_value = ((avg - layer_min) / (layer_max-layer_min)) * 100;
                    } else if(color_criteria === "Minimum") {
                        color_value = ((min - layer_min) / (layer_max-layer_min)) * 100;
                    } else if(color_criteria === "Maximum") {
                        color_value = ((max - layer_min) / (layer_max-layer_min)) * 100;
                    } else {
                        color_value = ((cur - layer_min) / (layer_max-layer_min)) * 100;
                    }

                    // if mode === spectrum, set the line color based on % value
                    // else if mode === opacity, set the line color with the card color and opacity based on % value
                    // create a new property for links - l.lineOpacity
                    // apply opacity to circuits in the single tube layer.
                    let mode = self.panel.color.mode;
                    var lineColor;
                    var lineOpacity;
                    if(mode === 'spectrum'){
                        lineColor =self.scale.getColor(color_value);//,this.panel.values);
                        l.lineColor = lineColor;
                        l.lineOpacity = 1;
                    }else if(mode === 'opacity'){
                        lineColor = self.panel.color.cardColor;
                        lineOpacity = self.scale.getOpacity(color_value, self.panel.opacity_values);
                        l.lineColor = lineColor;
                        l.lineOpacity = lineOpacity;
                    }

                    //check for AZ or ZA based on the endpoint the data was found at!
                    if(l.endpoints[0].name === obj.endpoint){
                        l.az.name = l.endpoints[0].name;
                        if(l.endpoints[0].label) l.az.label = l.endpoints[0].label;
                        l.az.cur = color_value;
                        l.azLineColor = lineColor;
                        l.azLineOpacity = lineOpacity;
                        l.az.max = self.toSI(max);
                        l.az.min = self.toSI(min);
                        l.az.sum = self.toSI(sum);
                        l.az.avg = self.toSI(avg);
                        l.arrow = 1;
                    } else{
                        l.za.name = l.endpoints[1].name;
                        if(l.endpoints[1].label) l.za.label = l.endpoints[1].label;
                        l.za.cur = color_value;
                        l.zaLineColor = lineColor;
                        l.zaLineOpacity = lineOpacity;
                        l.za.max = self.toSI(max);
                        l.za.min = self.toSI(min);
                        l.za.sum = self.toSI(sum);
                        l.za.avg = self.toSI(sum / count);
                        l.arrow = 2;
                    }
		    
                    if(l.az.cur != null && l.za.cur != null){
                        if(l.az.cur > l.za.cur){
                            l.lineColor = l.azLineColor;
                            l.lineOpacity = l.azLineOpacity;
                            l.arrow = 1;
                        } else{
                            l.lineColor = l.zaLineColor;
                            l.lineOpacity = l.azLineOpacity;
                            l.arrow = 2;
                        }
                    }
                });	
            });
        });
	
        _.forEach(this.panel.layers, function(layer){
            if(typeof layer.active !== "function"){
                return;
            }
            layer.update();
        });
    }

    toSI(num){
        if(this.panel.tooltip.showDefault){
            this.panel.to_si = panelDefaults.to_si;
        }
        if(this.panel.to_si <= 0){ 
            num = num / panelDefaults.to_si;
        } else{
            num = num / this.panel.to_si;
        }
        return num.toFixed(2);
    }
    
    onDataError(err) {
        this.dataRaw = [];
    }
    
    onInitEditMode() {
        this.addEditorTab('Options', 'public/plugins/networkmap/editor.html', 2);
        this.addEditorTab('Display', 'public/plugins/networkmap/display_editor.html', 3);
        tempArray=this.scale.displayColor(this.panel.colorScheme);
        this.panel.json_info = null;
    } 
   
    onInitPanelActions(actions) {
         this.render();
    }
    
    
    addNewChoice() {
        var num = this.panel.choices.length + 1;
        this.panel.choices.push(num);
        this.layer_ids.push('');
        this.panel.name.push('');
        this.panel.mapSrc.push('');
        this.panel.max.push('');
        this.panel.min.push('');
    }
    
    useValidator(index) {
        let json = this.panel.mapSrc[index];
        if(!json) return;
        $("#json_valid").text(json);
        this.json_index = index;
        this.validateJson();
    }
    
    saveToMapSrc(index){
        if(index===null) return;
        if($(".line-number")) $(".line-number").remove();
        let json = $('#json_valid').text();
        if(!this.isJson(json)){
            this.panel.json_info = "Can't save invalid JSON!";
            $("#json-info").removeClass("json-success").addClass("json-err");
            return;
        }
        this.panel.mapSrc[index] = json;
        this.json_index = null;
        this.lineNumbering();
        this.render();
    }

    removeChoice(index) {
        this.panel.choices.splice(index,1);
        if(this.layer_ids[index]){
           $("#"+this.layer_ids[index]).remove();
        }
        this.layer_ids.splice(index,1);
        this.panel.name.splice(index,1);
        this.panel.mapSrc.splice(index,1);
        this.panel.max.splice(index,1);
        this.panel.min.splice(index,1);
    }

    copyToClip(){
        if($(".line-number")) $(".line-number").remove();
        let text = $("#json_valid");
        if(!text) return;
        let content = text.text();
        if(!this.isJson(content)){
            this.panel.json_info = "Can't copy invalid JSON!";
            $("#json-info").removeClass("json-success").addClass("json-err");
            return;
        }
        this.selectText(text[0]);
        document.execCommand("Copy");
        this.lineNumbering();
    }

    selectText(element) {
        if (/INPUT|TEXTAREA/i.test(element.tagName)) {
            element.focus();
            if (element.setSelectionRange) {
                element.setSelectionRange(0, element.value.length);
            } else {
                element.select(); // if textarea
            }
            return;
        }    
        if (window.getSelection) {
            window.getSelection().selectAllChildren(element);
        } else if (document.body.createTextRange) {
            var range = document.body.createTextRange();
            range.moveToElementText(element);
            range.select();
        }
    }

    lineNumbering(){
        let pre = document.getElementById('json_valid');
        pre.innerHTML = '<span class="line-number"></span>'+pre.innerHTML+'<span class="cl"></span>';
        let num = pre.innerHTML.split(/\n/).length;
        for(let j = 0;j<num;j++){
            let line=pre.getElementsByClassName("line-number")[0];
            line.innerHTML+='<span>' +(j+1)+'</span>';
        }
    }

    syntaxHighlight(json){
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|([\[\]\(\){}])|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match){
            var span_elem = `<span style="color:darkorange">${match}</span>`;
            if(/^"/.test(match)){
                if(/:$/.test(match)){
                    span_elem = `<span class="line" style="color:red">${match}</span>`;
                }else {
                    span_elem = `<span style="color:green">${match}</span>`;
                }
            }else if(/true|false/.test(match)){
                span_elem = `<span style="color:blue"> ${match}</span>`;
            }else if(/null/.test(match)){
                span_elem = `<span style="color:magenta">${match}</span>`;
            }else {
                span_elem = `<span>${match}</span>`;
            }
            return span_elem;
        });
    }

    validateJson(){
        if($(".line-number")) $(".line-number").remove();
        let json_ugly = $("#json_valid").text();
        if(!json_ugly) return;
        if(!this.isJson(json_ugly)){
            if($(".line-number")) $(".line-number").remove();
            this.lineNumbering();
            try{
                JSON.parse(json_ugly);
            }catch(err){
                this.panel.json_info = err;
                $("#json-info").removeClass("json-success").addClass("json-err");
            }
        
        } else {
            this.panel.json_info=null;
            let json_obj = JSON.parse(json_ugly);
            let pretty = JSON.stringify(json_obj, undefined, 2);
            this.panel.json_text = pretty;
            $("#json-info").removeClass("json-err").addClass("json-success");
            this.panel.json_info = "Valid JSON!";
            document.getElementById("json_valid").innerHTML = this.syntaxHighlight(pretty);
            if($(".line-number")) $(".line-number").remove();
            this.lineNumbering();
        }
    }
 
    display() {
        this.panel.colors=this.scale.displayColor(this.panel.colorScheme);
        this.panel.rgb_values = this.panel.colors.rgb_values;
        this.panel.hex_values = this.panel.colors.hex_values;
        if(this.panel.legend.invert){
            _.reverse(this.panel.hex_values);
            _.reverse(this.panel.rgb_values);
        }
    }

    displayOpacity(options, legendWidth){
        this.panel.opacity_values = this.scale.getOpacityScale(options, legendWidth);
        if(this.panel.legend.invert){
            _.reverse(this.panel.opacity_values);
        } 
    }

    getState(){
        this.show_legend = this.panel.legend.show;
    }
   
    getHtml(htmlContent){
        return this.custom_hover.parseHtml(htmlContent);
    }

    isJson(str){
        try{
            JSON.parse(str)
        }catch(e){
            return false;
        }
        return true;
    }

    link(scope, elem, attrs, ctrl){
        var self = this;
        ctrl.events.on('render', function() {
            ctrl.panel.legend.adjLoadLegend = {
                horizontal: true,
            }
            
            let html_content = ctrl.getHtml(ctrl.panel.tooltip.content);
            ctrl.panel.tooltip.content = html_content;
            let node_content = ctrl.getHtml(ctrl.panel.tooltip.node_content);
            ctrl.panel.tooltip.node_content = node_content;
            if(!ctrl.panel.use_json) { ctrl.panel.json_info = null };
            if(ctrl.map_drawn == true){
                if(ctrl.panel.color.mode === 'opacity'){
                    ctrl.displayOpacity(ctrl.panel.color, ctrl.map.width()*0.4);
                    ctrl.panel.legend.mode = ctrl.panel.color.mode;
                    ctrl.panel.legend.opacity = ctrl.panel.opacity_values;
                    ctrl.panel.legend.card_color = ctrl.panel.color.cardColor;
                } else if (ctrl.panel.color.mode === 'spectrum'){
                    ctrl.display();
                    ctrl.panel.legend.mode = ctrl.panel.color.mode;
                    ctrl.panel.legend.legend_colors = ctrl.panel.hex_values;
                } else if(ctrl.panel.color.mode === 'threshold'){
                
                }
                ctrl.map.drawLegend(ctrl.panel.legend);
                ctrl.map.setMapUrl(ctrl.panel.map_tile_url);
                ctrl.map.adjustZoom(ctrl.panel.zoom);
                ctrl.map.setCenter(ctrl.panel.lat, ctrl.panel.lng);
          
                // Remove existing layers from DOM and the  map before adding new layers.
                let all_layers = ctrl.layer_ids;
                _.forEach(all_layers, function(layer){
                    if(layer!==''){
                        $("#"+layer).remove();
                        ctrl.map.removeLayers(layer);
                    }
                });

                ctrl.layer_ids = [];
                ctrl.panel.layers = [];
                for(let j=0; j<ctrl.panel.choices.length;j++){
                    if(ctrl.panel.mapSrc[j] === null || ctrl.panel.mapSrc[j] === undefined) {
                        return;
                    }
               
                    let networkLayer = ctrl.map.addNetworkLayer({
                        name: ctrl.panel.name[j],
                        max: ctrl.panel.max[j],
                        min: ctrl.panel.min[j],
                        linewidth: 3.7,
                        mapSource: ctrl.panel.mapSrc[j]
                    });
                    if(ctrl.panel.mapSrc[j] === null || ctrl.panel.mapSrc[j] === undefined || ctrl.panel.mapSrc[j] === "") {
                        ctrl.layer_ids.push(''); 
                        continue; 
                    }
                    ctrl.layer_ids.push(networkLayer.layerId()); 
                    ctrl.panel.layers.push(networkLayer);
                    networkLayer.onInitComplete(function() {
                        ctrl.process_data(self.recentData);
                    });
                    if(ctrl.isJson(ctrl.panel.mapSrc[j])){
                        ctrl.process_data(self.recentData);
                    }
                }
                return;
            }

            if(!document.getElementById('container_map_' + ctrl.panel.id)){
                console.log("Container not found");
            }
	     
            let map = LeafletMap({ containerId: ctrl.containerDivId,
                bing_api_key: ctrl.panel.bing_api_key,
                map_tile_url: ctrl.panel.map_tile_url,
                lat: ctrl.panel.lat,
                lng: ctrl.panel.lng,
                zoom: ctrl.panel.zoom,
                tooltip: ctrl.panel.tooltip
            });
            ctrl.map = map; 
            ctrl.map_drawn = true;
            if(ctrl.panel.color.mode === 'opacity'){
                ctrl.displayOpacity(ctrl.panel.color, ctrl.map.width() * 0.4);
                ctrl.panel.legend.mode = ctrl.panel.color.mode;
                ctrl.panel.legend.opacity = ctrl.panel.opacity_values;
                ctrl.panel.legend.card_color = ctrl.panel.color.cardColor;
            } else if(ctrl.panel.color.mode === 'spectrum'){
                ctrl.display();
                ctrl.panel.legend.mode = ctrl.panel.color.mode;
                ctrl.panel.legend.legend_colors = ctrl.panel.hex_values;
            }
            if(ctrl.panel.legend.show){
                ctrl.map.drawLegend(ctrl.panel.legend);
            }
    
            if(ctrl.map === undefined){
                return;
            }

            for(let i=0; i < ctrl.panel.choices.length; i++){
                if(ctrl.panel.mapSrc[i] === null || ctrl.panel.mapSrc[i] === undefined){
                    return;
                }
                let networkLayer = ctrl.map.addNetworkLayer({
                    name: ctrl.panel.name[i],
                    max: ctrl.panel.max[i],
                    min: ctrl.panel.min[i],
                    lineWidth: 3.7,
                    mapSource: ctrl.panel.mapSrc[i]
                });
                ctrl.layer_ids.push(networkLayer.layerId());
                ctrl.panel.layers.push(networkLayer);		
                networkLayer.onInitComplete(function(){
                    ctrl.process_data(self.recentData);
                });
                if(ctrl.isJson(ctrl.panel.mapSrc[i])){
                    ctrl.process_data(self.recentData);
                }
            }
        });
    
    }
}

Atlas3.templateUrl = 'module.html';
