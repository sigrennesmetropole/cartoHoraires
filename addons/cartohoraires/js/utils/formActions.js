/**
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This utils class create some function used by form UI and components.
 *
 * Last modified  : 2020-09-25
 * By gaetan.bruel@jdev.fr
 */
(function(window){
    /**
     * To restore completely or simply the form
     * @param {boolean} simple 
     */
    function resetForm(simple, closewdw=true) {
        // for week end
        let samDim = [6,7];
        if(!simple) {
            //$('#form-modal').modal('toggle');
            $('#cartohoraires-modal-close').click();
            if(closewdw) {$('#form-modal-close').click();}
            $('#email-id').text('');
            $('.authent').hide();
            $('.anonymous').show();
            $('.reset').val('');
        }
        $('#btn-valid').addClass('disabled');
        cartohoraires.resetTransportList();
        $('input[id^="clockpicker-in-"]').val('8:00');
        $('input[id^="clockpicker-out-"]').val('18:00');
        $('.ch-absent').prop('checked', false);
        samDim.forEach(e => {
            $('#checkbox-'+e).click();
        });
    }

    /**
     * Define UI states according to absent checkbox state
     * @param {String} id 
     * @param {boolean} absent 
     */
    function setAbsentDay(id, absent) {
        $('#checkbox-'+id).prop('checked', absent);
        $('#'+id).find('.input-selectors input').prop("disabled", absent);
        $('#'+id).find('.input-selectors select').prop("disabled", absent);
        $('#'+id).find('.input-group-addon').css("pointer-events", absent ? 'none' : 'auto');
    }

    /**
     * Set user form info from serveur response
     * @param {Object} horaire 
     */
    function setData(horaire) {
        let shape;
        horaire.forEach((el) => {
            
            let id = el.jour;
            let absent = el.absence || false;
            modeVal = cartohoraires.getTransportList().filter(i => el.moytranspid && el.moytranspid === i.id);
            modeVal = modeVal.length ? modeVal[0] : null;
            modeVal = modeVal && modeVal.libelle || null;

            // to detect format as HH:mm:ss or HH:mm
            if(el.horaire && el.horaire.split(':').length > 2) {
                horaire = moment(el.horaire, 'HH:mm:ss').format('HH:mm');
            } else if(el.horaire) {
                horaire = moment(el.horaire, 'HH:mm').format('HH:mm');
            }

            if(el.absence || !el.mouvement || !modeVal || !el.mouvement) { // absent
                setAbsentDay(id,true);
                absent = true;
            }
            if(!absent) setAbsentDay(id, false);

            if(!absent && el.mouvement === 'A') {
                $('#clockpicker-in-' + id).val(horaire);
                $('#transport-in-select-' + id).val(modeVal);
            } else if(!absent) {
                $('#clockpicker-out-' + id).val(horaire);
                $('#transport-out-select-' + id).val(modeVal);
            }
            if(el.shape && !shape) shape = el.shape;
        });

        if(shape) {
            let format = new ol.format.WKT();
            let feature = format.readFeature(shape, {
                dataProjection: 'EPSG:3948',
                featureProjection: 'EPSG:3857',
            });
            this.formactions.clearLayer();
            this.formactions.addFeature(feature);

            let coords = feature.getGeometry().getCoordinates();
            
            coords = ol.proj.transform(coords, 'EPSG:3857', 'EPSG:4326');
            $('#input-autocomplete-form').attr('coordinates', coords);            
            mviewer.zoomToLocation(coords[0], coords[1], 15, null);
        }
    }

    /**
     * Call formactions lib from global public scope
     */
    function formactions(){
        let _formactions = {};

        _formactions.validSendBtn = function() {
            // connection
            if(!$('#email-id').text()) {
                messages.create('#inputFormMsg', messages.text.loginRequired, '#c52a0d', null, 0);
                return $('#btn-valid').addClass('disabled');
            }
            
            
            // control clock picker
            let clock = $('.clockpicker').find('input').map((idx, elem) =>  {
                return $(elem).val();
            }).get();
            
            if(clock.filter(value => !value).length) {
                return $('#btn-valid').addClass('disabled'); 
            }

            // shape
            if(_formactions && _formactions.vectorLayer && !_formactions.vectorLayer.getSource().getFeatures().length) {
                messages.create('#inputFormMsg', messages.text.invalidLocation, '#ff6600', null, 0);
                return $('#btn-valid').addClass('disabled');
            }
            

            $('#inputFormMsg').addClass('hide');
            $('#btn-valid').removeClass('disabled');
        }

        /**
         * Behavior to trigger from other component
         */
        _formactions.validClockpickerBehavior = function() {
            $('.clockpicker').find('input').change(function(e) {
                _formactions.setClockPickerStatus(e);
                _formactions.validSendBtn();
            });
        }

        /**
         * To set clock picker status validation
         * @param {Event} e 
         */
        _formactions.setClockPickerStatus = function(e) {
            let val = '';
            if(!e) return;
            if(e && e.target) {
                val = e.target.value;
                e = e.target;
            } else {
                val = $(e).val();
            }
            if(!val) {
                $(e).addClass("invalid");
            } else {
                $(e).removeClass("invalid");
            }
        }

        /**
         * To control clockPicker value
         * @param {Event} e 
         */
        _formactions.validClockpicker = function(e) {
            $('.clockpicker').find('input').each(function(i,e) {
                _formactions.setClockPickerStatus(e);
            });
            _formactions.validSendBtn();
        }
        /**
         * Control input string on input event
         * @param {String} inputMailId 
         */
        _formactions.validInput = function (inputMailId ) {
            $('#'+inputMailId).on('input', function() {

                let input=$(this);
                if(!input.prop('required')) return;

                if(_formactions.isMailValid(input.val())){
                    input.removeClass('invalid').addClass("valid");
                    return true;
                } else {
                    input.addClass("invalid");
                    input.removeClass('valid').addClass("invalid");
                    return false;
                }
            });
        }
        /**
         * Control email value with a simple regExp
         * @param {String} val as email value
         */
        _formactions.isMailValid = function (val) {
            return val && /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(val);
        }

        /**
         * Control email and code to request connection according to authent
         * @param {String} inputMailId 
         * @param {String} inputCodeId 
         * @param {Function} callback 
         */
        _formactions.validConnexionForm = function (inputMailId, inputCodeId, callback) {
            $('#code-form').removeClass('invalid');
            $('#'+inputMailId).removeClass('invalid');
            // we valid email format
            let isCode = $('#code-form').val().trim();
            let isMailValid = _formactions.isMailValid($('#'+inputMailId).val());
            if(isCode && isMailValid) {
                // if email format is valid we request connexion with code and email params
                callback(
                    {email: $('#'+inputMailId).val(), code: $('#'+inputCodeId).val().trim()},
                    function(e) {
                        if(e && e.length && e[0]) e = e[0];
                        if(e && e.success && !e.exist) {
                            messages.create(
                                '#createUserMsgExists',
                                messages.text.accountMandatory,
                                '#fed500'
                            );
                        }
                        else if (e && e.success && !e.auth) {
                            // code or email is not valid
                            messages.create(
                                '#createUserMsgExists',
                                messages.text.wrongLogin,
                                '#fed500'
                            );
                        } else if(e.auth && e.exist && e.success) {
                            $('.anonymous').hide();
                            $('.authent').show();
                            $('#inputFormMsg').hide();
                            $('#email-id').text($('#'+inputMailId).val());
                            _formactions.validSendBtn();

                            // user code exist and match we will request user's infos
                            cartoHoraireApi.request(
                                {email: $('#'+inputMailId).val()},
                                function(e) {
                                    e = e && e.length && e[0] ?  e = e[0] : e;
                                    if(!e || !e.success) {
                                        messages.create(
                                            '#inputFormMsg',
                                            messages.text.getUserInfoError,
                                            '#c52a0d'
                                        );
                                    }
                                    // we find data and load data
                                    if(e && e.success && e.horaire.length) {
                                        setData(e.horaire);
                                        _formactions.validSendBtn();
                                        _formactions.validClockpicker();
                                    }
                                },
                                'GET',
                                'getUserInfos'
                            );
                        }
                    },
                    'POST',
                    'loginUser'
                );
            } else {
                // invalid UI style
                if (!isCode) $('#code-form').addClass('invalid');
                if (!isMailValid) $('#'+inputMailId).addClass('invalid');
                // display message
                messages.create(
                    '#createUserMsgExists',
                    messages.text.wrongLogin,
                    '#c52a0d',
                    null,
                    0
                );
            }
        }


        /**
         * To copy a day onto others except for Weekend days
         * @param {String} idDay 
         */
        _formactions.duplicateDay = function(idDay) {
            let samDim = [6,7];
            let absent = $('#checkbox-' + idDay).is(':checked');
            let outClock = $('#clockpicker-out-' + idDay).val();
            let outMode = $('#transport-out-select-' + idDay).val();
            
            let inClock = $('#clockpicker-in-' + idDay).val();
            let inMode = $('#transport-in-select-' + idDay).val();
            $('.input-day-zone').each((i, el) => {
                let id = el.id ? parseFloat(el.id) : 0;
                if(id != idDay && samDim.indexOf(id)<0) {
                    if(absent) {
                        $('#checkbox-' + id).prop('checked',true);
                        setAbsentDay(id, true);
                    } else {
                        setAbsentDay(id, false);
                        // A
                        $('#clockpicker-in-' + id).val(inClock);
                        $('#transport-in-select-' + id).val(inMode);
                        // D
                        $('#clockpicker-out-' + id).val(outClock);
                        $('#transport-out-select-' + id).val(outMode);
                    }
                }
            });
        }

        /**
         * Logout
         */
        _formactions.logout = function(closewdw = true) {
            let email = $('#email-id').text();
            if(!email) return;
            _formactions.clearSearch();
            cartoHoraireApi.request(
                {email: email},
                function(e) {
                    // we find data and load data
                    if(e && e.length && e[0]) e = e[0];
                    if ((!e || !e.success) && e.exception) {
                        messages.create(
                            '#confirmDeleteMsg',
                            messages.text.logoutError,
                            '#ff6600', function() { if (closewdw) {window.formactions.restore(false);} else {$('#form-modal').animate({ scrollTop: '0px'}, 1000);}}
                        );
                    }
                    else if (e.success) {
                        if (closewdw) {
                            _formactions.restore(false);
                            mviewer.customLayers.etablissements.updateLayer(false, null, null, false);
                        } else {
                            window.formactions.restore(false, false);
                            $('#form-modal').animate({ scrollTop: '0px'}, 1000);
                        }
                    }
                    _formactions.validSendBtn();
                },
                'POST',
                'logoutUser'
            );
        }

        /**
         * Trigger restore form UI
         * @param {boolean} e 
         */
        _formactions.restore = function(e,closewdw) {
            _formactions.validSendBtn();
            return resetForm(e,closewdw);
        }

        /**
         * Validation for input code
         * @param {object} e as input changed
         */
        _formactions.changeCodeDelete = function(e) {
            if(e.value) {
                $(e).removeClass('invalid');
                $('#delete-modal-btn').removeClass('disabled');
            } else {
                $(e).addClass('invalid');
                $('#delete-modal-btn').addClass('disabled');
            }
        }

        /**
         * Delete infos and user
         */
        _formactions.deleteInfos = function() {
            let email = $('#email-id').text();
            let pwd = $('#code-delete').val();
            if(!pwd) {
                return;
            }
            cartoHoraireApi.request(
                {email: email, code: pwd},
                function(e) {
                    function onResponse() {
                        $('#delete-modal').modal('toggle');
                        window.formactions.logout();
                    }
                    // infos removed
                    if(e && e.length && e[0]) e = e[0];
                    if(e && e.success) {
                        messages.create(
                            '#confirmDeleteMsg',
                            messages.text.deleteSuccess,
                            '#13ab00', onResponse
                        );
                    } else {
                        messages.create(
                            '#confirmDeleteMsg',
                            messages.text.wrongPassword,
                            '#c52a0d'
                        );
                    }
                },
                'DELETE',
                'deleteUserInfos'
            );
        }

        /**
         * To get day infos about absent, clock and transport
         * @param {String} idDay 
         */
        _formactions.getDayInfos = function(idDay) {
            let modeOutId, modeInId;

            let clockIn =  $('#clockpicker-in-' + idDay);
            let clockOut = $('#clockpicker-out-' + idDay);
            let modeIn = $('#transport-in-select-' + idDay);
            let modeOut = $('#transport-out-select-' + idDay);

            if(modeIn.length) {
                let modeInVal = modeIn.val();
                modeInId = cartohoraires.getTransportList().filter(i => i && i.libelle === modeInVal);
                modeIn = modeInId.length ? modeInId[0].id : '';
            }
            
            if(modeOut.length) {
                modeOutVal = modeOut.val();
                modeOutId = cartohoraires.getTransportList().filter(i => i && i.libelle === modeOutVal);
                modeOut = modeOutId.length ? modeOutId[0].id : '';
            }

            return {
                modeInId: modeIn,
                modeOutId: modeOut,
                clockIn: clockIn.val(),
                clockOut: clockOut.val(),
                absence: $('#checkbox-' + idDay).is(':checked')
            }
        }

        /**
         * Send and save data to server
         * @param {*} inputMailId 
         */
        _formactions.dataToServer = function(inputMailId) {
            if($('#btn-valid').hasClass('disabled')) return;
            let data = [];
            // prepare data
            let coords = $('#input-autocomplete-form').attr('coordinates').split(',');
            coords = ol.proj.transform(coords, 'EPSG:4326', 'EPSG:3948');
            
            let WKT = `POINT(${coords[0]} ${coords[1]})`;

            $('.input-day-zone').each((i, el) => {
                let id = $(el).attr('id');

                let infos = this.getDayInfos(id);

                if(infos.absence) {
                    data.push({
                        absence: infos.absence,
                        shape: WKT,
                        jour: id
                    })    
                } else {
                    data.push( {
                        moytranspid: infos.modeInId || '',
                        jour: id,
                        horaire: infos.clockIn,
                        mouvement: "A",
                        shape: WKT
                    },
                    {
                        moytranspid: infos.modeOutId || '',
                        jour: id,
                        horaire: infos.clockOut,
                        mouvement: "D",
                        shape: WKT
                    })
                }
            })

            let mail = $('#'+inputMailId).text();
            let params = `email=${mail}&data=${JSON.stringify(data)}`;

            // send data request
            cartoHoraireApi.request(
                params,
                function(e) {
                    if(e && e.length && e[0]) e = e[0];
                    if(e && e.success && e.valid) {
                        mviewer.alert(messages.text.saveAndLogout, "alert-success");
                        _formactions.logout();
                    } else if(e.status && !e.status === 'error' && !e.valid) {
                        messages.create(
                            '#inputFormMsg', 
                            messages.text.loginRequired,
                            '#c52a0d'
                        );
                    } else {
                       messages.create(
                            '#inputFormMsg', 
                            messages.text.saveError,
                            '#ff6600',
                            null,
                            0
                        );
                        
                        _formactions.logout(false);
                    }
                },
                'PUT',
                'updateUserInfos'
            )
        }

        /**
         * Valid email to get new password with message label
         * @param {Objet} input ==> input html
         */
        _formactions.validMailCode = function(input) {
            if(!_formactions.isMailValid(input.value)) {
                messages.create(
                    '#getCodeMsg',
                    messages.text.emailInvalid,
                    '#c52a0d'
                );
            }
        }
        
        /**
         * Change validation button attribute on email format control
         * @param {Objet} input ==> input html
         * @param {String} id 
         */
        _formactions.emailButtonState = function(input, id) {
            if(_formactions.isMailValid(input.value)) {
                $('#'+id).removeClass('disabled');
                $('#code-mail').removeClass('invalid');
            } else {
                $('#code-mail').addClass('invalid');
                $('#'+id).addClass('disabled');
            }
        }

        /**
         * Create or ask new password if account already exists
         * @param {String} inputMail 
         * @param {Function} callback 
         */
        _formactions.createNewPassword = function (inputMail, callback = null) {
            function onResponse() {
                if ($("#code-modal").is(':visible')) {
                    $("#code-modal").modal('toggle');
                }
                $('#code-mail').val('');
            }
            inputMail = $('#'+inputMail);
            if(_formactions.isMailValid($(inputMail).val())) {
                $('#code-mail').removeClass('invalid');
                // send data request
                cartoHoraireApi.request(
                    {
                        email:$(inputMail).val()
                    },
                    function(e) {
                        if(callback) return callback(e);
                        // we find data and load data
                        if(e && e.length && e[0]) e = e[0];
                        if(e && e.success) {
                            messages.create(
                                '#getCodeMsg',
                                messages.text.newPasswordSend,
                                '#13ab00', onResponse
                            );
                        } else if(e && !e.success && e.exception && e.exception.code == -1) {
                            messages.create(
                                '#getCodeMsg',
                                messages.text.userNotExists,
                                '#c52a0d', onResponse
                            );
                        } else {
                            messages.create(
                                '#getCodeMsg',
                                messages.text.systemError,
                                '#ff6600', onResponse
                            );
                        }
                    },
                    'POST',
                    'updateUserPassword'
                );
            } else {
                $('#'+id).addClass('disabled');
                messages.create(
                    '#getCodeMsg',
                    messages.text.emailInvalid,
                    '#c52a0d'
                );
            }
        }

        /**
         * Control email value and execute request if valid
         * @param {String} inputMail email input id with email value
         * @param {Function} callback to execute on request success or error
         */
        _formactions.validFirstConnexionForm = function (inputMail, callback) {
            inputMail = $('#'+inputMail);
            if(_formactions.isMailValid($(inputMail).val())) {
                callback({
                    email:$(inputMail).val()
                }, cartoHoraireApi.createNewPassword, 'POST', 'createUser');
            }
        }

        /**
         * Clear all layer's features
         */
        _formactions.clearLayer = function() {
            if(_formactions.vectorLayer) {
                _formactions.vectorLayer.getSource().clear();
            }
        }
        /**
         * Clear last search result from map
        */
        _formactions.clearSearch = function() {
            _formactions.clearLayer();
            $('#ch-searchfield-form .delete').hide();
            $('#ch-searchfield-form .result').show();
        }

        /**
         * Insert new feautre to minimap layer
         * @param {ol.Feature} feature 
         */
        _formactions.addFeature = function(feature) {
            let opt = mviewer.customComponents.cartohoraires.config.options.sirenConfig || null;
            let iconStyle = new ol.style.Style({
                image: new ol.style.Icon({
                    anchor: [0.5, 46],
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'pixels',
                    src: opt && opt.icon || null,
                    scale: 0.9
                }),
            });
            feature.setStyle(iconStyle);
            let src = _formactions.vectorLayer.getSource();
            let map = _formactions.map;

            if(map && src) {
                src.addFeature(feature);
                map.getView().setCenter(feature.getGeometry().getCoordinates());
                map.getView().setZoom(17);
            }
        }

        /**
         * Init form mini map
         */
        _formactions.initMapForm = function () {
            if(_formactions.map) return;
            let vectorFormSource = new ol.source.Vector({
                features: []
            });
              
            let vectorFormLayer = new ol.layer.Vector({
                source: vectorFormSource
            });

            _formactions.vectorLayer = vectorFormLayer;

            let baselayer = {
                attribution: `<a href="https://public.sig.rennesmetropole.fr/geonetwork/srv/fre/catalog.search#/home" target="_blank" >Rennes Métropole</a>`,
                format: "image/png",
                fromcapacity: "false",
                id: "pvcisimplegrisb",
                label: "Plan de ville simple gris",
                layers: "ref_fonds:pvci_simple_gris",
                matrixset: "EPSG:3857",
                style: "_null",
                thumbgallery: "apps/public/img/basemap/pvcisimple.jpg",
                title: "Rennes Metropole",
                type: "WMTS",
                url: "https://public.sig.rennesmetropole.fr/geowebcache/service/wmts?",
                visible: "true",
                projection : mviewer.getMap().getView().getProjection()
            }

            let matrixset = baselayer.matrixset;
            let projectionExtent = baselayer.projection.getExtent();
            let wmtsLayer = new ol.layer.Tile({
                opacity: 1,
                visible:true,
                source: new ol.source.WMTS({
                    url:  baselayer.url,
                    crossOrigin: 'anonymous',
                    layer: baselayer.layers,
                    matrixSet: matrixset,
                    style: baselayer.style,
                    format: baselayer.format,
                    attributions: baselayer.attribution,
                    projection: baselayer.projection,
                    tileGrid: new ol.tilegrid.WMTS({
                        origin: ol.extent.getTopLeft(projectionExtent),
                        resolutions: utils.getWMTSTileResolutions(matrixset),
                        matrixIds: utils.getWMTSTileMatrix(matrixset)
                    })
                })
            });
            wmtsLayer.set('name', baselayer.label);
            wmtsLayer.set('blid', baselayer.id);

            let olMapSearch = new ol.Map({
                layers: [wmtsLayer, vectorFormLayer],
                target: 'mapSearch',
                view: new ol.View({
                  center: [-174188.8161504358, 6126632.048479025],
                  zoom: 10.621749404814972,
                })
            });

            _formactions.map = olMapSearch;

            let opt = mviewer.customComponents.cartohoraires.config.options.sirenConfig || null;

            let iconStyle = new ol.style.Style({
                image: new ol.style.Icon({
                    anchor: [0.5, 46],
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'pixels',
                    src: opt && opt.icon || null,
                    scale: 0.9
                }),
            });
            
            // event on siren or adress search
            document.addEventListener("localize", function(e) {

                if(!e || !e.detail || !e.detail.coord.length > 1 || 
                    !e.detail.coord || !e.detail.target || e.detail.target != 'search-radio-form') return;                
                _formactions.clearSearch();

                let coords = e.detail.coord.map(a => parseFloat(a));
                mviewer.zoomToLocation(coords[0], coords[1], 15, null);
                coords = ol.proj.transform(coords, 'EPSG:4326', 'EPSG:3857');

                let feature = new ol.Feature({
                    geometry: new ol.geom.Point(coords),
                    style: iconStyle
                });
                _formactions.addFeature(feature);
                

                $('#ch-searchfield-form .result').hide();
                $('#ch-searchfield-form .delete').show();
                // valid
                _formactions.validSendBtn();
            });
            $('#ch-searchfield-form').click(function(e) {
                _formactions.clearSearch();
                _formactions.validSendBtn();
            });
            // valid
            _formactions.validSendBtn();
        }
        return _formactions;
    }

    // We need that our library is globally accesible, then we save in the window
    if(typeof(window.formactions) === 'undefined'){
      window.formactions = formactions();
    }
  })(window); // We send the window variable withing our function