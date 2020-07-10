mviewer.customLayers.etablissements = (function () {
    var id = 'etablissements';
    var data = 'apps/cartoHoraires/data/etablissements.geojson';
    
    function manyStyle (radius, size, color) {
      return [
        new ol.style.Style({
          image: new ol.style.Circle({
              radius: radius,
              fill: new ol.style.Fill({
                  color: color
              }),
              stroke: new ol.style.Stroke({
                width: 1.8,
                color: 'white'
              })
          })
        })
      ];
    };

    function pointStyle (color) {
      var style =  new ol.style.Style({
        image: new ol.style.Circle({
          radius: 5,
          fill: new ol.style.Fill({color: color}),
          stroke: new ol.style.Stroke({
            color: 'white', width: 1.5
          })
        })
      });
      return [style];
    }

    function clusterStyle (feature) {
      var size = feature.get('features').length;
      var max_radius = 25;
      var max_value = 500;
      var radius = 10 + Math.sqrt(size)*(max_radius / Math.sqrt(max_value));
      var color = '#53B3B8';

      if(size > 1) {
        return manyStyle(radius, size, color);
      } else {
        return pointStyle(color);
      }
    }

    var vectorLayer = new ol.layer.Vector({
      source: new ol.source.Cluster({
          distance: 0,
          source: new ol.source.Vector({
              url: data,
              format: new ol.format.GeoJSON()
          })
      }),
      style: clusterStyle
    });

    return {
        layer: vectorLayer
    }
  }());