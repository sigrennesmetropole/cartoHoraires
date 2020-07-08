mviewer.customLayers.etablissements = (function () {
    var id = 'etablissements';
    var data = 'apps/cartoHoraires/data/etablissements.geojson'
   
    var vectorSource = new ol.source.Vector({
        format: new ol.format.GeoJSON(),
        url : data
    });

    var vectorLayer = new ol.layer.Vector({
        source: vectorSource
      });

    return {
      layer: vectorLayer
    }
  }());