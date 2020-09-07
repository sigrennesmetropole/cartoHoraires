(function(window){

    /**
     * To restore completely or simply the form
     * @param {boolean} simple 
     */
    function resetForm(simple) {
        if(!simple) {
            $('#form-modal').modal('toggle');
            $('#email-id').text('');
            $('.authent').hide();
            $('.anonymous').show();
            $('.reset').val('');
        }
        $('#btn-valid').addClass('disabled');
        cartohoraires.resetTransportList();
        $('.clock').val('08:00');
        $('.ch-absent').prop('checked', false);
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
     * Ser user form info from serveur response
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
            $('#btn-valid').removeClass('disabled');
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
            mviewer.customLayers.etablissements.updateLayer(false);
            mviewer.zoomToLocation(coords[0], coords[1], 15, null);
        }
    }

    /**
     * Call formactions lib from global public scope
     */
    function formactions(){
        let _formactions = {};

        /**
         * Control input string on input event
         * @param {String} inputMailId 
         */
        _formactions.validInput = function (inputMailId ) {
            $('#'+inputMailId).on('input', function() {

                var input=$(this);
                if(!input.prop('required')) return;

                if(_formactions.isMailValid(input.val())){
                    input.removeClass('invalid').addClass("valid");
                    return true;
                } else {
                    input.addClass("invalid");
                    input.removeClass('valid').addClass("invalid");
                    return false
                }
            });
        }
        //gaetan.bruel@jdev.fr
        /**
         * Control email value with a simple regExp
         * @param {String} val as email value
         */
        _formactions.isMailValid = function (val ) {
            return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(val);
        }

        /**
         * Control email and code to request connection according to authent
         * @param {String} inputMailId 
         * @param {String} inputCodeId 
         * @param {Function} callback 
         */
        _formactions.validConnexionForm = function (inputMailId, inputCodeId, callback) {
            // we valid email format
            if(_formactions.isMailValid($('#'+inputMailId).val())) {
                // if email format is valid we request connexion with code and email params
                callback(
                    {email: $('#'+inputMailId).val(), code: $('#'+inputCodeId).val()},
                    function(e) {
                        if(e && e.length && e[0]) e = e[0];
                        if(!e.exist) {
                            return alert('Vous devez créer un compte avant de vous connecter !');
                        }
                        else if (!e.auth) {
                            // code or email is not valid
                            return alert('Connexion impossible : Code ou email erroné !');
                        } else if(e.auth && e.exist && e.success) {
                            $('.anonymous').hide();
                            $('.authent').show();
                            $('#email-id').text($('#'+inputMailId).val());
                            
                            // enable valid button if user have selected location to
                            if($('#input-autocomplete-form').attr('coordinates')) {
                                $('#btn-valid').removeClass('disabled');
                            }

                            // user code exist and match we will request user's infos
                            cartoHoraireApi.request(
                                {email: $('#'+inputMailId).val()},
                                function(e) {
                                    e = e && e.length && e[0] ?  e = e[0] : e;
                                    if(!e || !e.success) {
                                        return alert('Vos informations n\'ont pas pu être récupérées !');
                                    }
                                    // we find data and load data
                                    if(e && e.success && e.horaire.length) {
                                        // we dispatch data info wit event
                                        var event = new CustomEvent('loadUserInfos', { 'detail': e.horaire });
                                        document.dispatchEvent(event);
                                        // use this to listen => document.addEventListener('dateChange', function (e) {});
                                        return setData(e.horaire);
                                    }
                                },
                                'GET',
                                'getUserInfos'
                            )
                        }
                    },
                    'POST',
                    'loginUser'
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
            })
        }

        /**
         * Logout
         */
        _formactions.logout = function() {
            let email = $('#email-id').text();
            if(!email) return;
            _formactions.clearSearch();
            cartoHoraireApi.request(
                {email: email},
                function(e) {
                    // we find data and load data
                    if(e && e.length && e[0]) e = e[0];
                    if ((!e || !e.success) && e.exception) {
                        alert(e.exception.message || 'Une erreur technique s\'est produite !');
                    }
                    else if (e.success) {
                        resetForm(false);
                        mviewer.customLayers.etablissements.updateLayer(true, null, function() {
                            mviewer.customLayers.etablissements.zoomToExtent();
                        });
                    }
                },
                'POST',
                'logoutUser'
            )
        }

        /**
         * Trigger restore form UI
         * @param {boolean} e 
         */
        _formactions.restore = function(e) {
            return resetForm(e);
        }

        /**
         * Delete infos and user
         */
        _formactions.deleteInfos = function() {
            let email = $('#email-id').text();
            let code = prompt("Merci de confirmer votre code d'identification:", "*****");
            if(!code || !code.length) return;
            cartoHoraireApi.request(
                {email: email, code: code},
                function(e) {
                    // we find da,ta and load data
                    if(e && e.length && e[0]) e = e[0];
                    if(e && e.success) {
                        alert('Vos informations ont été supprimées !');
                        _formactions.logout();
                    } else {
                        alert('Vos informations n\'ont pas pu être supprimées !');
                    }
                },
                'DELETE',
                'deleteUserInfos'
            )
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
            let coords4326 = coords.map(e => parseFloat(e));
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
                        alert('Informations sauvegardées !');
                        mviewer.customLayers.etablissements.updateLayer(false);
                    } else if(e.status && !e.status === 'error' && !e.valid) {
                        alert('Vous devez être connecté pour saisir vos informations !');
                    } else {
                        alert('Vos informations n\'ont pas  pu être sauvegardées !');
                    }
                },
                'PUT',
                'updateUserInfos'
            )
        }

        /**
         * TO get info user from server and display this infos to form
         * @param {String} mail 
         */
        _formactions.serverToForm = function(mail) {
            let data = {
                email: mail,
            };
            // send data request
            cartoHoraireApi.request(
                data,
                function(e) {
                    // we find data and load data
                    if(e && e.length && e[0]) e = e[0];
                    if(e && e.success && e.horaire.length) {
                        // we dispatch data info wit event
                        var event = new CustomEvent('loadUserInfos', { 'detail': e.horaire });
                        document.dispatchEvent(event);
                        // use this to listen => document.addEventListener('dateChange', function (e) {});
                        // prepare data
                        return setData(e.horaire);
                    } else {
                        alert('Vos informations n\'ont pas pu être récupérées');
                    }
                },
                'GET',
                'getUserInfos'
            )
        }

        /**
         * Create or ask new password if account already exists
         * @param {String} inputMail 
         * @param {Function} callback 
         */
        _formactions.createNewPassword = function (inputMail, callback = null) {
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
                            alert('Un mot nouveau mot de passe vient de vous être envoyé par mail !');
                        } else if(e && !e.success && e.exception && e.exception.code == -1) {
                            alert("Votre mail n'est pas reconnu. Veuillez créer un compte !");
                        } else {
                            alert("Une erreur est survenue. Merci de contacter un administrateur.");
                        }
                    },
                    'POST',
                    'updateUserPassword'
                )
                if ($("#code-modal").is(':visible')) {
                    $("#code-modal").modal('toggle');
                }
                $('#code-mail').val('');
            } else {
                $('#code-mail').addClass('invalid');
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
            var iconStyle = new ol.style.Style({
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
                thumbgallery: "apps/public/img/basemap/pvcilight.jpg",
                title: "Rennes Metropole",
                type: "WMTS",
                url: "https://public.sig.rennesmetropole.fr/geowebcache/service/wmts?",
                visible: "true",
                projection : mviewer.getMap().getView().getProjection()
            }

            var matrixset = baselayer.matrixset;
            var projectionExtent = baselayer.projection.getExtent();
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

            var iconStyle = new ol.style.Style({
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
            });
            $('#ch-searchfield-form').click(function(e) {
                _formactions.clearSearch();
            });
        }
        return _formactions;
    }

    // We need that our library is globally accesible, then we save in the window
    if(typeof(window.formactions) === 'undefined'){
      window.formactions = formactions();
    }
  })(window); // We send the window variable withing our function