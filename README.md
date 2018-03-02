# Network Map Panel for Grafana
The Network Map Panel is a world map that provides the ability to monitor and visualize realtime traffic statistics. It uses timeseries data to represent traffic between nodes as circuits.

![Network Map](/src/images/network-map-main.png)

# Features
The Network Map Panel also provides the ability to configure different map options and display options. 

## Options Tab
### Biggest Features
* Map Options
  - Map URL: A valid map url should be provided so that the map loads with all the tiles. In the screenshot below, mapbox api is used to specify the map tiles. A valid access token is necessary for the mapbox API.
  - Hide Layers with no values: This option allows the user to hide any layers/circuits when there's no data returned for them.
  
![Map Options](/src/images/map-options.png)

* Layers: Different layers/circuits can be added to the map using this option. A valid *Map Source* is required to add each layer on to the map.

![Layer Options](/src/images/layer-options.png)
  
  Example map source json object.
  
```
{
  "results": [
    {
      "links": [
        {
          "endpoints": [
	    "enpoint1",
            "endpoint2"
          ],
          "path": [
            {
              "lon": "138.8671875",
              "order": "10",
              "lat": "36.0313317763319"
            },
            {
              "lon": "-122.335927373024",
              "order": "20",
              "lat": "47.5652166492485"
            }
          ],
          "name": "Link Name"
        }
      ],
      "endpoints": [
        {
          "pop_id": null,
          "lon": "139.853142695116",
          "real_lon": null,
          "real_lat": null,
          "name": "endpoint name",
          "lat": "35.7653023546885"
        },
        {
          "pop_id": null,
          "lon": "-122.335927373024",
          "real_lon": null,
          "real_lat": null,
          "name": "endpoint name",
          "lat": "47.5652166492485"
        }
      ]
    }
  ]
}
```
### Other Features
* Ability to set the map's center by providing the lat and long coordinates.
* Ability to specify the zoom level on the map. 

## Display Tab
Display tab provides different options for the user to customize the monitoring experience of the metrics on the map.
### Biggest Features
* Colors: Ability to change the color scheme for the layers on the map. Currently there are 19 different color schemes to choose from.

![colors-1](/src/images/colors-3-2.png)	![colors-2](/src/images/colors-2.png)	![colors-3](/src/images/colors-1.png)

![New Color Scheme](/src/images/network-map.png)

* Line Color: Ability to choose the behavior of the line colors based on metric. 

![Line Color](/src/images/line-color.png)

* Tooltip: Ability to customize the tooltip for the map. It also provides an option for the user to enter html to customize the look of the hover box.

![Tooltip Options](/src/images/tooltip-options.png)	![Tooltip](/src/images/custom-hover-box.png)

### Other Features
* Show or Hide Legend
* Show or Hide Tooltip

# Timeseries data for the Network Map
The Network Map Panel takes the timeseries data. An example of a query is as follows. Not that the query is for the GlobalNoc's TSDS Datasource.

`get link_name, node, aggregate(values.input, 60, average), aggregate(values.output, 60, average) between (1520024588, 1520024888) by link_name from interface where (link_name like ".+")`

Example of the response datalist that is used by the Network Map Panel to process and render the circuits is shown in the block below.

```
"results":[  
      {  
         "aggregate(values.input, 60, average)":[  
            [  
               1520025240,
               648834025.97
            ],
            [  
               1520025300,
               492937454
            ],
            [  
               1520025360,
               549512091.53
            ],
            [  
               1520025420,
               533842290.4
            ],
            [  
               1520025480,
               499130349.07
            ]
         ],
         "node":"node name",
         "link_name":"Link name",
      }, {...}
]
```

![TSDS Query](/src/images/tsds-query.png)

# Technology
The Network Map Panel makes use of the following libraries:
* Leaflet
* Atlas3
* D3
* Lodash
