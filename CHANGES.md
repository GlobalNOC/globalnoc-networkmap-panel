## GlobalNOC Networkmap Panel v1.1.3 - Tue Sep 3 2019

* Fixed the bug where map would not render completely in Grafana v6.3.X

## GlobalNOC Networkmap Panel v1.1.2 - Mon Apr 29 2019

* Fixed issue with `<color-picker>` in threshold legend mode

## GlobalNOC Networkmap Panel v1.1.1 - Wed Apr 24 2019

* Updated `<spectrum-picker>` to `<color-picker>` to fix issues in Grafana v6
* Fixed issue with map rendering in Grafana v6

## GlobalNOC Networkmap Panel v1.1.0 - Thu Mar 21 2019

### Bug Fixes

* Added max bounds to logical map.

## GlobalNOC Networkmap Panel v1.0.9 - Mon Feb 26 2019

### Features and Bug Fixes

* Added ability to use floating point thresholds.
* Added ability to select color for links that are down.
* Fixed the link hover to show up only when hovered over the links.
* Fixed the issue where all the endpoints would not render on both sides of the prime meridian.
* Fixed the issue where endpoints color would still show default color even when there's data.


## GlobalNOC Networkmap Panel v1.0.8 - Mon Nov 09 2018

### Bug Fixes

* Added support for changing default coloring on nodes.
* Added new Orange to Blue legend color scale.
* Minor stylistic changes to legend.


## GlobalNOC Networkmap Panel v1.0.7 - Mon Oct 22 2018

### Bug Fixes

* Fixed issue where readme is empty when the panel is installed on grafana
* Fixed issue where hover on far right side and far bottom side of the page was being cut off

## GlobalNOC Networkmap Panel v1.0.6 — Fri Oct 12 2018

### Features

* Added a Save & Exit option in the JSON Editor.
* Added the ability to zoom in smaller steps of 0.25.
* Added the ability to specify size for each layer in the editor
* Added the ability to scale the size of individual node markers by a multiplier when specified in the map source.
* Added the ability to use a different "shape" for node markers when specified in the map source (square, diamond, triangle, circle).
* Added the ability to add a "label" above node markers when specified in the map source.
* Adjusted legend text to be more readable.
* Fixed zooming and panning issues for both logical and geographic maps.
* Fixed issue where map bounds were being set incorrectly when switching logical map on/off.
* Fixed issue causing the tooltip to render when not hovering over a node or link.
* Fixed issue where tooltip was missing variables for current link usage ($input.now & $output.now).
* Fixed issue where adding initial JSON data for a layer in the JSON Editor would fail to save.

## GlobalNOC Networkmap Panel v1.0.5 — Tue Aug 28 2018

### Features

* Logical Map feature
* Twin Tubes feature
* Bug Fix for maxBounds being always set in logical maps

## GlobalNOC Networkmap Panel v1.0.4

### Features

* All new modal JSON editor that uses Grafana’s code-editor directive to provide better editing capabilities
* Adding ability to allow circuits without endpoints in the map source JSON
* Disabling invert legend feature for threshold legend 
* Updating UI elements for the map editor
* Repository restructure according to Grafana conventions

## GlobalNOC Networkmap Panel v1.0.3

### Features

* Updated Documentation
* Added JSON Editor to edit the map topology JSON
* Ability to load topology directly from JSON
* Cleaned up map editor UI
* Added Opacity scale, Log Scale and Invert legend features
* Ability to visualize node data, hover box for node, custom hover box template editor for node
* Ability to specify labels for endpoints in the map source topology JSON
* Updated options tab in the map editor
* Added brand new threshold legend feature

## GlobalNOC Networkmap Panel v1.0.2

### Features

* Ability to select custom color scheme (Spectrum) for adjacency links using the new color picker
* Ability to customize the hover box using the hover box template editor
* Fixing +/- button behavior in the map editor
* Removing default map tile url
* Fixing legend preview for Firefox
* Adding a scale factor option
* Fixed other minor bugs
* Updating the map automatically without having to save and reload the dashboard
* Added new metrics - Sum, and Count
* Ability to choose link color based on Min/Max/Average/Current values
* Ability to hide circuits with no values
* Code cleanup

## GlobalNOC Networkmap Panel v1.0.1

### Features

* Ability to toggle built in color schemes  (NEXRAD, Arebow, Candy, Colorblind Gradient)
* Disabled scroll wheel zoom
* Aligned legend to bottom left of the map
* Fixed the map to be container specific

## GlobalNOC Networkmap Panel v1.0.0

### Features

* Initial release
* Hover box for links
* Fixed arrow directions
