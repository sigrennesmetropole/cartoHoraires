const cartohoraires = (function() {
    let config = mviewer.customComponents.cartohoraires.config;
    let options = mviewer.customComponents.cartohoraires.config.options;
    const mapWidth = options.mapWidth;
    const itemsRight = options.templateWidth + 2;
    let zacLayer = null;
    let load = false;
    let autocomplete;

    /**
     * Default style to highlight ZAC on center hover
     */
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

    /**
     * Create autocomplete request response for BAN API
     * @param {String} results 
     */
    function searchAddress(value) {
        if(value &&value.length > 3) {
            // Ajax request
            var xhr = new XMLHttpRequest();
            var url = 'https://api-adresse.data.gouv.fr/search/?limit=5&q='+ value + '&limit=5&lat=48.112131&lon=-1.67902';
            xhr.open('GET', url);
            xhr.onload = function() {
                if (xhr.status === 200 && xhr.responseText) {
                    var response = xhr.responseText.length ? JSON.parse(xhr.responseText) : null;
                    if(response && autocomplete.displayList) {
                        autocomplete.closeAllLists();
                        autocomplete.displayList(response.features);
                    }
                }
                else {
                    console.log('fail request');
                }
            };
            xhr.send();
        }
    }

    /**
     * Format autocomplete response for BAN API
     * @param {Array} results 
     */
    function formatAddressResult(results) {
        let listed = [];
        let html = [];
        results.forEach(e => {
            if(listed.indexOf(e.properties.label)<0){
                listed.push(e.properties.label);
                let coord = [e.properties.x, e.properties.y];
                coord = ol.proj.transform(coord,'EPSG:2154','EPSG:4326');
                html.push(`
                    <div style='overflow-x:hidden;'>
                        <a href="#" onclick='cartohoraires.searchBehavior("${coord.join(',')}")'>${e.properties.label}</a>
                        <input type='hidden' value='${coord}'>
                    </div>`
                );
            }
        })
        return html.join('');
    }

    /**
     * Create autocomplete request response for Open Data Rennes API - base-sirene-v3 dataset
     * @param {String} results 
     */
    function searchSIRENE(value) {
        if(value &&value.length > 3) {
            // Ajax request
            var xhr = new XMLHttpRequest();
            var url = `https://data.rennesmetropole.fr/api/records/1.0/search?q=denominationunitelegale = ${value}&rows=5&dataset=base-sirene-v3-ss`;
            xhr.open('GET', url);
            xhr.onload = function() {
                if (xhr.status === 200 && xhr.responseText) {
                    var response = xhr.responseText.length ? JSON.parse(xhr.responseText) : null;
                    if(response && response.records.length && autocomplete.displayList) {
                        autocomplete.closeAllLists();
                        autocomplete.displayList(response.records);
                    }
                }
                else {
                    console.log('fail request');
                }
            };
            xhr.send();
        }
    }

    /**
     * Format autocomplete response for SIRENE API
     * @param {Array} results 
     */
    function formatSIRENEesult(results) {
        let listed = [];
        let html = [];
        results.forEach(record => {
            if(listed.indexOf(record.fields.siren)<0){
                listed.push(record.fields.siren);
                let txt = [record.fields.denominationunitelegale, record.fields.libellecommuneetablissement].join(', ');
                let coord = record.geometry.coordinates.join(',');
                html.push(`
                    <div style='overflow-x:hidden;'>
                    <a href="#" onclick='cartohoraires.searchBehavior("${record.geometry.coordinates}")'>${txt}</a>
                    <input type='hidden' value='${coord}'>
                    </div>`
                );
            }
        })
        return html.join('');
    }

    /**
     * Check search type
     * @param {String} v  as input value
     */
    function search(v) {
        if($('#search-radio input:checked').val() === 'sirene') {
            return searchSIRENE(v);
        } else {
            return searchAddress(v);
        }
    }

    /**
     * Transform response to HTML as autocomplete list
     * @param {Object} r as JSON response from API
     */
    function formatInputResult(r) {
        if($('#search-radio input:checked').val() === 'sirene'){
            return formatSIRENEesult(r);
        } else {
            return formatAddressResult(r);
        }
    }

    /**
     * Init combo search item with search API
     */
    function initSearchItem() {
        if(document.getElementById('search-input') && !load) {
            load = true;
            autocomplete = new Autocomplete(document.getElementById('search-input'), $('.autocomplete-list'), search, formatInputResult);
            autocomplete.initListeners();
            autocomplete.initCloseAction();
        }
    }

    /**
     * From Sirene or Address API, we zoom on result feature
     * @param {ol.Feature} selected 
     */
    function displayResult(coordinates) {
        if(coordinates) {
            console.log(coordinates);
            mviewer.zoomToLocation(coordinates[0], coordinates[1], 16, null);
        }
    }

    /**
     * From geom we retrieve geoserver data by contains method
     * @param {String} wkt as geom string
     */
    function getDataByGeom(wkt) {
        $.post( 'https://public-test.sig.rennesmetropole.fr/geoserver/ows', {
            SERVICE: "WFS",
            VERSION: "1.1.0",
            REQUEST: "GetFeature",
            TYPENAME: `v_horaires`,
            OUTPUTFORMAT: "application/json",
            CQL_FILTER: `Intersects(shape, ${wkt})`
        }, function( results ) {
            if(results.features && results.features.length) {
                setInfoData(results.features);
            }
        }, "json");
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
                    let wktGeom = coordinatesToWKT(results.features[0].geometry.coordinates[0][0], 'POLYGON');

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

        request.type = 'POST';
        $.ajax(request);
    }

    /**
     * Search data by map extent
     */
    function getDataByExtent() {
        if(turf) {
            let extentMap = mviewer.getMap().getView().calculateExtent(mviewer.getMap().getSize());
            turfPolygon = turf.bboxPolygon(extentMap);

            let bboxFeature = new ol.format.GeoJSON().readFeatures(turfPolygon);
            let bboxCoord = bboxFeature[0].getGeometry().transform('EPSG:3857','EPSG:3948').getCoordinates()[0];
            getDataByGeom(coordinatesToWKT(bboxCoord, 'POLYGON'));
        }
    }

    /**
     * Init event to trigger behavior on map move end action
     */
    function initMoveBehavior() {
        mviewer.getMap().on('moveend', function() {
            cleanInfos();
            if($('#switch').is(':checked')) {
                getZacByPoint(mviewer.getMap().getView().getCenter());
            } else {
                getDataByExtent();
            }
        });
    }

    /**
     * Empty zac layer and clean text
     */
    function cleanInfos() {
        if(zacLayer) {
            zacLayer.getSource().clear(); // cremove all features
            $('#temp-infos').text('');
        }
    }

    /**
     * Display text to get features length infos
     * @param {Array} features 
     */
    function setInfoData(features) {
        $('#temp-infos').text('');
        $('#temp-infos').text('Nombre d\'objets à l\'écran : ' + features.length.toString());
    }

    /**
     * Create zac layer
     */
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

    function manageMir(){
        if($('#switch').is(':checked') && mir) {
            mir.activate();
        } else if(mir) {
            mir.deactivate();
        }
    }

    /**
     * Init toggle button behavior
     */
    function initSwitch() {
        $('#switch').click(function(e){
            if(zacLayer) {
                cleanInfos();
            }
            // manage center cross
            manageMir();
        })
    }

    /**
     * PUBLIC
    */

    return {
        init: () => {
            mviewer.getMap().once('postrender', m => {
                // create SRS 3948 use by sigrennesmetropole as default SRS
                initSRS3948();
                // get template to display info panel
                initTemplate();
                // force some mviewer's components display
                initDisplayComponents();
                // Display modal on mobile device
                initModalBehavior();
                // create ZAC layer
                initZacLayer();
                // init behavior on map move
                initMoveBehavior();
                // init get data by extent by default
                getDataByExtent();
                // manage mir status
                manageMir();
                // init seach - to test
                initSearchItem();
                
            });
            // to manage switch because this component is load late
            mviewer.getMap().on('postrender', m => {
                initSwitch();
                if(cartohoraires) {
                    initSearchItem();
                }
            });
            // search component init
            //initSearchItem();
        },

        searchBehavior : function(e) {
            if(e) {
                displayResult(e.split(',').map(a => parseFloat(a)));
            }
        }
    };
})();

new CustomComponent("cartohoraires", cartohoraires.init);