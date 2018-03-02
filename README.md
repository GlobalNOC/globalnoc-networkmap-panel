# Network Map Panel for Grafana
The Network Map Panel is a worldmap that provides the ability to monitor and visualize realtime traffic statistics. It uses timeseries data to represent traffic between nodes as circuits.

![Network Map](/src/images/network-map.png)

# Features
The Network Map Panel also provides the ability to configure different map options and display options. 

## Options Tab
Options tab has the following feautures:
* Map Options
  - Map URL: A valid map url should be provided so that the map loads with all the tiles. In the screenshot below, mapbox api is used to specify the map tiles. A valid access token is necessary for the mapbox API.
  - Latitude
  - Longitude
  - Zoom
  - Hide Layers with no values: This option allows the user to hide any layers/circuits when there's no data returned for them.
![Map Options](/src/images/map-options.png)
* Layers: Different layers/circuits can be added to the map using this option. A valid *Map Source* is required to add each layer on to the map.
  ![Layer Options](/src/images/layer-options.png)
  Example map source json object.
  
```{
  "results": [
    {
      "links": [
        {
          "endpoints": [
	    "TransPAC: Seattle to Tokyo 100GE input",
            "TransPAC: Seattle to Tokyo 100GE output"
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
          "name": "TransPAC: Seattle to Tokyo 100GE"
        }
      ],
      "endpoints": [
        {
          "pop_id": null,
          "lon": "139.853142695116",
          "real_lon": null,
          "real_lat": null,
          "name": "TOKY",
          "lat": "35.7653023546885"
        },
        {
          "pop_id": null,
          "lon": "-122.335927373024",
          "real_lon": null,
          "real_lat": null,
          "name": "SEAT-TP",
          "lat": "47.5652166492485"
        }
      ]
    }
  ]
}```

  
  


     
     

