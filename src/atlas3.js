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
import {MetricsPanelCtrl} from 'app/plugins/sdk';
import LeafletMap from './js/atlas3_leafletmap.js';
import {Scale} from './scale';
import {CustomHover} from './CustomHover';

const panelDefaults = {
    map_tile_url: "http://api.tiles.mapbox.com/v4/mapbox.dark/{z}/{x}/{y}.png?access_token=",
    bing_api_key: "bing api key",
    data: [],
    lat: 33,
    lng: -80,
    scale: 1,
    zoom: 3,
    choices: [],
    name: [],
    mapSrc: [],
    max: [],
    min: [],
    layers: [],
    color: {
        mode: 'spectrum',
        cardColor: '#b4ff00',
        colorScale: 'linear',
        exponent: 0.5,
        colorScheme: 'interpolateOranges',
        fillBackground: false
    },
    legend: {
        show: true,    
        legend_colors: []
    },
    tooltip:{
        show: true,
        showDefault: true,
        content: ' '
    },
    to_si: 1000000000,
    scales: ['linear', 'sqrt'],
    colorScheme : 'interpolateRdYlGn',
    rgb_values:[],
    hex_values:[],
    colorModes : ['opacity','spectrum'],
    custom_hover: ' '
};

var recentData;
var tempArray=[];

export class Atlas3 extends MetricsPanelCtrl {
    constructor($scope, $injector) {
	super($scope, $injector);
	
	_.defaults(this.panel, panelDefaults);
    this.map_holder_id = 'map_' + this.panel.id;
    this.containerDivId = 'container_'+this.map_holder_id;
    this.map_drawn = false;
    this.show_legend = true;
    this.custom_hover = new CustomHover(this.panel.tooltip.content);
    this.scale = new Scale(this.colorScheme);
    this.colorSchemes=this.scale.getColorSchemes();
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('init-panel-actions', this.onInitPanelActions.bind(this));
    //this.events.on('panel-initialized', () => {
   // });
    }
    
    
    onDataReceived(dataList) {
    if(!this.map_drawn){
        recentData = dataList;
        this.render();
        this.map_drawn = true;
    }

    recentData = dataList;
    this.process_data(dataList);
    }
    
    process_data(dataList){

    var self = this;
	
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

		var target;
		var dir;

		

/*		if(data.target.endsWith("AZ")){
		    target = data.target.substr(0,data.target.length - 3);
		    dir = "AZ";
		}else if(data.target.endsWith("ZA")){
		    target = data.target.substr(0,data.target.length - 3);
		    dir = "ZA";
		}else{
		    return;
		}
*/
		
		//var links = layer.topology().links({linkNames: [target]});
		var target_links = [];
		_.forEach(links, function(l){
		    _.forEach(l.endpoints, function(ep){
			var str = l.name + " " + ep;
			if(data.target == str){
			    target_links.push({link: l, endpoint: ep, full: str});
			}
		    });
		});

		var bps;

		var min;
		var max;
		var avg = 0;
		var total = 0;
		var interval;

		//find the last valid value
		//find the min
		//find the max
		//find the average
		//find the total datapoints
		for (var i = (data.datapoints.length - 1); i >= 0; i--){
		    var value = data.datapoints[i][0];
		    if(value !== undefined && value !== null){
			avg += value;
			total += 1;
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
			
			if(bps === undefined){
			    bps = value;
			}
		    }
		}

		if(total > 1){
		    var start = data.datapoints[0][1];
		    var end = data.datapoints[1][1];
		    interval = start - end;
		}
		
		_.forEach(target_links, function(obj){
		    var layer_max = layer.max();
		    var layer_min = layer.min();

		    var l = obj.link

		    var color_value = ((bps - layer_min) / (layer_max-layer_min)) * 100;

		    var lineColor =self.scale.getColor(color_value);//,this.panel.values);
		    
		    l.lineColor = lineColor;
		    
		    //check for AZ or ZA based on the endpoint the data was found at!
		    if(l.endpoints[0] == obj.endpoint){
			l.az.cur = color_value;
			l.azLineColor = lineColor;
			l.az.max = self.toSI(max);
			l.az.min = self.toSI(min);
			l.az.avg = self.toSI(avg / total);
			l.arrow = 1;
		    }else{
			l.za.cur = color_value;
			l.zaLineColor = lineColor;
			l.za.max = self.toSI(max);
			l.za.min = self.toSI(min);
			l.za.avg = self.toSI(avg / total);
			l.arrow = 2;
		    }
		    
		    if(l.az.cur != null && l.za.cur != null){
			if(l.az.cur > l.za.cur){
			    l.lineColor = l.azLineColor;
			    l.arrow = 1;
			}else{
			    l.lineColor = l.zaLineColor;
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
        }
        else{
            num = num / this.panel.to_si;
        }
        return num.toFixed(2);
    }
    
    onDataError(err) {
	    this.dataRaw = [];
    }
    
    onInitEditMode() {
	    this.addEditorTab('Options', 'public/plugins/worldview/editor.html', 2);
	    this.addEditorTab('Display', 'public/plugins/worldview/display_editor.html', 3);
	    tempArray=this.scale.displayColor(this.panel.colorScheme);
    }  
   
    onInitPanelActions(actions) {
	    this.render();
    }
    
    
    addNewChoice() {
	    var num = this.panel.choices.length + 1;
	    this.panel.choices.push(num);
	    this.panel.name.push('');
	    this.panel.mapSrc.push('');
	    this.panel.max.push('');
	    this.panel.min.push('');
    }
    
    removeChoice(index) {
        this.panel.choices.splice(index,1);
        this.panel.name.splice(index,1);
        this.panel.mapSrc.splice(index,1);
        this.panel.max.splice(index,1);
        this.panel.min.splice(index,1);
    }
 
    display() {
        this.panel.colors=this.scale.displayColor(this.panel.colorScheme);
        this.panel.rgb_values = this.panel.colors.rgb_values;
        this.panel.hex_values = this.panel.colors.hex_values;
    }

    getState(){
       // console.log(`From render() - Legend Toggle: ${this.panel.legend.show}`);
        //this.legend.state.show = this.panel.legend.show;
        this.show_legend = this.panel.legend.show;
    }
   
    getHtml(htmlContent){
        return this.custom_hover.parseHtml(htmlContent);
    }

    link(scope, elem, attrs, ctrl){

    console.log(`${this.panel.legend.show}`);

	ctrl.events.on('render', function() {
        ctrl.display();
        
        //let show_legend = ctrl.getState();

        //console.log(`Panel Legend: ${ctrl.panel.legend.show}`);
        
        ctrl.panel.legend.legend_colors = ctrl.panel.hex_values;
        ctrl.panel.legend.adjLoadLegend = {
            horizontal: true,
        }
        let html_content = ctrl.getHtml(ctrl.panel.tooltip.content);
        ctrl.panel.tooltip.content = html_content;
        if(ctrl.map_drawn == true){
            console.log(`Map existing: ${ctrl.map}`);
            ctrl.map.drawLegend();
	    }
        if(ctrl.map_drawn == true){
            return;
        }
	    if(!elem.find('container_map_' + ctrl.panel.id)){
	    }
	    
        let map = new LeafletMap({ containerId: 'container_map_' + ctrl.panel.id,
            bing_api_key: ctrl.panel.bing_api_key,
            map_tile_url: ctrl.panel.map_tile_url,
            lat: ctrl.panel.lat,
            lng: ctrl.panel.lng,
            zoom: ctrl.panel.zoom,
            tooltip: ctrl.panel.tooltip,					
            legend: ctrl.panel.legend
        });
	    ctrl.map = map;
        if(ctrl.panel.legend.show){
            ctrl.map.drawLegend();
        }
        // map.onUpdate(map);
        ctrl.map_drawn = true;
	    //ctrl.map.removeMap(); 
	    if(ctrl.map === undefined){
		    return;
	    }
	    for(var i=0; i < ctrl.panel.choices.length; i++){
		if(ctrl.panel.mapSrc[i] === null || ctrl.panel.mapSrc[i] === undefined){
		    return;
		}
		var networkLayer = ctrl.map.addNetworkLayer({
		    name: ctrl.panel.name[i],
		    max: ctrl.panel.max[i],
		    min: ctrl.panel.min[i],
		    lineWidth: 3.7,
		    mapSource: ctrl.panel.mapSrc[i]
        });
		ctrl.panel.layers.push(networkLayer);		
		networkLayer.onInitComplete(function(){
		    ctrl.process_data(recentData);
		});
	    }
	});
	
    }
    
}

Atlas3.templateUrl = 'module.html';
