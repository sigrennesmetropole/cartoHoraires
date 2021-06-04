/**
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This file is the main file to trigger and init the app, events or instances.
 *
 * Last modified  : 2020-09-25
 * By gaetan.bruel@jdev.fr
 */

const cartohoraires = (function() {
    let config = mviewer.customComponents.cartohoraires.config;
    let options = mviewer.customComponents.cartohoraires.config.options;
    const mapWidth = options.mapWidth;
    const itemsRight = options.templateWidth + 1;
    let panelLoaded=false;
    let formLoaded=false;
    let btnLoaded=false;
    let zacLayer = null;
    let allZacLayer = null;
    let load = false;
    let autocomplete;
    let autocompleteForm;
    let autocompleteIdentifier = null;
    let selectSingleClick;

    let rvaConf;

    let transports = [];
    let transportSelectEmpty = true;
    let transportSelected = '';

    let btnInit = false;
    let sourceInitialized = false;

    let slider;
    let graph;

    /**
     * Default style to highlight ZAC on center hover
     */
    const zacHighlightStyle = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0)',
        }),
        stroke: new ol.style.Stroke({
            color: 'rgba(240, 189, 103)',
            width: 2,
        })
    });

    const zacBaseStyle = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0)',
        }),
        stroke: new ol.style.Stroke({
            color: 'rgba(55, 52, 79)',
            width: 1.4,
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
        const specialDays = [6,7];
        const dayView = {
            days: [
            {   id: '1',
                name:'Lundi'
            },
            {   id: '2',
                name:'Mardi'
            },
            {   id: '3',
                name:'Mercredi'
            },
            {   id: '4',
                name:'Jeudi'
            },
            {   id: '5',
                name:'Vendredi'
            },
            {   id: '6',
                name:'Samedi'
            },
            {   id: '7',
                name:'Dimanche'
            }
            ]};

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
                        panelLoaded = true;
                        break;
                    case 'form':
                        let template = Mustache.to_html(e.template, dayView);
                        $('#main').prepend(template);
                        // init clock picker
                        $('.clockpicker').clockpicker({
                            placement: 'top',
                            align: 'left',
                            autoclose:true
                        });
                        $('.ch-absent').change(function(e) {
                            let parentDayZone = $(e.target).parents().closest('.input-day-zone');
                            parentDayZone.find('.input-selectors input').prop("disabled", e.target.checked);
                            parentDayZone.find('.input-selectors select').prop("disabled", e.target.checked);
                            parentDayZone.find('.input-group-addon').css("pointer-events", e.target.checked ? 'none' : 'auto');
                            if(e.target.checked) {
                                parentDayZone.find('input[id^=clockpicker-in-]').val('08:00');
                                parentDayZone.find('input[id^=clockpicker-out-]').val('18:00');
                                formactions.validClockpicker();
                            }
                        });
                        // unchecked weekend
                        specialDays.forEach(e => {
                            $('#checkbox-'+e).click();
                            $('#copy-'+e).closest('.copyBtn').remove();
                        })
                        formLoaded = true;
                        break;
                    case 'formBtn':
                        $(document.getElementById('iconhelp').parentNode).prepend(e.template);
                        btnLoaded = true;
                        break;
                    default:
                        break;
                }
                if (panelLoaded && formLoaded && btnLoaded) {
                    let event = new CustomEvent('panelFullyLoaded', { 'detail': 1 });
                    document.dispatchEvent(event);
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
        $(".cartohoraires-panel .row").hide();
    }

    /**
     * Display modal on mobile device only and display it only if a user clic on button
     */
    function initModalBehavior() {
        $('.formBtnMobile').on('click', function() {
            if($('.form-row').length) {
                // force mobile display;
                $('.form-row').removeClass('form-row');
            }
            $('#formBtn').click();
        });

        $('#mobilebtn-el').on('click', function() {
            $("#cartohoraires-modal").modal('toggle');
            if($('.form-row').length) {
                // force mobile display;
                $('.form-row').removeClass('form-row');
            }
            $('#btn-form-actions').removeClass('text-right');
            $('#btn-form-actions').addClass('text-center');
            $('#btn-form-actions').css('margin-bottom', '25%');

            // Fix z-index and force display on top
            $('#form-modal').css('overflow','auto !important');
            $('#form-modal').attr('style','overflow-y: auto !important; z-index:10000;');
            $('.clockpicker-popover').attr('style','z-index:100000 !important');
        });
        
        // this fix async problem to be sur to init or refresh some elments
        $("#cartohoraires-modal").one("shown.bs.modal", function () {
            setTimeout(function(){
                slider.refresh();
            });
        });

        // this fix async problem to be sur to init or refresh some elments
        $("#form-modal").on("hidden.bs.modal", function () {
            $('#btn-up').fadeOut(300);
        });

        // this fix async problem to be sur to init or refresh some elements
        $("#form-modal").one("shown.bs.modal", function () {
            $('#cartohoraires-modal-close').click();
            setTimeout(function(){
                formactions.initMapForm(); }, 50);
        });

        if($('#go-app-btn').length && options.homeToForm) {
            $('#go-app-btn').click(function(e) {
                //return $("#form-modal").modal('toggle');
            })
        }
        if($('#go-app-btn-form').length && options.homeToForm) {
            $('#go-app-btn-form').click(function(e) {
                return $("#form-modal").modal('toggle');
            })
        }
    }

    /**
     * Force display component for desktop device only
     */
    function initDisplayComponents() {
        $('#iconhelp').empty();
        $('#iconhelp').append('<i class="fas fa-home"></i>');

        if (!configuration.getConfiguration().mobile) {
            $('#map').attr('style', `width:${mapWidth}% !important`);
            console.log("InitDisplayComponents : " + $('#map').attr('style'));
            $('#zoomtoolbar').attr('style', `right: ${itemsRight}% !important`);
            $('#toolstoolbar').attr('style', `right: ${itemsRight}% !important`);
            $('.cartohoraires-panel').attr('style', `width: ${options.templateWidth}% !important`);
        } else {
            $('.nav.navbar-nav.mv-nav').empty();
            $('.nav.navbar-nav.mv-nav').prepend(

                `   <li class="hidden-lg hidden-md"><a href="#" data-toggle="modal" data-target="#legend-modal" i18n="nav.responsive.legend">Légende</a></li>
                    <li class="hidden-lg hidden-md"><a href="#" data-toggle="modal" data-target="#cartohoraires-modal">Affiner</a></li>
                    <li class="hidden-lg hidden-md"><a href="#" class="formBtnMobile">Contribuer</a></li>
                    <li class="hidden-lg hidden-md"><a href="#" data-toggle="modal" data-target="#help" i18n="nav.responsive.about">Accueil</a></li>
                `
            );
        }
    }

    /**
     * Create autocomplete request response for BAN API
     * @param {String} results 
     */
    function searchRVA(e, optforce) {
        let id = 'search-radio';
        if(!$(e.target).parents('.top-form').length) id = 'search-radio-form';

        let value = e.target.value;
        if (value && ((optforce!= 'undefined' && optforce) || value.length > 3)) {
            let promises = searchRM.request(rvaConf, value);
            Promise.all(promises).then(function(allResult) {
                let data = searchRM.getAutocompleteData(allResult, value, false);
                
                if(id === 'search-radio') {
                    autocomplete.closeAllLists();
                    autocomplete.displayList(data);
                } else {
                    autocompleteForm.closeAllLists();
                    autocompleteForm.displayList(data);
                }

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
    function searchSIRENE(e, optforce) {
        if(!options.sirenConfig) return;
        let value = e.target.value;
        let minCar = options.sirenConfig.min || 5;
        if (value && ((optforce!='undefined' && optforce) || value.length > minCar)) {
            
            let conf = options.sirenConfig; 

            let filter = `${value}`;
            if(conf.filters && conf.filters.length) {
                filter = conf.filters.map(e => `${e}:${value}`);
                filter = conf.filters.length > 1 && conf.operator ? filter.join(` ${conf.operator} `) : filter;
                filter = `(${filter})`;
            }
            
            let url = `${conf.url}?q=${filter}&dataset=${conf.dataset}&facet=nomunitelegale&refine.etatadministratifetablissement=Actif`;
            if(conf.max) {
                url += `&rows=${conf.max}`
            }
            if(conf.requestParam) {
                url += conf.requestParam;
            }

            // Ajax request
            let xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onload = function() {
                if (xhr.status === 200 && xhr.responseText) {
                    var response = xhr.responseText.length ? JSON.parse(xhr.responseText) : null;
                    if (response && response.records.length && autocomplete.displayList) {
                        if(autocompleteIdentifier === 'search-radio') {
                            autocomplete.closeAllLists();
                            autocomplete.displayList(response.records);
                        } else {
                            autocompleteForm.closeAllLists();
                            autocompleteForm.displayList(response.records);
                        }
                    }
                } else {
                    console.log('fail request');
                }
            };
            xhr.send();
        }
    }

    /**
     * From the record we create correct info label
     * @param {Object} fields record from API result
     */
    function getSirenText(fields) {
        let denom = fields.denominationunitelegale || '';
        denom = !denom && fields.denominationusuelleetablissement ? fields.denominationusuelleetablissement : denom;
        denom = !denom && fields.prenom1unitelegale && fields.nomunitelegale ? `${fields.prenom1unitelegale} ${fields.nomunitelegale}` : denom;
        denom = denom || (fields.l1_adressage_unitelegale ? fields.l1_adressage_unitelegale : '');
        // remove empty and join
        let label = [denom, fields.enseigne1etablissement, fields.adresseetablissement, fields.libellecommuneetablissement];
        return label.filter(e => e && e.length).join(', ');
    }

    /**
     * Format autocomplete response for SIRENE API
     * @param {Array} results 
     */
    function formatSIRENEesult(results) {
        let i = 0
        let siret = [];
        let html = [];
        results.forEach(record => {
            if (options.sirenConfig && options.sirenConfig.max && siret.indexOf(record.fields.siret) < 0 && i < options.sirenConfig.max) {
                let props = record.fields;
                if(record.geometry && record.geometry.coordinates) {
                    let coord = record.geometry.coordinates.join(',');
                    let txt = getSirenText(props);
                    html.push(`
                        <div style='overflow-x:hidden; padding-top:5px;'>
                        <a href="#" onclick='cartohoraires.select("${record.geometry.coordinates}","${escape(txt)}")'>${txt}</a>
                        <input type='hidden' value='${coord}'>
                        </div>`);
                    siret.push(props.siret);
                    i = i + 1;
                    
                }
                
            }
        })

        html.sort();
        return html.join('');
    }

    /**
     * Check search type
     * @param {String} v  as input value
     */
    function search(e, optforce) {
        let id = 'search-radio'; 
        if(!$(e.target).parents('.top-form').length) id = 'search-radio-form';

        autocompleteIdentifier = id;

        if ($(`#${id} input:checked`).val() === 'sirene') {
            return searchSIRENE(e, optforce);
        } else {
            return searchRVA(e, optforce);
        }
    }

    /**
     * Transform response to HTML as autocomplete list
     * @param {Object} r as JSON response from API
     */
    function formatInputResult(r) {

        if ($(`#${autocompleteIdentifier} input:checked`).val() === 'sirene') {
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
              
            let vectorSearchLayer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    features: [],
                })
            });

            mviewer.getMap().addLayer(vectorSearchLayer);

            load = true;
            autocomplete = new Autocomplete(document.getElementById('input-autocomplete'), $('.autocomplete-list'), search, formatInputResult);
            autocomplete.initListeners();
            autocomplete.initCloseAction();

            autocompleteForm = new Autocomplete(document.getElementById('input-autocomplete-form'), $('.autocomplete-list-form'), search, formatInputResult);
            autocompleteForm.initListeners();
            autocompleteForm.initCloseAction();
            
            // manage autocomplete behaviors for dataviz panel
            function clearSearch() {
                vectorSearchLayer.getSource().clear();
                $('#ch-searchfield .delete').hide();
                $('#ch-searchfield .result').show();
            }
            
            document.addEventListener("localize", function(e) {
                if(!e || !e.detail || !e.detail.coord.length > 1 || !e.detail.coord 
                    || !e.detail.target || e.detail.target === 'search-radio-form') return;
                
                clearSearch();
                let coord = e.detail.coord.map(a => parseFloat(a));
                coord = ol.proj.transform(coord, 'EPSG:4326', 'EPSG:3857');
                
                var iconStyle = new ol.style.Style({
                    image: new ol.style.Icon({
                        anchor: [0.5, 46],
                        anchorXUnits: 'fraction',
                        anchorYUnits: 'pixels',
                        src: options.sirenConfig && options.sirenConfig.icon || null,
                        scale: 0.9
                    }),
                });
                
                let feature = new ol.Feature({
                    geometry: new ol.geom.Point(coord),
                    style: iconStyle
                });

                feature.setStyle(iconStyle);
                vectorSearchLayer.getSource().addFeature(feature);

                mviewer.getMap().getView().setCenter(coord);
                mviewer.getMap().getView().setZoom(15);
                $('#ch-searchfield .result').hide();
                $('#ch-searchfield .delete').show();
            });
            $('#ch-searchfield').click(function(e) {
                clearSearch();
            });
            
            $('#btn-pan-search').on('click', function(e) {
                e.target=$('#input-autocomplete')[0];
                search(e, true);
            });
            $('#btn-pan-search-form').on('click', function(e) {
                e.target=$('#input-autocomplete-form')[0];
                search(e, true);
            });
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
            $('.zac-infos-loc').removeClass('zacData');
            cleanInfos(type);
            setAbsentPresent();
        }
        if (isAutorizedZoom()){
            reloadChart(containsData);
        }
        // get absent
        // get present and absent
        if(containsData.length) {
            if(type=='zac'){
                $('.zac-infos-loc').addClass('zacData');
            }
            let indiv = containsData.map(i => i.getProperties());
            // get absents and not absents
            let abs = indiv.filter(a => a.absence);
            let prs = indiv.filter(a => !a.absence);
            // Distinct individu_id
            prsLen = [...new Set(prs.map(e => e.individu_id))].length;
            absLen = [...new Set(abs.map(e => e.individu_id))].length;
            // Display infos
            setAbsentPresent(prsLen, absLen);
        }        
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
                    $('.zac-infos-loc').removeClass('no-selected-zac');
                    if (results.features[0].properties.nomza) {
                        $('#zac-info').text('');
                        $('#zac-info').text(results.features[0].properties.nomza);
                        $('.zac-infos-loc').removeClass('zacData');
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
                    setAbsentPresent();
                    $('#temp-infos').text('');
                    $('#zac-info').text('Aucune ZAC sélectionnée');
                    $('.zac-infos-loc').addClass('no-selected-zac');
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

        // select interaction working on "singleclick"
        selectSingleClick = new ol.interaction.Select({
            condition: ol.events.condition.singleClick,
            style: function(feature) {
                return zacBaseStyle;
            },
            layers: function (layer) { // to apply select only onto zac layer
                return layer.get('id') === 'zac';
            }
        });
        mviewer.getMap().addInteraction(selectSingleClick);
        mviewer.select = selectSingleClick;
        selectSingleClick.on('select', function(e) {
            if (selectSingleClick && selectSingleClick.getFeatures().getArray().length>0){
                var mview = mviewer.getMap().getView();
                var zac_geom = selectSingleClick.getFeatures().getArray()[0].getGeometry();
                mview.fit(zac_geom.getExtent(), {size: mviewer.getMap().getSize()});
                mview.setResolution(mviewer.getMap().getView().getResolution()+2);
                if (!zac_geom.intersectsCoordinate(mview.getCenter())){
                    var centerPoint = zac_geom.getClosestPoint(mview.getCenter());
                    mview.centerOn(centerPoint, mviewer.getMap().getSize());
                }
            }
        })
    }

    /**
     * Empty zac layer and clean text
     */
    function cleanInfos(type) {
        if (zacLayer) {
            zacLayer.getSource().clear(); // remove all features
            //$('#temp-infos').text('');
            //$('#zac-info').text('Aucune ZAC');
        }
        if (graph) {
            graph.getChart().destroy();
        }

        $('.panelResult').hide();


        if (!$('.btn-day.btn-selected').attr('day') || !$('#timeSlider').val()) {
            type = null;
            mviewer.getLayers().etablissements.layer.getSource().getSource().clear();
        }
        if (!isAutorizedZoom()) {
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
        var data = `https://public.sig.rennesmetropole.fr/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${options.za_layer}&outputFormat=application%2Fjson&srsname=EPSG:3857`;

        allZacLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
                url: data,
                format: new ol.format.GeoJSON()
            }),
            style: function(feature) {
                return zacBaseStyle;
            },
            id:'zac',
            visible: false,
            zIndex: 0
        });
        mviewer.getMap().addLayer(allZacLayer);

        if (!zacLayer) {
            zacLayer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    format: new ol.format.GeoJSON(),
                    id: 'zac-src'
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
        let event = new CustomEvent('allZacInit', { 'detail': 1 });
        document.dispatchEvent(event);
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
    function initTransportList(isReset=false) {
        cartoHoraireApi.request(null, function(res) {
            transportSelectEmpty = isReset || transportSelectEmpty;
            if(res.length && transportSelectEmpty) {
                // init all list for form and info panel
                transports = res;
                let optionsSelect = res.map(e => `
                    <option value="${e.libelle}">${e.libelle}</option>
                `);
                //let contain = ['<option value="">Tous</option>'].concat(optionsSelect).join('');
                let inputSelect = optionsSelect.join('');
                let contain = '<option value="">Tous</option>' + inputSelect;
                
                // empty all
                $('.transpor-list').empty();

                $('.transport-input-selector').append(inputSelect).val('Voiture (seul(e))');
                $('.transport-modal-selector').append(contain);

                
                // only for info panel selector
                transportSelected = $('#modal-select').val();
                $('#modal-select').on('change', function(e) {
                    transportSelected = $('#modal-select').val();
                    setInfosPanel(e);
                });
                transportSelectEmpty = false;
            }
        }, 'GET', 'getMoyenTransports');
    }

    /**
     * Init button behaviors
     */
    function initBtnDay() {
        var initBtnEvent = mviewer.getMap().on('postrender', m => {
            //if (!slider){initTimeSlider();}
            //else {setTimeout(function(){slider.refresh();},250)}

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
        slider.refresh();
    }

    /**
     * Init chart from given featues array
     * @param {Array} features 
     */
    function initChart(features) {
        graph = new Graph('myChart', features, options.graph && options.graph.step || null);
        graph.createGraph();
    }

    /**
     * Destroy en create new chart from given feature Array
     * @param {Array} features 
     */
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

    /**
     * Destroy old Chart
     * @param {String} type 
     */
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
        if (!$('.btn-day.btn-selected').attr('day') || !$('#timeSlider').val() || !isAutorizedZoom()) {
            // if filters are not all selected we just destroy chart
            moveBehavior();
            clearAll();
            return
        }
            
        // if all filters are selected we update map layer and create or restart chart
        var layer = mviewer.customLayers.etablissements;
        layer.setSource();
        if(!reloadGraph) return;

        if (layer.layer.getSource().getSource().getFeatures().length >0) {
            moveBehavior();
        } else {
            clearAll('extent');
                moveBehavior();
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
        //return options.zoomLvl ? getZoom() < options.zoomLvl : true;
        return getZoom() >= options.zoomLvl;
    }

    /**
     * Return default zoom from config or from mviewer config directly if "zoom" param is not exists
     */
    function zoomToDefaultLvl() {
        console.log("retour au zoom par défaut");
        return mviewer.getMap().getView().setZoom(options.zoomLvl || configuration.getConfiguration().mapoptions.zoom)
    }

    /**
     * Display scroll button to go to top modal
     */
    function initScrollBehavior() {
        $('#main').append('<button type="btn" id="btn-up" class="btn-default btn-lg btn btn-up"><span class="glyphicon glyphicon-arrow-up"></span></button>');

        $('.btn-up').on('click', () => {
            $('#form-modal').scrollTop(0);
            $('.btn-up').hide();
        });

        $('#form-modal').on('scroll', function(){
            if(document.getElementById('form-modal').scrollTop > 0) {
                $('.btn-up').show();
            } else {
                $('.btn-up').hide();
            }
            $('.clockpicker').clockpicker('hide');
        })
    }

    /**
     * To manage style if input is not correct
     */
    function initFormInputs() {
            // init behaviors on input
            formactions.validInput('fst-email-form');
            formactions.validInput('email-form');
            formactions.validClockpickerBehavior();
    }

    /**
     * Init DOM component with some lib and init some behaviors that directly depend on layer's data.
     */
    function initAfterData() {
        // init time slider component
        initTimeSlider();
        // button for day selection
        initBtnDay();
        // hide or display mir
        initSwitch();

        initSearchItem();

        $('#searchtool').hide();

        initScrollBehavior();

        // list for transport type value
        initTransportList();

        initFormInputs();
        
        // Display modal on mobile device
        initModalBehavior();
        
        // init get data by extent by default
        //getDataByExtent();
        // init default zoom level
        zoomToDefaultLvl();
        // init behavior on map move
        initMoveBehavior();
    }
    /**
    * LaunchInitAfterData
    */
    function launchInitAfterData(isInit){
        if(!allZacLayer) {
            // here slider and layer don't exists, we need to wait for main init method
            document.addEventListener('allZacInit', function() {
                // when main init method is finish, this init trigger event, 
                // but sometime, Mviewer DOM is not totally loaded, so we wait some ms to trigger this init
                initAfterData();
                setInfosPanel(isInit ? true : false);
                showPanel();
            });
        } else {
            initAfterData();
            setInfosPanel(isInit ? true : false);
            showPanel();
        }
    }
    
    /**
    * Show panel
    */
    function showPanel(){
        $('.load-panel').hide();
        $(".cartohoraires-panel .row").show();
        slider.refresh();
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
                // create ZAC layer
                initZacLayer();
                // Usefull event to detect when the app init finish
                let event = new CustomEvent('cartohorairesInit', { 'detail': 1 });
                document.dispatchEvent(event);
            });
        },

        /**
         * Init when vector layer is postrender to be sur data was loaded
         * trigger by customLayer
         */
        initOnDataLoad: function(isInit) {
            // try to init with data
            try{
                if (!panelLoaded || !formLoaded || !btnLoaded) {
                    document.addEventListener('panelFullyLoaded', function() {
                        launchInitAfterData(isInit);
                    });
                } else {
                    launchInitAfterData(isInit);
                }
            } finally {
                let event = new CustomEvent('ondataloadEvt', { 'detail': 1 });
                document.dispatchEvent(event);
            }
        },
        
        /**
         * 
         * @param {String} e as coordinates separated with coma
         * @param {String} label as text to display into input field
         */
        select: function(e, label) {
            label = unescape(label);
            if(autocompleteIdentifier != 'search-radio-form') {
                if (e) displayResult(e.split(',').map(a => parseFloat(a)));
                autocomplete.select(label);
            } else {
                autocompleteForm.select(label);
                $(autocompleteForm.getTarget()).attr('coordinates', `${e}`);
                if($('.authent').is(':visible')) {
                    $('#btn-valid').removeClass('disabled');
                }
                formactions.validClockpicker();
            }
            var event = new CustomEvent('localize', { detail: {
                coord: e.split(','),
                target: autocompleteIdentifier
            }});
            document.dispatchEvent(event);
        },
        /**
         * Set transport types
         * @param {Object} types 
         */
        setTransportType: function(types) {
            transportType = types;
        },
        /**
         * Get transport types
         */
        getTransportValue: function() {
            return $("#modal-select option:selected").val();
        },
        /**
         * Get all transport types
         */
        getTransportList: function() {
            return transports
        },
        /**
         * Restore transport list UI
         */
        resetTransportList : function() {return initTransportList(true)}
    };
})();

new CustomComponent("cartohoraires", cartohoraires.init);
