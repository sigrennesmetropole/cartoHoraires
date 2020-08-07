const cartohoraires = (function() {
    let config = mviewer.customComponents.cartohoraires.config;
    let options = mviewer.customComponents.cartohoraires.config.options;
    const mapWidth = options.mapWidth;
    const itemsRight = options.templateWidth + 2;
    let zacLayer = null;
    let allZacLayer = null;
    let load = false;
    let autocomplete;
    let rvaConf;

    let transportType = [];
    let transportSelectEmpty = true;
    let transportSelected = '';

    let btnInit = false;
    let sourceInitialized = false;

    let slider;
    let graph;

    /**
     * PRIVATE
     */

    /**
     * Default style to highlight ZAC on center hover
     */
    const zacHighlightStyle = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0)',
        }),
        stroke: new ol.style.Stroke({
            color: 'rgba(255, 145, 0)',
            width: 2,
        })
    });

    const zacBaseStyle = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0)',
        }),
        stroke: new ol.style.Stroke({
            color: 'rgba(62,158,206)',
            width: 2,
        })
    });


    /**
     * Register SRS 3948 to OL
     */
    function initSRS3948() {
        proj4.defs("EPSG:3948", "+proj=lcc +lat_1=47.25 +lat_2=48.75 +lat_0=48 +lon_0=3 +x_0=1700000 +y_0=7200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
        ol.proj.proj4.register(proj4);
    }

    /**
     * Standardize request creation
     * @param {Object} infos as data params
     * @param {*} successFunc as callback function
     */
    function createRequest(infos) {
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
    function initTemplates() {
        // main panel contain
        const promiseMain = new Promise((resolve, reject) => {
            let req = createRequest({
                url: options.template,
                success: function(template) {
                    resolve({
                        type:'panel',
                        template
                    });
                }
            });
            $.ajax(req);
        });
        // btn to hide or show input form
        const promiseFormBtn = new Promise((resolve, reject) => {
            let req = createRequest({
                url: options.templateFormBtn,
                success: function(template) {
                    resolve({
                        type:'formBtn',
                        template
                    });
                }
            });
            $.ajax(req);
        });

        // input form
        const promiseForm = new Promise((resolve, reject) => {
            let req = createRequest({
                url: options.templateForm,
                success: function(template) {
                    resolve({
                        type:'form',
                        template
                    });
                }
            });
            $.ajax(req);
        });

        // if all ajax request  resolve 
        Promise.all([promiseMain, promiseFormBtn, promiseForm]).then( (value) => {
            value.forEach(e => {
                switch(e.type) {
                    case 'panel':
                        displayPanel(e.template);
                        break;
                    case 'form':
                        $('#main').prepend(e.template);
                        break;
                    case 'formBtn':
                        $(document.getElementById('iconhelp').parentNode).prepend(e.template);
                        break;
                    default:
                        break;
                }
            })
        })
    }

    /**
     * Method from Mviewer from features to template.
     * Manage display / hide and content from mustache template.
     * @param {Array} features - Array of OpenLayers features
     * @param {Object} configuration - Mviewer configuration
     */
    function displayPanel(template) {
        // we use CSS to add others rules about nativ Mviewer UI

        // render mustache file
        var panelContent = template;
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
        $('#iconhelp').empty();
        $('#iconhelp').append('<i class="fas fa-home"></i>');

        if (!configuration.getConfiguration().mobile) {
            $('#map').attr('style', `width:${mapWidth}% !important`);
            $('#zoomtoolbar').attr('style', `right: ${itemsRight}% !important`);
            $('#toolstoolbar').attr('style', `right: ${itemsRight}% !important`);
            $('.cartohoraires-panel').attr('style', `width: ${options.templateWidth}% !important`);
        }
    }

    /**
     * Create autocomplete request response for BAN API
     * @param {String} results 
     */
    function searchRVA(value) {
        if (value && value.length > 3) {
            let promises = searchRM.request(rvaConf, value);
            Promise.all(promises).then(function(allResult) {
                let data = searchRM.getAutocompleteData(allResult, value, false);
                autocomplete.closeAllLists();
                autocomplete.displayList(data);
            });
        }
    }

    /**
     * Return RVA autocompletion content
     * @param {String} text
     * @param {String} coord as xxx.xxx,yyy.yyy expected by select func.
     */
    function getLiRVA(text, coord) {
        coord = ol.proj.transform(coord.split(','), 'EPSG:' + options.defaultSRS, 'EPSG:4326').join(',');
        return `<div style='overflow-x:hidden;'>
        <a href="#" onclick='cartohoraires.select("${coord}","${text}")'>${text}</a>
        <input type='hidden' value='${coord}'>
        </div>`;
    }

    /**
     * Return RVA list Title
     * @param {String} text 
     */
    function getLiRVATitle(text) {
        return `<h5 style='overflow-x:hidden; margin-bottom:5px; margin-top:5px;'>
            <strong>${text}</strong>
        </h5>`
    }

    /**
     * Format autocomplete response for RVA API
     * @param {Array} results 
     */
    function formatRvaResult(results) {
        let listed = [];
        let htmCities = [];
        let htmLane = [];
        let htmlAddress = [];
        let coord;

        Object.keys(results).forEach(type => {
            if (!results[type].length) {
                return
            }
            results[type][0].forEach(record => {
                switch (type) {
                    case 'address':
                        if (!htmlAddress.length) {
                            htmlAddress.push(
                                getLiRVATitle('Adresses')
                            );
                        }
                        listed.push(record.addr3);
                        coord = [record.x, record.y].join(',');
                        htmlAddress.push(
                            getLiRVA(record.addr3, coord)
                        );
                        break;
                    case 'lane':
                        if (!htmLane.length) {
                            getLiRVATitle('Voies');
                        }
                        listed.push(record.name4);
                        coord = record.upperCorner.replace(' ', ',');
                        htmLane.push(
                            getLiRVA(record.name4, coord)
                        );
                        break;
                    case 'cities':
                        if (!htmCities.length) {
                            htmCities.push(
                                getLiRVATitle('Communes')
                            )
                        }
                        listed.push(record.nameindex);
                        coord = record.upperCorner.replace(' ', ',');
                        htmCities.push(
                            getLiRVA(record.nameindex, coord)
                        );
                        break;
                }
            })
        });
        let result = htmlAddress.concat(htmCities, htmLane).join('');
        if (!result.length) return '<span style="padding-top:5px;padding-bottom:5px">Aucun résultat...</span>';
        return htmlAddress.concat(htmCities, htmLane).join('');
    }

    /**
     * Create autocomplete request response for Open Data Rennes API - base-sirene-v3 dataset
     * @param {String} results 
     */
    function searchSIRENE(value) {
        if (value && value.length > 3) {
            // Ajax request
            var xhr = new XMLHttpRequest();
            var url = `${options.open_data_service}?q=denominationunitelegale = ${value}&rows=5&dataset=${options.sirene_table}`;
            xhr.open('GET', url);
            xhr.onload = function() {
                if (xhr.status === 200 && xhr.responseText) {
                    var response = xhr.responseText.length ? JSON.parse(xhr.responseText) : null;
                    if (response && response.records.length && autocomplete.displayList) {
                        autocomplete.closeAllLists();
                        autocomplete.displayList(response.records);
                    }
                } else {
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
            if (listed.indexOf(record.fields.siren) < 0) {
                listed.push(record.fields.siren);
                let txt = [record.fields.denominationunitelegale, record.fields.libellecommuneetablissement].join(', ');
                let coord = record.geometry.coordinates.join(',');
                html.push(`
                    <div style='overflow-x:hidden;'>
                    <a href="#" onclick='cartohoraires.select("${record.geometry.coordinates}","${txt}")'>${txt}</a>
                    <input type='hidden' value='${coord}'>
                    </div>`);
            }
        })
        return html.join('');
    }

    /**
     * Check search type
     * @param {String} v  as input value
     */
    function search(v) {
        if ($('#search-radio input:checked').val() === 'sirene') {
            return searchSIRENE(v);
        } else {
            //return searchAddress(v);
            return searchRVA(v);
        }
    }

    /**
     * Transform response to HTML as autocomplete list
     * @param {Object} r as JSON response from API
     */
    function formatInputResult(r) {
        if ($('#search-radio input:checked').val() === 'sirene') {
            return formatSIRENEesult(r);
        } else {
            //return formatAddressResult(r);
            return formatRvaResult(r);
        }
    }

    /**
     * Get config file to get API key and others RVA params
     * @param {String} conf 
     */
    var initRvaConf = function(conf) {
        $.getJSON(conf, function(response) {
            if (response) {
                rvaConf = response;
            }
        });
    }

    /**
     * Init combo search item with search API
     */
    function initSearchItem() {
        if (document.getElementById('search-input') && !load) {
            let RVAConfigFile = options.rvaConfigFile || configuration.getConfiguration().searchparameters.searchRMConf;
            if (RVAConfigFile) {
                initRvaConf(RVAConfigFile)
            }

            load = true;
            autocomplete = new Autocomplete(document.getElementById('input-autocomplete'), $('.autocomplete-list'), search, formatInputResult);
            autocomplete.initListeners();
            autocomplete.initCloseAction();
        }
    }

    /**
     * From Sirene or Address API, we zoom on result feature
     * @param {ol.Feature} selected 
     */
    function displayResult(coordinates) {
        if (coordinates) {
            mviewer.zoomToLocation(coordinates[0], coordinates[1], 16, null);
        }
    }

    /**
     * Set info about presents and absents people
     * @param {String} present value
     * @param {String} absent value
     */
    function setAbsentPresent(present=false, absent=false) {
        $('#input-number').text(present || ' - ');
        $('#absent-number').text(absent || ' - ');
    }
    /**
     * From geom we retrieve geoserver data by contains method
     * @param {String} wkt as geom string
     * @param {Array} coordinates 
     */
    function getDataByGeom(type, coordinates) {
        // use turf.js
        var data = mviewer.customLayers.etablissements.getReceiptData();
        let polygon = turf.polygon([coordinates]);
        let containsData = [];
        if (data.length) {
            data.forEach(e => {
                let point = turf.point(e.getProperties().geometry.getCoordinates());
                if (turf.booleanContains(polygon, point)) {
                    containsData.push(e);
                };
            });
        }
        if (!containsData.length) {
            cleanInfos(type);
            setAbsentPresent();
        }
        reloadChart(containsData);
        // get absent
        // get present and absent
        setAbsentPresent(containsData.length, containsData.filter(a => a.getProperties().absence).length);
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
        if (!center.length) {
            return;
        }
        var cc48Center = ol.proj.transform([center[0], center[1]], 'EPSG:3857', 'EPSG:' + options.defaultSRS);
        let request = createRequest({
            url: options.geoserver,
            data: {
                SERVICE: "WFS",
                VERSION: "1.1.0",
                REQUEST: "GetFeature",
                TYPENAME: options.za_layer,
                OUTPUTFORMAT: "application/json",
                CQL_FILTER: `Intersects(shape, POINT(${cc48Center[0]} ${cc48Center[1]}))`
            },
            success: function(results) {

                if (results.features && results.features.length) {

                    if (results.features[0].properties.nomza) {
                        $('#zac-info').text('');
                        $('#zac-info').text(results.features[0].properties.nomza);
                    }
                    // add to layer to highlight feature
                    let zac3857 = new ol.Feature(
                        new ol.geom.Polygon(results.features[0].geometry.coordinates[0]).clone().transform('EPSG:' + options.defaultSRS, 'EPSG:3857')
                    );
                    zacLayer.getSource().clear(); // cremove all features
                    zacLayer.getSource().addFeature(zac3857); // add this

                    // get data by geoserver request
                    getDataByGeom('zac', zac3857.getGeometry().getCoordinates()[0]);
                } else {
                    cleanInfos('zac');
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
        if (turf) {
            let extentMap = mviewer.getMap().getView().calculateExtent(mviewer.getMap().getSize());
            turfPolygon = turf.bboxPolygon(extentMap);

            let bboxFeature = new ol.format.GeoJSON().readFeatures(turfPolygon);
            let bboxCoord = bboxFeature[0].getGeometry().getCoordinates()[0]
            getDataByGeom('extent', bboxCoord);
        }
    }

    /**
     * 1 - Clean infos
     * 2 - Get vector layer data from extent or ZAC geom
     * 3 - Update chart bar
     */
    function moveBehavior() {
        cleanInfos();
        if ($('#switch').is(':checked')) {
            getZacByPoint(mviewer.getMap().getView().getCenter());
        } else {
            getDataByExtent();
        }
    }
    /**
     * Init event to trigger behavior on map move end action
     */
    function initMoveBehavior() {
        mviewer.getMap().on('moveend', function() {
            setInfosPanel(true);
        });
    }

    /**
     * Empty zac layer and clean text
     */
    function cleanInfos(type) {
        if (zacLayer) {
            zacLayer.getSource().clear(); // remove all features
            $('#temp-infos').text('');
            $('#zac-info').text('Aucune ZAC');
        }
        if (graph) {
            graph.getChart().destroy();
        }

        $('.panelResult').hide();


        if (!$('.btn-day.btn-selected').attr('day') || !$('#timeSlider').val()) {
            type = null;
            mviewer.getLayers().etablissements.layer.getSource().getSource().clear();
        }
        if (isAutorizedZoom()) {
            $('#zoomMsg').show();
            $('#zoomMsg').children().show();
            return;
        }
        switch (type) {
            case 'zac':
                $('#zacResult').show();
                $('#zacResult').children().show()
                break;
            case 'extent':
                $('#extentResult').show();
                $('#extentResult').children().show()
                break;
            default:
                $('#noFilters').show();
                $('#noFilters').children().show()
        }
    }

    /**
     * Create zac layer to display if map center intersect zac entity
     */
    function initZacLayer() {
        // display zac layer temporary
        var data = 'https://public.sig.rennesmetropole.fr/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=eco_comm:v_za_terminee&outputFormat=application%2Fjson&srsname=EPSG:3857';

        allZacLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
                url: data,
                format: new ol.format.GeoJSON()
            }),
            style: function(feature) {
                return zacBaseStyle;
            },
            visible: false,
            zIndex: 0
        });
        mviewer.getMap().addLayer(allZacLayer);

        if (!zacLayer) {
            zacLayer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    format: new ol.format.GeoJSON()
                }),
                style: function(feature) {
                    return zacHighlightStyle;
                },
                zIndex: 1
            });
            if (mviewer.getMap()) {
                mviewer.getMap().addLayer(zacLayer);
            }
        }
    }

    /**
     * Function to display or hide map center cross and zac name info
     */
    function manageZACUi() {
        if ($('#switch').is(':checked') && mir) {
            allZacLayer.setVisible(true);
            mir.activate();
            $('#zac-infos-panel').show();
        } else if (mir) {
            allZacLayer.setVisible(false);
            mir.deactivate();
            $('#zac-infos-panel').hide();
        }
    }

    /**
     * Function to display or hide map center cross and zac name info
     */
    function manageDateInfosUi() {
        // day
        let date = $('.btn-day.btn-selected').attr('dayName');
        date = $('.btn-day.btn-selected').length ? date : 'Aucun jour ';

        // time
        if (slider) {
            let time = slider.getFormatTime();

            $('#datetime-info').text(date + ' - ' + time);
            if ($('#datetime-info').text().length) {
                $('#clock-info').show();
            } else {
                $('#clock-info').hide();
            }
        }

        $('#mode-info').text(transportSelected);
        if ($('#mode-info').text().length) {
            $('#transport-info').show();
        } else {
            $('#transport-info').hide();
        }
    }

    /**
     * Init toggle button behavior
     */
    function initSwitch() {
        $('#switch').click(function(e) {
            // manage center cross and zac infos
            manageZACUi();
            moveBehavior();
        })
    }

    /**
     * Get transport values from layer's data and create select options
     */
    function initTransportList() {
        if (transportType.length && transportSelectEmpty) {
            // delete null infos
            transportType = transportType.filter(e => e);
            // create select options
            let optionsSelect = transportType.map(e => `
                <option value="${e}">${e}</option>
            `);
            // insert select options
            $('#modal-select').empty();
            $('#modal-select').append('<option value="">Tous</option>');
            $('#modal-select').append(optionsSelect);

            transportSelected = $('#modal-select').val();
            // init event
            $('#modal-select').on('change', function(e) {
                transportSelected = $('#modal-select').val();
                setInfosPanel(e);
                //manageDateInfosUi();
            })

            // to do that once
            transportSelectEmpty = false;
        }
    }

    /**
     * Init button behaviors
     */
    function initBtnDay() {
        var initBtnEvent = mviewer.getMap().on('postrender', m => {
            if (!btnInit && $('.btn-day').length) {
                $('.btn-day').click(function(e) {
                    // style
                    $('.btn-day').removeClass('btn-selected');
                    $('.btn-day').removeClass('active');
                    $('.btn-day').removeClass('focus');
                    $(this).addClass('btn-selected');

                    // data behavior
                    setInfosPanel(e);
                });
                btnInit = true;
                ol.Observable.unByKey(initBtnEvent);
            }
        })

    }

    /**
     * init time slider 
     */
    function initTimeSlider() {
        slider = new Slider('timeSlider', setInfosPanel);
    }

    function initChart(features) {
        graph = new Graph('myChart', features);
    }

    function reloadChart(features = false) {
        features = features || mviewer.customLayers.etablissements.layer.getSource().getSource().getFeatures();

        if (!features.length && graph) {
            return graph.getChart().destroy();
        }

        if (!features.length) {
            return
        }

        if (!graph) {
            initChart(features);
        } else {
            graph.getChart().destroy();
            initChart(features);
        }
    }

    function clearAll(type) {
        if (graph) {
            graph.getChart().destroy();
        }
        cleanInfos(type || 'filters');
    }

    /**
     * Trigger data layer source update from fitlers and trigger infos update
     * @param {Boolean} isEvent 
     */
    function setInfosPanel(isEvent, reloadGraph = true) {
        // only trigger by init function - deactivate because of loop bug
        var features = mviewer.customLayers.etablissements.layer.getSource().getSource().getFeatures();
        if (!sourceInitialized && !isEvent) {
            mviewer.customLayers.etablissements.setSource();
            sourceInitialized = features.length || false;
        }

        // always trigger by event on switch click, day or transport change event
        manageZACUi();
        manageDateInfosUi();
        setAbsentPresent();
        if (!$('.btn-day.btn-selected').attr('day') || !$('#timeSlider').val() || isAutorizedZoom()) {
            // if filters are not all selected we just destroy chart
            clearAll();
            return
        }
            
        // il all filters are selected we update map layer and create or restart chart
        var layer = mviewer.customLayers.etablissements;
        layer.setSource();
        if(!reloadGraph) return;

        if (layer.layer.getSource().getSource().getFeatures().length) {
            moveBehavior();
        } else {
            clearAll('extent');
            layer.layer.once('postrender', function() {
                moveBehavior();
            });
        }
        
    }

    /**
     * Return current map zoom level
     */
    function getZoom() {
        return mviewer.getMap().getView().getZoom();
    }

    /**
     * Control if map zoom is autorhized from zoomLvl addon config param
     */
    function isAutorizedZoom() {
        return options.zoomLvl ? getZoom() < options.zoomLvl : true;
    }

    /**
     * Return default zoom from config or from mviewer config directly if "zoom" param is not exists
     */
    function zoomToDefaultLvl() {
        return mviewer.getMap().getView().setZoom(options.zoomLvl || configuration.getConfiguration().mapoptions.zoom)
    }

    /**
     * PUBLIC
     */

    return {
        init: () => {
            // trigger with map postrender event to be sur IHM was loaded and exists
            mviewer.getMap().once('postrender', m => {
                // create SRS 3948 use by sigrennesmetropole as default SRS
                if (options.defaultSRS === '3948') {
                    initSRS3948();
                }

                // get templates to display UIs
                initTemplates();
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
                // init default zoom level
                zoomToDefaultLvl();
            });

        },

        /**
         * Init when vector layer is postrender to be sur data was loaded
         * trigger by customLayer
         */
        initOnDataLoad: function() {
            // to manage switch because this component is load late
            let i = 0;

            // list for transport type value
            initTransportList();

            // button for day selection
            initBtnDay();

            // hide or display mir
            initSwitch();
            if (cartohoraires) {
                initSearchItem();
            }
            $('#searchtool').hide();

            // init time slider component
            if (i == 0 && $('#timeSlider').length) {
                initTimeSlider();
                i = 1;
            }

            setInfosPanel(false);
        },

        /**
         * 
         * @param {String} e as coordinates separated with coma
         * @param {String} label as text to display into input field
         */
        select: function(e, label) {
            if (e) {
                displayResult(e.split(',').map(a => parseFloat(a)));
            }
            autocomplete.select(label);
        },
        setTransportType: function(types) {
            transportType = types;
        },
        getTransportValue: function() {
            return $("#modal-select option:selected").val();
        },
        getDateValue: function() {
            return $('.btn-day.btn-selected').attr('dayName');
        },
        getSlider: function() {
            return slider;
        }
    };
})();

new CustomComponent("cartohoraires", cartohoraires.init);