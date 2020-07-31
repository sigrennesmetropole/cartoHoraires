mviewer.customLayers.etablissements = (function () {
    let id = 'etablissements';
    let data = 'https://public-test.sig.rennesmetropole.fr/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=v_horaires&outputFormat=application%2Fjson&srsname=EPSG:3857';

    var initialData = [];
    let receiptData = [];

    let newSource;  
  
    /**
     * To style cluster
     * @param {Number} radius 
     * @param {String} color 
     */
    function manyStyle (radius, color) {
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

    /**
     * Style uniq feature
     * @param {String} color 
     */
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

    /**
     * To detect and style cluster features
     * @param {ol.Feature} feature
     */
    function clusterStyle (feature) {
      var size = feature.get('features').length;
      var max_radius = 25;
      var max_value = 500;
      var radius = 10 + Math.sqrt(size)*(max_radius / Math.sqrt(max_value));
      radius = radius * 0.4;
      var color = '#53B3B8';

      if(size > 1) {
        return manyStyle(radius, color);
      } else {
        return pointStyle(color);
      }
    }

    /**
     * Convert mintues number to hh:mm:ssZ format
     * @param {Integer} n as minutes number
     */
    var convertMinToZ = function (n) {
        var num = n;
        var hours = (num / 60);
        var rhours = Math.floor(hours);
        var minutes = (hours - rhours) * 60;
        var rminutes = Math.round(minutes);
        rminutes = rminutes == 0 ? '00' : rminutes;
        rhours = rhours > 10 ? rhours : `0${rhours}`;
        return rhours + ':' + rminutes + ':00Z';
    }

    /**
     * create vector source, cluster source and vector layer
     */
    var vectorSource = new ol.source.Vector({
      url: data,
      format: new ol.format.GeoJSON()
    });

    var vectorLayer = new ol.layer.Vector({
      source: new ol.source.Cluster({
          distance: 0,
          source: vectorSource
      }),
      style: clusterStyle
    });
    

    /**
     * Update cluster source
     */
    var setSource = function() {
      // create new source
      if(!$('.btn-day.btn-selected').attr('day') || !cartohoraires.getTransportValue() || !$('#timeSlider').val()) {
        return
      }

      var url = data + 
      '&CQL_FILTER='+
      `transport_lib IN ('${cartohoraires.getTransportValue()}')` + 
      ` AND jour IN ('${$('.btn-day.btn-selected').attr('day')}')` /*+
      ` AND horaire IN ('${convertMinToZ($('#timeSlider').val())}')`*/;

      newSource = new ol.source.Cluster({
        distance: 0,
        source: new ol.source.Vector({
          url: url,
          format: new ol.format.GeoJSON()
        })
      });
      // parse feature from initial vector
      // update cluster with new source and last 7days features
      vectorLayer.setSource(newSource);
      vectorLayer.once('postrender', function(e) {
        receiptData = newSource.getSource().getFeatures();
        vectorLayer.getSource().getSource().getFeatures().forEach(e => {
          if(e.getProperties().horaire != convertMinToZ($('#timeSlider').val())) { // remove features without correct time
            vectorLayer.getSource().getSource().removeFeature(e);
          }
        });
      })
    }
    
    /**
     * Init event on layer ready state and remove it after process with unByKey ol method
     */
    var evt = vectorSource.on('change', function(e) {
      // only for ready state
      if(cartohoraires && cartohoraires.setTransportType) {
        var type = vectorSource.getFeatures().map(e => e.getProperties().transport_lib);
        cartohoraires.setTransportType([...new Set(type)]);
        if(vectorSource.getFeatures().length) {
          initialData = vectorSource.getFeatures();
        }
        ol.Observable.unByKey(evt);
      }
    });
    return {
        layer: vectorLayer,
        getInitialData: () => {return initialData},
        getReceiptData: () => {return receiptData},
        setSource: setSource
    }
  }());