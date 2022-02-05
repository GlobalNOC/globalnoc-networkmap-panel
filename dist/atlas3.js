'use strict';

System.register(['./css/atlas3_leafletmap.css!', 'lodash', 'jquery', 'app/plugins/sdk', 'app/core/core', './js/atlas3_leafletmap.js', './scale', './CustomHover'], function (_export, _context) {
    "use strict";

    var _, $, MetricsPanelCtrl, appEvents, LeafletMap, Scale, CustomHover, _createClass, panelDefaults, tempArray, Atlas3;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    return {
        setters: [function (_cssAtlas3_leafletmapCss) {}, function (_lodash) {
            _ = _lodash.default;
        }, function (_jquery) {
            $ = _jquery.default;
        }, function (_appPluginsSdk) {
            MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
        }, function (_appCoreCore) {
            appEvents = _appCoreCore.appEvents;
        }, function (_jsAtlas3_leafletmapJs) {
            LeafletMap = _jsAtlas3_leafletmapJs.default;
        }, function (_scale) {
            Scale = _scale.Scale;
        }, function (_CustomHover) {
            CustomHover = _CustomHover.CustomHover;
        }],
        execute: function () {
            _createClass = function () {
                function defineProperties(target, props) {
                    for (var i = 0; i < props.length; i++) {
                        var descriptor = props[i];
                        descriptor.enumerable = descriptor.enumerable || false;
                        descriptor.configurable = true;
                        if ("value" in descriptor) descriptor.writable = true;
                        Object.defineProperty(target, descriptor.key, descriptor);
                    }
                }

                return function (Constructor, protoProps, staticProps) {
                    if (protoProps) defineProperties(Constructor.prototype, protoProps);
                    if (staticProps) defineProperties(Constructor, staticProps);
                    return Constructor;
                };
            }();

            panelDefaults = {
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
                size: [],
                layers: [],
                hide_layers: false,
                twin_tubes: false,
                arrows: false,
                weather_tile: false,
                static_node_tooltip: false,
                nodeFillColor: "rgb(200,200,200)",
                downLinkColor: "rgb(200,200,200)",
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
                    thresholds: ["50"]
                },
                tooltip: {
                    show: true,
                    showLinkHover: false,
                    showNodeHover: false,
                    content: ' ',
                    node_content: ' '
                },
                layer: {
                    criteria: ['Minimum', 'Maximum', 'Average', 'Current'],
                    link: { selected: 'Current' },
                    node: { selected: 'Current' }
                },
                to_si: 1000000000,
                legendTypes: ['opacity', 'spectrum', 'threshold'],
                opacityScales: ['linear', 'sqrt'],
                colorScheme: 'interpolateRdYlGn',
                threshold_colors: ['#37872D', '#C4162A']
            };
            tempArray = [];

            _export('Atlas3', Atlas3 = function (_MetricsPanelCtrl) {
                _inherits(Atlas3, _MetricsPanelCtrl);

                function Atlas3($scope, $injector) {
                    _classCallCheck(this, Atlas3);

                    var _this = _possibleConstructorReturn(this, (Atlas3.__proto__ || Object.getPrototypeOf(Atlas3)).call(this, $scope, $injector));

                    _.defaults(_this.panel, panelDefaults);
                    _this.map_holder_id = 'map_' + _this.panel.id;
                    _this.containerDivId = 'container_' + _this.map_holder_id;
                    _this.recentData = [];
                    _this.map_drawn = false;
                    _this.layer_ids = [];
                    _this.show_legend = true;
                    _this.opacity = [];
                    _this.t_colors = [];
                    _this.rgb_values = [];
                    _this.hex_values = [];
                    _this.json_index = null;
                    _this.json_content = '';
                    _this.custom_hover = new CustomHover();
                    _this.scale = new Scale($scope, _this.panel.colorScheme);
                    _this.colorSchemes = _this.scale.getColorSchemes();
                    _this.events.on('data-received', _this.onDataReceived.bind(_this));
                    _this.events.on('data-error', _this.onDataError.bind(_this));
                    _this.events.on('data-snapshot-load', _this.onDataReceived.bind(_this));
                    _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
                    _this.events.on('init-panel-actions', _this.onInitPanelActions.bind(_this));

                    // Color picker event handlers
                    _this.onDefaultNodeColor = _this.onDefaultNodeColor.bind(_this);
                    _this.onDownLinkChange = _this.onDownLinkChange.bind(_this);
                    _this.onOpacityLegendColor = _this.onOpacityLegendColor.bind(_this);
                    return _this;
                }

                _createClass(Atlas3, [{
                    key: 'onDataReceived',
                    value: function onDataReceived(dataList) {
                        if (!this.map_drawn) {
                            this.recentData = dataList;
                            this.render();
                        }

                        this.recentData = dataList;
                        this.process_data(dataList);
                    }
                }, {
                    key: 'process_data',
                    value: function process_data(dataList) {
                        var self = this;
                        var data_targets = dataList.map(function (target) {
                            return target.target;
                        });
                        //update with the data!
                        _.forEach(dataList, function (data) {
                            _.forEach(self.panel.layers, function (layer) {
                                //find the link associated with this data
                                if (typeof layer.active !== "function") {
                                    return;
                                }

                                if (layer.topology() === undefined) {
                                    return;
                                }

                                var links = layer.topology().links();
                                var endpoints = layer.topology().endpoints();

                                // Hide layers without data
                                if (self.panel.hide_layers) {
                                    _.forEach(links, function (l) {
                                        _.forEach(l.endpoints, function (ep) {
                                            if (!data_targets.includes(ep.name)) {
                                                layer.toggle(false);
                                            }
                                        });
                                    });
                                }
                                var target;
                                var dir;

                                // Match endpoints to visualize the data
                                var target_endpoints = [];
                                if (endpoints) {
                                    _.forEach(endpoints, function (pop) {
                                        if (data.target == pop.name) {
                                            target_endpoints.push({ endpoint: pop, name: pop.name, label: pop.label });
                                        }
                                    });
                                }

                                // Match links to visualize the data
                                var target_links = [];
                                if (links) {
                                    _.forEach(links, function (l) {
                                        _.forEach(l.endpoints, function (ep) {
                                            var str = l.name + " " + ep.name;
                                            if (data.target == ep.name) {
                                                if (ep.label) {
                                                    target_links.push({ link: l, endpoint: ep.name, label: ep.label, full: str });
                                                } else {
                                                    target_links.push({ link: l, endpoint: ep.name, label: null, full: str });
                                                }
                                            }
                                        });
                                    });
                                }
                                var cur;
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
                                for (var i = data.datapoints.length - 1; i >= 0; i--) {
                                    var value = data.datapoints[i][0];
                                    if (value !== undefined && value !== null) {
                                        sum += value;
                                        count += 1;
                                        if (min === undefined) {
                                            min = value;
                                            max = value;
                                        }
                                        if (value < min) {
                                            min = value;
                                        }
                                        if (value > max) {
                                            max = value;
                                        }

                                        if (cur === undefined) {
                                            cur = value;
                                        }
                                    }
                                }

                                if (count > 1) {
                                    var start = data.datapoints[0][1];
                                    var end = data.datapoints[1][1];
                                    interval = start - end;
                                }

                                // if target_endpoints is not empty, visualize the data
                                if (target_endpoints.length > 0) {
                                    _.forEach(target_endpoints, function (obj) {
                                        var layer_max = layer.max();
                                        var layer_min = layer.min();
                                        var color_criteria = self.panel.layer.node.selected;
                                        var e = obj.endpoint;
                                        e.cur = cur;
                                        e.min = min;
                                        e.max = max;
                                        e.sum = sum;
                                        e.count = count;
                                        avg = sum / count;
                                        e.avg = avg.toFixed(2);
                                        var color_value = void 0;
                                        if (color_criteria === "Average") {
                                            color_value = (avg - layer_min) / (layer_max - layer_min) * 100;
                                        } else if (color_criteria === "Minimum") {
                                            color_value = (min - layer_min) / (layer_max - layer_min) * 100;
                                        } else if (color_criteria === "Maximum") {
                                            color_value = (max - layer_min) / (layer_max - layer_min) * 100;
                                        } else {
                                            color_value = (cur - layer_min) / (layer_max - layer_min) * 100;
                                        }
                                        // use the color value to get color if mode === spectrum or threshold || get opacity if mode === opacity
                                        // set color or opacity for the endpoint (e.opacity, e.color)
                                        // use these values in the single tube layer
                                        var mode = self.panel.color.mode;
                                        var popColor;
                                        var popOpacity;
                                        if (mode === 'spectrum') {
                                            popColor = self.scale.getColor(color_value);
                                            e.endpointColor = popColor;
                                            e.endpointOpacity = 1;
                                        } else if (mode === 'opacity') {
                                            popColor = self.panel.color.cardColor;
                                            popOpacity = self.scale.getOpacity(color_value, self.opacity);
                                            e.endpointColor = popColor;
                                            e.endpointOpacity = popOpacity;
                                        } else if (mode === 'threshold') {
                                            popColor = self.scale.getThresholdColor(color_value, self.t_colors, self.panel.legend.thresholds);
                                            e.endpointColor = popColor;
                                            e.endpointOpacity = 1;
                                        }
                                    });
                                }

                                // updating link information with the calculated values
                                // set line color for the lines based on these values

                                _.forEach(target_links, function (obj) {
                                    var layer_max = layer.max();
                                    var layer_min = layer.min();
                                    var color_criteria = self.panel.layer.link.selected;
                                    var l = obj.link;
                                    l.count = count;
                                    avg = sum / count;
                                    var color_value = void 0;
                                    if (color_criteria === "Average") {
                                        color_value = (avg - layer_min) / (layer_max - layer_min) * 100;
                                    } else if (color_criteria === "Minimum") {
                                        color_value = (min - layer_min) / (layer_max - layer_min) * 100;
                                    } else if (color_criteria === "Maximum") {
                                        color_value = (max - layer_min) / (layer_max - layer_min) * 100;
                                    } else {
                                        color_value = (cur - layer_min) / (layer_max - layer_min) * 100;
                                    }

                                    // if mode === spectrum, set the line color based on % value
                                    // else if mode === opacity, set the line color with the card color and opacity based on % value
                                    // create a new property for links - l.lineOpacity
                                    // apply opacity to circuits in the single tube layer.
                                    var mode = self.panel.color.mode;
                                    var lineColor;
                                    var lineOpacity;
                                    if (mode === 'spectrum') {
                                        lineColor = self.scale.getColor(color_value);
                                        l.lineColor = lineColor;
                                        l.lineOpacity = 1;
                                    } else if (mode === 'opacity') {
                                        lineColor = self.panel.color.cardColor;
                                        lineOpacity = self.scale.getOpacity(color_value, self.opacity);
                                        l.lineColor = lineColor;
                                        l.lineOpacity = lineOpacity;
                                    } else if (mode === 'threshold') {
                                        lineColor = self.scale.getThresholdColor(color_value, self.t_colors, self.panel.legend.thresholds);
                                        l.lineColor = lineColor;
                                        l.lineOpacity = 1;
                                    }

                                    //check for AZ or ZA based on the endpoint the data was found at!
                                    if (l.endpoints[0].name === obj.endpoint) {
                                        l.az.name = l.endpoints[0].name;
                                        if (l.endpoints[0].label) l.az.label = l.endpoints[0].label;
                                        l.az.cur = color_value;
                                        l.azLineColor = lineColor;
                                        l.azLineOpacity = lineOpacity;
                                        l.az.max = self.toSI(max);
                                        l.az.min = self.toSI(min);
                                        l.az.sum = self.toSI(sum);
                                        l.az.avg = self.toSI(avg);
                                        l.az.now = self.toSI(cur);
                                        if (self.panel.arrows) l.arrow = 1;else l.arrow = 0;
                                    } else {
                                        l.za.name = l.endpoints[1].name;
                                        if (l.endpoints[1].label) l.za.label = l.endpoints[1].label;
                                        l.za.cur = color_value;
                                        l.zaLineColor = lineColor;
                                        l.zaLineOpacity = lineOpacity;
                                        l.za.max = self.toSI(max);
                                        l.za.min = self.toSI(min);
                                        l.za.sum = self.toSI(sum);
                                        l.za.avg = self.toSI(sum / count);
                                        l.za.now = self.toSI(cur);
                                        if (self.panel.arrows) l.arrow = 2;else l.arrow = 0;
                                    }
                                    if (!self.panel.twin_tubes) {
                                        if (l.az.cur != null && l.za.cur != null) {
                                            if (l.az.cur > l.za.cur) {
                                                l.lineColor = l.azLineColor;
                                                l.lineOpacity = l.azLineOpacity;
                                                l.arrow = 1;
                                            } else {
                                                l.lineColor = l.zaLineColor;
                                                l.lineOpacity = l.zaLineOpacity;
                                                l.arrow = 2;
                                            }
                                        }
                                    }
                                });
                            });
                        });

                        _.forEach(this.panel.layers, function (layer) {
                            if (typeof layer.active !== "function") {
                                return;
                            }
                            layer.update();
                        });
                    }
                }, {
                    key: 'toSI',
                    value: function toSI(num) {
                        if (this.panel.to_si === 0) {
                            num = num / panelDefaults.to_si;
                        } else {
                            num = num / this.panel.to_si;
                        }
                        return num.toFixed(2);
                    }
                }, {
                    key: 'onDataError',
                    value: function onDataError(err) {
                        this.dataRaw = [];
                    }
                }, {
                    key: 'onInitEditMode',
                    value: function onInitEditMode() {
                        this.addEditorTab('Options', 'public/plugins/globalnoc-networkmap-panel/editor.html', 2);
                        this.addEditorTab('Display', 'public/plugins/globalnoc-networkmap-panel/display_editor.html', 3);
                        tempArray = this.scale.displayColor(this.panel.colorScheme);
                    }
                }, {
                    key: 'onInitPanelActions',
                    value: function onInitPanelActions(actions) {
                        this.render();
                    }
                }, {
                    key: 'onOpacityLegendColor',
                    value: function onOpacityLegendColor(color) {
                        this.panel.color.cardColor = color;
                        this.render();
                    }
                }, {
                    key: 'onThresholdColorChange',
                    value: function onThresholdColorChange(index) {
                        var _this2 = this;

                        return function (color) {
                            _this2.panel.threshold_colors[index] = color;
                            _this2.render();
                        };
                    }
                }, {
                    key: 'onDownLinkChange',
                    value: function onDownLinkChange(color) {
                        this.panel.downLinkColor = color;
                        this.scale.setDownLinkColor(color);
                        this.render();
                    }
                }, {
                    key: 'onDefaultNodeColor',
                    value: function onDefaultNodeColor(color) {
                        this.panel.nodeFillColor = color;
                        this.render();
                    }
                }, {
                    key: 'updateThresholdDefaults',
                    value: function updateThresholdDefaults() {
                        var _this3 = this;

                        console.log(this.panel.legend.thresholds);
                        if (!this.panel.threshold_colors[0]) {
                            this.panel.threshold_colors[0] = "rgb(200,200,200)";
                        }
                        this.panel.legend.thresholds.forEach(function (threshold, idx) {
                            if (!_this3.panel.threshold_colors[idx + 1]) {
                                _this3.panel.threshold_colors[idx + 1] = "rgb(200,200,200)";
                            }
                        });
                    }
                }, {
                    key: 'jsonModal',
                    value: function jsonModal() {
                        var modalScope = this.$scope.$new(false);
                        modalScope.panel = this.panel;
                        appEvents.emit('show-modal', {
                            src: 'public/plugins/globalnoc-networkmap-panel/json_editor.html',
                            scope: modalScope
                        });
                    }
                }, {
                    key: 'addNewChoice',
                    value: function addNewChoice() {
                        var num = this.panel.choices.length + 1;
                        this.panel.choices.push(num);
                        this.layer_ids.push('');
                        this.panel.name.push('');
                        this.panel.mapSrc.push('');
                        this.panel.max.push('');
                        this.panel.min.push('');
                        //not sure
                        this.panel.size.push('');
                    }
                }, {
                    key: 'useValidator',
                    value: function useValidator(index) {
                        this.jsonModal();
                        var json = this.panel.mapSrc[index];
                        var json_obj = void 0;
                        try {
                            json_obj = JSON.parse(json);
                            this.json_content = JSON.stringify(json_obj, undefined, 2);
                        } catch (e) {
                            this.json_content = json;
                        }
                        this.json_index = index;
                    }
                }, {
                    key: 'saveToMapSrc',
                    value: function saveToMapSrc(index) {
                        if (index === null) return;
                        this.panel.mapSrc[index] = this.json_content;
                        this.render();
                    }
                }, {
                    key: 'removeChoice',
                    value: function removeChoice(index) {
                        this.panel.choices.splice(index, 1);
                        if (this.layer_ids[index]) {
                            $("#" + this.layer_ids[index]).remove();
                        }
                        this.layer_ids.splice(index, 1);
                        this.panel.name.splice(index, 1);
                        this.panel.mapSrc.splice(index, 1);
                        this.panel.max.splice(index, 1);
                        this.panel.min.splice(index, 1);
                        //Not sure
                        this.panel.size.splice(index, 1);
                    }
                }, {
                    key: 'display',
                    value: function display() {
                        this.colors = this.scale.displayColor(this.panel.colorScheme);
                        this.rgb_values = this.colors.rgb_values;
                        this.hex_values = this.colors.hex_values;
                        if (this.panel.legend.invert) {
                            _.reverse(this.hex_values);
                            _.reverse(this.rgb_values);
                        }
                    }
                }, {
                    key: 'displayOpacity',
                    value: function displayOpacity(options, legendWidth) {
                        this.opacity = this.scale.getOpacityScale(options, legendWidth);
                        if (this.panel.legend.invert) {
                            _.reverse(this.opacity);
                        }
                    }
                }, {
                    key: 'isSorted',
                    value: function isSorted(arr) {
                        var original = arr.toString();
                        arr.sort(function (a, b) {
                            return a - b;
                        });
                        return arr.toString() === original;
                    }
                }, {
                    key: 'displayThresholds',
                    value: function displayThresholds() {
                        this.t_colors = this.scale.getThresholdScale(this.panel.legend.thresholds, this.panel.threshold_colors);
                        return this.t_colors;
                    }
                }, {
                    key: 'getState',
                    value: function getState() {
                        this.show_legend = this.panel.legend.show;
                    }
                }, {
                    key: 'getHtml',
                    value: function getHtml(htmlContent) {
                        return this.custom_hover.parseHtml(htmlContent);
                    }
                }, {
                    key: 'isJson',
                    value: function isJson(str) {
                        try {
                            JSON.parse(str);
                        } catch (e) {
                            return false;
                        }
                        return true;
                    }
                }, {
                    key: 'link',
                    value: function link(scope, elem, attrs, ctrl) {
                        var self = this;
                        var firstRender = true;

                        ctrl.events.on('render', function () {
                            render();
                            ctrl.renderingCompleted();
                        });

                        function render() {
                            window.onbeforeunload = null;
                            if (!ctrl.recentData) {
                                return;
                            }

                            // delay first render
                            if (firstRender) {
                                firstRender = false;
                                setTimeout(render, 100);
                                return;
                            }

                            ctrl.panel.legend.adjLoadLegend = {
                                horizontal: true
                            };

                            var zoom = ctrl.panel.zoom;
                            var html_content = ctrl.getHtml(ctrl.panel.tooltip.content);
                            ctrl.panel.tooltip.content = html_content;
                            var node_content = ctrl.getHtml(ctrl.panel.tooltip.node_content);
                            ctrl.panel.tooltip.node_content = node_content;
                            if (ctrl.map_drawn == true) {

                                if (ctrl.panel.color.mode === 'opacity') {
                                    ctrl.displayOpacity(ctrl.panel.color, ctrl.map.width() * 0.4);
                                    ctrl.panel.legend.mode = ctrl.panel.color.mode;
                                    ctrl.panel.legend.opacity = ctrl.opacity;
                                    ctrl.panel.legend.card_color = ctrl.panel.color.cardColor;
                                } else if (ctrl.panel.color.mode === 'spectrum') {
                                    ctrl.display();
                                    ctrl.panel.legend.mode = ctrl.panel.color.mode;
                                    ctrl.panel.legend.legend_colors = ctrl.hex_values;
                                } else if (ctrl.panel.color.mode === 'threshold') {
                                    ctrl.panel.legend.mode = ctrl.panel.color.mode;
                                    if (ctrl.isSorted(ctrl.panel.legend.thresholds)) {
                                        var colors = ctrl.displayThresholds();
                                        ctrl.panel.legend.legend_colors = colors;
                                    } else {
                                        ctrl.t_colors = [];
                                        ctrl.panel.legend.thresholds = [];
                                        ctrl.panel.legend.legend_colors = [];
                                    }
                                }

                                ctrl.map.drawLegend(ctrl.panel.legend);
                                ctrl.map.validateSize();
                                if (!ctrl.panel.use_image) {
                                    zoom = ctrl.panel.zoom;
                                    if (zoom > 18) {
                                        zoom = 18;
                                    } else if (zoom < 1) {
                                        zoom = 1;
                                    }
                                    var latlng = [ctrl.panel.lat, ctrl.panel.lng];
                                    ctrl.map.setMapUrl(ctrl.panel.map_tile_url);
                                    ctrl.map.zoom({ zoom: zoom });
                                    ctrl.map.panTo({ latlng: latlng });
                                } else {
                                    zoom = ctrl.panel.zoom;
                                    if (zoom > 4) {
                                        zoom = 4;
                                    } else if (zoom < 2) {
                                        zoom = 2;
                                    }
                                    var _latlng = [0, 0];
                                    ctrl.map.setImageUrl(ctrl.panel.image_url, zoom);
                                    ctrl.map.zoom({ zoom: zoom });
                                    ctrl.map.panTo({ latlng: _latlng });
                                }

                                ctrl.map.toggleWeatherTile(ctrl.panel.weather_tile);

                                // Remove existing layers from DOM and the  map before adding new layers.
                                var all_layers = ctrl.layer_ids;
                                _.forEach(all_layers, function (layer) {
                                    if (layer !== '') {
                                        $("#" + layer).remove();
                                        ctrl.map.removeLayers(layer);
                                    }
                                });

                                ctrl.layer_ids = [];
                                ctrl.panel.layers = [];
                                for (var j = 0; j < ctrl.panel.choices.length; j++) {
                                    if (ctrl.panel.mapSrc[j] === null || ctrl.panel.mapSrc[j] === undefined) {
                                        return;
                                    }

                                    var networkLayer = ctrl.map.addNetworkLayer({
                                        name: ctrl.panel.name[j],
                                        max: ctrl.panel.max[j],
                                        min: ctrl.panel.min[j],
                                        lineWidth: ctrl.panel.size[j],
                                        twin_tubes: ctrl.panel.twin_tubes,
                                        mapSource: ctrl.panel.mapSrc[j],
                                        endpointColor: ctrl.panel.nodeFillColor,
                                        node_content: node_content,
                                        static_node_tooltip: ctrl.panel.static_node_tooltip
                                    });

                                    if (ctrl.panel.mapSrc[j] === null || ctrl.panel.mapSrc[j] === undefined || ctrl.panel.mapSrc[j] === "") {
                                        ctrl.layer_ids.push('');
                                        continue;
                                    }
                                    ctrl.layer_ids.push(networkLayer.layerId());
                                    ctrl.panel.layers.push(networkLayer);
                                    networkLayer.onInitComplete(function () {
                                        ctrl.process_data(self.recentData);
                                    });
                                    if (ctrl.isJson(ctrl.panel.mapSrc[j])) {
                                        ctrl.process_data(self.recentData);
                                    }
                                }
                                return;
                            }

                            if (!document.getElementById('container_map_' + ctrl.panel.id)) {
                                console.log("Container not found");
                            }

                            if (!ctrl.panel.use_image) {
                                zoom = ctrl.panel.zoom;
                                if (zoom > 18) {
                                    zoom = 18;
                                } else if (zoom <= 2) {
                                    zoom = 2;
                                }
                                var map = LeafletMap({ containerId: ctrl.containerDivId,
                                    bing_api_key: ctrl.panel.bing_api_key,
                                    map_tile_url: ctrl.panel.map_tile_url,
                                    image: ctrl.panel.use_image,
                                    lat: ctrl.panel.lat,
                                    lng: ctrl.panel.lng,
                                    zoom: zoom,
                                    twin_tubes: ctrl.panel.twin_tubes,
                                    tooltip: ctrl.panel.tooltip,
                                    weather_tile: ctrl.panel.weather_tile,
                                    node_content: node_content
                                });
                                ctrl.map = map;
                            } else {
                                zoom = ctrl.panel.zoom;
                                if (zoom > 4) {
                                    zoom = 4;
                                } else if (zoom <= 2) {
                                    zoom = 2;
                                }
                                var _map = LeafletMap({ containerId: ctrl.containerDivId,
                                    map_tile_url: ctrl.panel.map_tile_url,
                                    image: ctrl.panel.use_image,
                                    image_url: ctrl.panel.image_url,
                                    lat: 45,
                                    lng: -90,
                                    zoom: zoom,
                                    twin_tubes: ctrl.panel.twin_tubes,
                                    tooltip: ctrl.panel.tooltip
                                });
                                ctrl.map = _map;
                            }
                            ctrl.map_drawn = true;
                            if (ctrl.panel.color.mode === 'opacity') {
                                ctrl.displayOpacity(ctrl.panel.color, ctrl.map.width() * 0.4);
                                ctrl.panel.legend.mode = ctrl.panel.color.mode;
                                ctrl.panel.legend.opacity = ctrl.opacity;
                                ctrl.panel.legend.card_color = ctrl.panel.color.cardColor;
                            } else if (ctrl.panel.color.mode === 'spectrum') {
                                ctrl.display();
                                ctrl.panel.legend.mode = ctrl.panel.color.mode;
                                ctrl.panel.legend.legend_colors = ctrl.hex_values;
                            } else if (ctrl.panel.color.mode === 'threshold') {
                                ctrl.panel.legend.mode = ctrl.panel.color.mode;
                                if (ctrl.isSorted(ctrl.panel.legend.thresholds)) {
                                    var _colors = ctrl.displayThresholds();
                                    ctrl.panel.legend.legend_colors = _colors;
                                } else {
                                    ctrl.t_colors = [];
                                    ctrl.panel.legend.thresholds = [];
                                    ctrl.panel.legend.legend_colors = [];
                                }
                            }

                            if (ctrl.panel.legend.show) {
                                ctrl.map.drawLegend(ctrl.panel.legend);
                            }

                            if (ctrl.map === undefined) {
                                return;
                            }

                            for (var i = 0; i < ctrl.panel.choices.length; i++) {
                                if (ctrl.panel.mapSrc[i] === null || ctrl.panel.mapSrc[i] === undefined) {
                                    return;
                                }
                                var _networkLayer = ctrl.map.addNetworkLayer({
                                    name: ctrl.panel.name[i],
                                    max: ctrl.panel.max[i],
                                    min: ctrl.panel.min[i],
                                    twin_tubes: ctrl.panel.twin_tubes,
                                    lineWidth: ctrl.panel.size[i],
                                    mapSource: ctrl.panel.mapSrc[i],
                                    endpointColor: ctrl.panel.nodeFillColor,
                                    static_node_tooltip: ctrl.panel.static_node_tooltip
                                });
                                ctrl.layer_ids.push(_networkLayer.layerId());
                                ctrl.panel.layers.push(_networkLayer);
                                _networkLayer.onInitComplete(function () {
                                    ctrl.process_data(self.recentData);
                                });
                                if (ctrl.isJson(ctrl.panel.mapSrc[i])) {
                                    ctrl.process_data(self.recentData);
                                }
                            }
                            ctrl.map.validateSize();
                        }
                    }
                }]);

                return Atlas3;
            }(MetricsPanelCtrl));

            _export('Atlas3', Atlas3);

            Atlas3.templateUrl = 'module.html';
        }
    };
});
//# sourceMappingURL=atlas3.js.map
