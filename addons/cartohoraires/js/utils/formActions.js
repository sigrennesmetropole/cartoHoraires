(function(window){

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
     * Ser user form info from serveur response
     * @param {Object} horaire 
     */
    function setData(horaire) {
        horaire.forEach((el) => {
            let id = el.id;
            modeVal = cartohoraires.getTransportList().filter(i => el.moytranspid === i.id)[0].libelle;

            // to detect format as HH:mm:ss or HH:mm
            if((el.horaire.split(':').length > 2)) {
                horaire = moment(el.horaire, 'HH:mm:ss').format('HH:mm');
            } else {
                horaire = moment(el.horaire, 'HH:mm').format('HH:mm');
            }

            if(el.mouvement === 'A') {
                $('#clockpicker-in-' + id).val(horaire);
                $('#transport-in-select-' + id).val(modeVal);
            } else {
                $('#clockpicker-out-' + id).val(horaire);
                $('#transport-out-select-' + id).val(modeVal);
            }
        });
    }

    /**
     * Call validators lib from global public scope
     */
    function validators(){
        let _validators = {};

        /**
         * Control input string on input event
         * @param {String} inputMailId 
         */
        _validators.validInput = function (inputMailId ) {
            $('#'+inputMailId).on('input', function() {

                var input=$(this);
                if(!input.prop('required')) return;

                if(_validators.isMailValid(input.val())){
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
        _validators.isMailValid = function (val ) {
            return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(val);
        }

        /**
         * Control email and code to request connection according to authent
         * @param {String} inputMailId 
         * @param {String} inputCodeId 
         * @param {Function} callback 
         */
        _validators.validConnexionForm = function (inputMailId, inputCodeId, callback) {
            // we valid email format
            if(_validators.isMailValid($('#'+inputMailId).val())) {
                // if email format is valid we request connexion with code and email params
                callback(
                    {email: $('#'+inputMailId).val(), code: $('#'+inputCodeId).val()},
                    function(e) {
                        if(e.length && e[0]) e = e[0];
                        if(e.err) {
                            // code or email is not valid
                            alert('Code ou email erroné !');
                        } else {
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
                                    e = e.length && e[0] ?  e = e[0] : e;
                                    if(!e.success) {
                                        return alert('Vos informations n\'ont pas pu être récupérées');
                                    }
                                    // we find data and load data
                                    if(e.success && e.horaire.length) {
                                        // we dispatch data info wit event
                                        var event = new CustomEvent('loadUserInfos', { 'detail': e.horaire });
                                        document.dispatchEvent(event);
                                        // use this to listen => document.addEventListener('dateChange', function (e) {});
                                        setData(e.horaire);
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

        _validators.duplicateDay = function(idDay) {
            let outClock = $('#clockpicker-out-' + idDay).val();
            let outMode = $('#transport-out-select-' + idDay).val();
            
            let inClock = $('#clockpicker-in-' + idDay).val();
            let inMode = $('#transport-in-select-' + idDay).val();

            $('.input-day-zone').each((i, el) => {
                let id = el.id ? el.id : 0;
                if(parseFloat(id) != idDay) {
                    // A
                    $('#clockpicker-in-' + id).val(inClock);
                    $('#transport-in-select-' + id).val(inMode);
                    // D
                    $('#clockpicker-out-' + id).val(outClock);
                    $('#transport-out-select-' + id).val(outMode);
                }
            })
        }

        _validators.logout = function() {
            let email = $('#email-id').text();
            if(!email) return;
            cartoHoraireApi.request(
                {email: email},
                function(e) {
                    // we find data and load data
                    if(e.length && e[0]) e = e[0];
                    if(e.success && !e.err) {
                        resetForm(false);
                        alert('Deconnexion !');
                    } else {
                        alert('Une erreur technique s\'est produite !');
                    }
                },
                'POST',
                'logoutUser'
            )
        }

        _validators.restore = function(e) {
            return resetForm(e);
        }

        _validators.deleteInfos = function() {
            let email = $('#email-id').text();
            let code = prompt("Merci de confirmer votre code d'identification:", "*****");
            if(!code || !code.length) return;
            cartoHoraireApi.request(
                {email: email, code: code},
                function(e) {
                    // we find data and load data
                    if(e.length && e[0]) e = e[0];
                    if(e.success) {
                        alert('Vos informations ont été supprimées !');
                        logout();
                    } else {
                        alert('Vos informations n\'ont pas pu être supprimées !');
                    }
                },
                'DELETE',
                'deleteUserInfos'
            )
        }

        _validators.getDayInfos = function(idDay) {
            let modeOutId, modeInId;

            let clockIn =  $('#clockpicker-in-' + idDay);
            let clockOut = $('#clockpicker-out-' + idDay);
            let modeIn = $('#transport-in-select-' + idDay);
            let modeOut = $('#transport-out-select-' + idDay);

            if(modeIn.length) {
                let modeInVal = modeIn.val();
                modeInId = cartohoraires.getTransportList().filter(i => i.libelle === modeInVal);
                modeIn = modeInId.length ? modeInId[0].id : '';
            }
            
            if(modeOut.length) {
                modeOutVal = modeOut.val();
                modeOutId = cartohoraires.getTransportList().filter(i => i.libelle === modeOutVal);
                modeOut = modeOutId.length ? modeOutId[0].id : '';
            }

            return {
                modeInId: modeIn,
                modeOutId: modeOut,
                clockIn: clockIn.val(),
                clockOut: clockOut.val()
            }
        }

        _validators.validDataToServer = function(inputMailId) {
            let data = [];
            // prepare data
            let coord = $('#input-autocomplete-form').attr('coordinates').split(',');
            coord = ol.proj.transform(coord, 'EPSG:4326', 'EPSG:3948');
            
            let WKT = `POINT(${coord[0]} ${coord[1]})`;

            $('.input-day-zone').each((i, el) => {
                let id = $(el).attr('id');

                let infos = this.getDayInfos(id);

                data.push( {
                    moytranspid: infos.modeInId || '',
                    jour: id,
                    horaire: infos.clockIn,
                    mouvement: "A",
                    datesaisie: moment().format('HH:mm'),
                    caduc: false,
                    shape: WKT
                },
                {
                    moytranspid: infos.modeOutId || '',
                    jour: id,
                    horaire: infos.clockOut,
                    mouvement: "D",
                    datesaisie: moment().format('HH:mm'),
                    caduc: false,
                    shape: WKT
                })
            })

            let mail = $('#'+inputMailId).text();
            let params = `email=${mail}&data=${JSON.stringify(data)}`;
            

            // send data request
            cartoHoraireApi.request(
                params,
                function(e) {
                    if(e.length && e[0]) e = e[0];
                    if(e.success && e.valid) {
                        alert('Informatios sauvegardées !');
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

        _validators.validServerToData = function(mail) {
            let data = {
                email: mail,
            };
            // send data request
            cartoHoraireApi.request(
                data,
                function(e) {
                    // we find data and load data
                    if(e.length && e[0]) e = e[0];
                    if(e.success && e.horaire.length) {
                        // we dispatch data info wit event
                        var event = new CustomEvent('loadUserInfos', { 'detail': e.horaire });
                        document.dispatchEvent(event);
                        // use this to listen => document.addEventListener('dateChange', function (e) {});
                        // prepare data
                        setData(e.horaire);
                    } else {
                        alert('Vos informations n\'ont pas pu être récupérées');
                    }
                },
                'GET',
                'getUserInfos'
            )
        }

        _validators.createNewPassword = function (inputMail, callback = null) {
            inputMail = $('#'+inputMail);
            if(_validators.isMailValid($(inputMail).val())) {
                $('#code-mail').removeClass('invalid');
                // send data request
                cartoHoraireApi.request(
                    {
                        email:$(inputMail).val()
                    },
                    function(e) {
                        if(callback) return callback(e);
                        // we find data and load data
                        if(e.length && e[0]) e = e[0];
                        if(e.success) {
                            alert('Un mot nouveau mot de passe vient de vous être envoyé par mail !');
                        } else if(!e.success && e.exception && e.exception.code == -1) {
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
        _validators.validFirstConnexionForm = function (inputMail, callback) {
            inputMail = $('#'+inputMail);
            if(_validators.isMailValid($(inputMail).val())) {
                callback({
                    email:$(inputMail).val()
                }, cartoHoraireApi.createNewPassword, 'POST', 'createUser');
            }
        }

        return _validators;
    }

    // We need that our library is globally accesible, then we save in the window
    if(typeof(window.validators) === 'undefined'){
      window.validators = validators();
    }
  })(window); // We send the window variable withing our function