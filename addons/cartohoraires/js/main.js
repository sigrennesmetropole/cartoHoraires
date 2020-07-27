const cartohoraires = (function() {
    let config = mviewer.customComponents.cartohoraires.config;
    let options = mviewer.customComponents.cartohoraires.config.options;
    const mapWidth = options.mapWidth;
    const itemsRight = options.templateWidth + 2;

    let requestLayer = options.requestLayer;

    let zacLayer = null;

    const zacHighlightStyle = new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0)',
        }),
        stroke: new ol.style.Stroke({
          color: 'rgb(255, 145, 0)',
          width: 2,
        })
    });

    /**
    * PRIVATE
    */

    function initSRS3948() {
        proj4.defs("EPSG:3948","+proj=lcc +lat_1=47.25 +lat_2=48.75 +lat_0=48 +lon_0=3 +x_0=1700000 +y_0=7200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
        ol.proj.proj4.register(proj4);
    }

    /**
     * Standardize request creation
     * @param {Object} infos as data params
     * @param {*} successFunc as callback function
     */
    function createRequest (infos, successFunc) {
        return {
            url: infos.url,
            data: infos.data,
            success: function(r) {
                infos.success(r);
            }
        };
    }

    /**
     * Request to call Mustache template from server or local path.
     */
    function initTemplate () {
        let req = createRequest({
            url: options.template,
            success: function(template) {
                config.template = template;
                displayTemplate(template);
            }
        });
        $.ajax(req);
    }
    /**
     * Method from Mviewer from features to template.
     * Manage display / hide and content from mustache template.
     * @param {Array} features - Array of OpenLayers features
     * @param {Object} configuration - Mviewer configuration
     */
    function displayTemplate(template) {
        // render mustache file
        var panelContent = Mustache.render(template);
        if (configuration.getConfiguration().mobile) {
            // hide classic panel
            $('.cartohoraires-panel').hide();
            // clean modal content
            $("#cartohoraires-modal .modal-body").children().remove();
            // add to modal
            $("#cartohoraires-modal .modal-body").append(panelContent);
        } else {
            // close modal if visible
            if ($("#cartohoraires-modal").is(':visible')) {
                $("#cartohoraires-modal").modal('toggle');
            }
            // clean classic panel
            $(".cartohoraires-panel .panel-body").children().remove();
            // add to classic panel
            $(".cartohoraires-panel .panel-body").append(panelContent);
        }
    }

    /**
     * Display modal on mobile device only and display it only if a user clic on button
     */
    function initModalBehavior() {
        $('#mobilebtn-el').on('click', function() {
            $("#cartohoraires-modal").modal('toggle');
        });
    }

    /**
     * Force display component for desktop device only
     */
    function initDisplayComponents() {
        if (!configuration.getConfiguration().mobile) {
            $('#map').attr('style', `width:${mapWidth}% !important`);
            $('#zoomtoolbar').attr('style', `right: ${itemsRight}% !important`);
            $('#toolstoolbar').attr('style', `right: ${itemsRight}% !important`);
        }
    }

    function initSearchItem() {
        mviewer.getMap().on('postrender', m => {
            $('.search-input').autoComplete({
                resolver: 'custom',
                minLength: 3,
                resolverSettings: {
                    requestThrottling: 50
                },
                formatResult: function (record) {
                    let txt = [record.fields.denominationunitelegale, record.fields.libellecommuneetablissement].join(', ');
                    let rec = JSON.stringify(record);
                    let str = `<div style='overflow-x:hidden;'>
                                    <a href="#" onclick='cartohoraires.searchBehavior(${rec})'>${txt}</a>
                                </div>`;
                    return {
                        value: record.datasetid,
                        text: txt,
                        html: [str]
                    };
                },
                noResultsText: '<div style="overflow-x:hidden"><span>Aucun résultat - Merci de sélectionner une adresse<span></div>',
                events: {
                    search: function (qry, callback) {
                        // let's do a custom ajax call
                        $.ajax(
                            'https://data.rennesmetropole.fr/api/records/1.0/search/',
                            {
                                data: {
                                'dataset':'base-sirene-v3-ss',
                                'q' : `denominationunitelegale = ${qry}`,
                                'rows': 5
                                }
                            }
                        ).done(function (res) {
                            callback(res.records);
                        });
                    }
                }
            });
        });
        $('.bootstrap-autocomplete.dropdown-menu').css('width','100%');
    }

    /**
     * From Sirene or Address API, we zoom on result feature
     * @param {ol.Feature} selected 
     */
    function displayResult(selected) {
        if(selected) {
           var geom = selected.geometry.coordinates;
           mviewer.zoomToLocation(geom[0], geom[1], 16, null);
        }
    }

    /**
     * From geom we retrieve geoserver data by contains method
     * @param {String} wkt as geom string
     */
    function getDataByGeom(wkt) {
        let request = createRequest({
            url: 'https://public-test.sig.rennesmetropole.fr/geoserver/ows',
            data: {
                SERVICE: "WFS",
                VERSION: "1.1.0",
                REQUEST: "GetFeature",
                TYPENAME: `v_horaires`,
                OUTPUTFORMAT: "application/json",
                CQL_FILTER: `Intersects(shape, ${wkt})`
            },
            success: function (results) {
                if(results.features && results.features.length) {
                    setInfoData(results.features);
                }
            }
        });

        request.type = 'GET';
        $.ajax(request);
    };

    /**
     * Transform coordinates Array to WKT
     * @param {Array} coord 
     * @param {String} Type as POLYGON, POINT or other available openLayers Geom Type
    */
    function coordinatesToWKT(coord, type) {
        return `${type}((${coord.map(e => `${e[0]} ${e[1]}`).join(',')}))`;
    };

    /**
     * From Map center, we retrieve geoserver feature by intersection method
     * @param {Array} center 
     */
    function getZacByPoint(center) {
        if(!center.length) {
            return;
        }
        var cc48Center = ol.proj.transform([center[0],center[1]], 'EPSG:3857', 'EPSG:3948');
        let request = createRequest({
            url: 'https://public.sig.rennesmetropole.fr/geoserver/ows',
            data: {
                SERVICE: "WFS",
                VERSION: "1.1.0",
                REQUEST: "GetFeature",
                TYPENAME: `eco_comm:v_za_terminee`,
                OUTPUTFORMAT: "application/json",
                CQL_FILTER: `Intersects(shape, POINT(${cc48Center[0]} ${cc48Center[1]}))`
            },
            success: function (results) {
                if(results.features && results.features.length) {
                    // get geom coordinates as string
                    let wktGeom = coordinatesToWKT(results.features[0].geometry.coordinates[0][0], 'POLYGON')

                    // add to layer to highlight feature
                    let zac3857 = new ol.Feature(
                        new ol.geom.Polygon(results.features[0].geometry.coordinates[0]).clone().transform('EPSG:3948','EPSG:3857')
                    );
                    zacLayer.getSource().clear(); // cremove all features
                    zacLayer.getSource().addFeature(zac3857); // add this
                    
                    // get data by geoserver request
                    getDataByGeom(wktGeom);
                }
            }
        });

        request.type = 'GET';
        $.ajax(request);
    }

    function getDataByExtent() {
        let extentMap = mviewer.getMap().getView().calculateExtent(mviewer.getMap().getSize());
        turfPolygon = turf.bboxPolygon(extentMap);

        let bboxFeature = new ol.format.GeoJSON().readFeatures(turfPolygon);
        let bboxCoord = bboxFeature[0].getGeometry().transform('EPSG:3857','EPSG:3948').getCoordinates()[0];
        getDataByGeom(coordinatesToWKT(bboxCoord, 'POLYGON'));
    }

    /**
     * Init event to trigger behavior on map move end action
     */
    function initMoveBehavior() {
        mviewer.getMap().on('moveend', function() {
            zacLayer.getSource().clear(); // cremove all features
            $('#temp-infos').text('');

            if($('#switch').is(':checked')) {
                getZacByPoint(mviewer.getMap().getView().getCenter());
            } else {
                getDataByExtent();
            }
        });
    }

    function setInfoData(features) {
        $('#temp-infos').text('');
        $('#temp-infos').text('Nombre d\'objets à l\'écran : ' + features.length.toString());
    }

    function initZacLayer() {
        // display zac layer temporary
        var data = 'https://public.sig.rennesmetropole.fr/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=eco_comm:v_za_terminee&outputFormat=application%2Fjson&srsname=EPSG:3857';
        var zacTempLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
                url: data,
                format: new ol.format.GeoJSON()
            })
        });
        mviewer.getMap().addLayer(zacTempLayer);


        if(!zacLayer) {
            zacLayer = new ol.layer.Vector({
                source: new ol.source.Vector({
                  format: new ol.format.GeoJSON()
                }),
                style: function (feature) {
                  return zacHighlightStyle;
                }
            });
            if(mviewer.getMap()) {
                mviewer.getMap().addLayer(zacLayer);
            }
        }
    }

    /**
     * PUBLIC
    */

    return {
        init: () => {
            mviewer.getMap().once('postrender', m => {
                initSRS3948();
                initTemplate();
                initDisplayComponents();
                initModalBehavior();
                initZacLayer();
                initMoveBehavior();
                getDataByExtent();
            });
            initSearchItem();
        },
        searchBehavior : function(e) {
            if(e) {
                displayResult(e);
            }
        }
    };
})();

new CustomComponent("cartohoraires", cartohoraires.init);