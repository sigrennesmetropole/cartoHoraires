mviewer.customLayers.etablissements = (function() {
    let id = 'etablissements';
    let data = 'https://public-test.sig.rennesmetropole.fr/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=v_horaires&outputFormat=application%2Fjson&srsname=EPSG:3857';

    // we need all initial data set to avoid to call geo server on each filter
    // we user Fuse engine to filter data on fields
    let initialData = [];

    // we use this data set to create grah according to date and transport filters
    let receiptData = [];

    /**
     * To style cluster
     * @param {Number} radius 
     * @param {String} color 
     */
    function manyStyle(radius, color, size = null) {
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
                }),
                text: new ol.style.Text({
                    text: size.toString(),
                    fill: new ol.style.Fill({
                        color: '#fff'
                    }),
                })
            })
        ];
    };

    /**
     * Style uniq feature
     * @param {String} color 
     */
    function pointStyle(color) {
        let style = new ol.style.Style({
            image: new ol.style.Circle({
                radius: 4,
                fill: new ol.style.Fill({
                    color: color
                }),
                stroke: new ol.style.Stroke({
                    color: 'white',
                    width: 1.5
                })
            })
        });
        return [style];
    }

    /**
     * To detect and style cluster features
     * @param {ol.Feature} feature
     */
    function clusterStyle(feature) {
        let size = feature.get('features').length;
        let max_radius = 25;
        let max_value = 500;
        let radius = 10 + Math.sqrt(size) * (max_radius / Math.sqrt(max_value));
        radius = radius * 0.7;
        let color = '#53B3B8';

        if (size > 1) {
            return manyStyle(radius, color, size);
        } 
        /*else {
            return pointStyle(color);
        }*/
    }

    /**
     * Convert mintues number to hh:mm:ssZ format
     * @param {Integer} n as minutes number
     */
    let convertMinToZ = function(n) {
        let num = n;
        let hours = (num / 60);
        let rhours = Math.floor(hours);
        let minutes = (hours - rhours) * 60;
        let rminutes = Math.round(minutes);
        rminutes = rminutes == 0 ? '00' : rminutes;
        rhours = rhours > 10 ? rhours : `0${rhours}`;
        return rhours + ':' + rminutes;
    }

    /**
     * create vector source, cluster source and vector layer
     */
    let vectorSource = new ol.source.Vector({
        url: data,
        format: new ol.format.GeoJSON()
    });

    let vectorLayer = new ol.layer.Vector({
        source: new ol.source.Cluster({
            distance: 20,
            source: vectorSource
        }),
        style: clusterStyle,
        zIndex: 3
    });

    /**
     * Round a time according to step value. 
     * Ex : 08:10 ==> 08:00
     * @param {String} time 
     * @param {Integer} step
     */
    function roundTime(time, step) {
        let start = moment(time,'HH:mm'); 
        let remainder = start.minute() % step;
        return moment(start).subtract(remainder, "minutes").format("HH:mm");
    }

    /**
     * We search field vaule in a feature dataset
     * @param {String} field to filter
     * @param {String} value to search
     * @param {Array} dataSet features dataset used
     */
    function filterDataset(field, value, dataSet) {
        if (!value) return;
      // filter from initialData set with simple conditions
        let filter;
        if(field === 'horaire') {
            filter = dataSet.filter(e => roundTime(e.getProperties()[field],15) == value);
        } else {
            filter = dataSet.filter(e => e.getProperties()[field] == value);
        }
        result = filter.map(e => e.getProperties().id);
        result = initialData.filter(e => result.indexOf(e.getProperties().id) > -1);
        vectorLayer.getSource().getSource().clear();
        vectorLayer.setVisible(true);
        vectorLayer.getSource().getSource().addFeatures(result);
    }

    /**
     * Update cluster source
     */
    let setSource = function() {
        // create new source
        if (!$('.btn-day.btn-selected').attr('day') || !$('#timeSlider').val()) return;

        filterDataset('jour', $('.btn-day.btn-selected').attr('day'), initialData);
        filterDataset('transport_lib', cartohoraires.getTransportValue(), vectorLayer.getSource().getSource().getFeatures());
        // we need features before time filter to create chart
        // because we display all data for each hours
        receiptData = vectorLayer.getSource().getSource().getFeatures();
        // now we could filter with time slider
        filterDataset('horaire', convertMinToZ($('#timeSlider').val()), vectorLayer.getSource().getSource().getFeatures());
    }

    // allow to zoom to extent with layer param function directly
    vectorLayer.zoomToExtent = function() {
        if (vectorLayer.getSource().getFeatures().length > 0) {
            let map = mviewer.getMap();
            let extent = vectorLayer.getSource().getExtent();
            map.getView().fit(extent, map.getSize());
            map.getView().setZoom(map.getView().getZoom()-1);
        }
    }

    function load(zte = false, zoom = null, fn = null, isFirst=false, evt) {
        if(zte) vectorLayer.zoomToExtent();
        if(zoom) mviewer.getMap().getView().setZoom(zoom);
        if (cartohoraires && cartohoraires.setTransportType && cartohoraires.initOnDataLoad) {
            let type = vectorSource.getFeatures().map(e => e.getProperties().transport_lib);
            cartohoraires.setTransportType([...new Set(type)]);
            if (vectorSource.getFeatures().length > 0) {
                initialData = vectorSource.getFeatures();
            }                
            //cartohoraires.initOnDataLoad(isFirst);
            setTimeout(function(){cartohoraires.initOnDataLoad(isFirst);},500)
            document.addEventListener('ondataloadEvt', function() {
                //if(zte) vectorLayer.zoomToExtent();
                //if(zoom) mviewer.getMap().getView().setZoom(zoom);
                if(fn) {
                    fn(evt);
                }
            })
            
        }
        else {
            //vectorLayer.getSource().refresh();
            //if(zte) vectorLayer.zoomToExtent();
            //if(zoom) mviewer.getMap().getView().setZoom(zoom);
            if(fn) {
                fn(evt);
            }
        }
    }

    /**
     * Init event on layer ready state and remove it after process with unByKey ol method
    */
    let createPostRenderEvt = function(zte = false, zoom = null, fn = null, isFirst=false) {
        let evt = vectorLayer.once('postrender', function(e) {

            /*if(isFirst && typeof cartohoraires === 'undefined') {
                document.addEventListener('cartohoraires-componentLoaded', function() {
                    load(zte, zoom, fn, isFirst,e);
                })
            } else {
                load(zte, zoom, fn, isFirst,e);
            }
            ol.Observable.unByKey(evt);
            */
            if (vectorLayer.getSource().getState() == 'ready') {
                if(isFirst && typeof cartohoraires === 'undefined') {
                    document.addEventListener('cartohorairesInit', function() {
                        load(zte, zoom, fn, isFirst,e);
                    })
                } else {
                    load(zte, zoom, fn, isFirst,e);
                }
                ol.Observable.unByKey(evt);
            }
        })
    };

    function updateLayer(toExtent = false, zoom = null, callback = null) {
        createPostRenderEvt(toExtent, zoom, callback);
        vectorLayer.getSource().getSource().refresh();
    }
    createPostRenderEvt(true, null, null, true);
    return {
        layer: vectorLayer,
        getInitialData: () => {
            return initialData
        },
        getReceiptData: () => {
            return receiptData
        },
        setSource: setSource,
        updateLayer: updateLayer
    }
}());
