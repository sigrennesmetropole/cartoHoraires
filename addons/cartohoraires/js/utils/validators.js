(function(window){

    function getHalf(min) {
        min = parseFloat(min);
        let def = 0;
        if(min > 0 && min <= 15) {
            def = 15;
        } else if(min > 15 && min <=30) {
            def = 30;
        } else if(min > 30 && min <= 45) {
            def = 45;
        } else if(min > 45 && min < 0) {
            def = 0
        }
        return `${def}`;
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
                $('#transport-arr-select-' + id).val(modeVal);
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

        _validators.validDataToServer = function(inputMailId) {
            let data = [];
            // prepare data
            $('.input-day-zone').each((i, el) => {
                let id = $(el).attr('id');
                let clockIn =  $('#clockpicker-in-' + id);
                let clockOut = $('#clockpicker-out-' + id);
                let modeIn = $('#transport-arr-select-' + id);
                let modeOut = $('#transport-out-select-' + id);

                let hIn = moment(clockIn.val(), 'HH:mm');
                hIn = hIn.format('HH') + getHalf(hIn.format('mm'));

                let hOut = moment(clockOut.val(), 'HH:mm');
                hOut = hOut.format('HH') + getHalf(hOut.format('mm'));
                
                let modeInVal = modeIn.val();
                let modeOutVal = modeOut.val();

                modeInId = cartohoraires.getTransportList().filter(i => i.libelle === modeInVal);
                modeInId = modeIn.length ? [0].id : '';
                modeOutId = cartohoraires.getTransportList().filter(i => i.libelle === modeOutVal);
                modeOutId = modeOutId.length ? [0].id : '';

                data.push( {
                    moytranspid: modeInId || '',
                    jour: id,
                    horaire: hIn,  //clockIn.val(),
                    mouvement: "A",
                    datesaisie: moment().format('HH:mm:ss'),
                    caduc: false
                },
                {
                    moytranspid: modeOutId || '',
                    jour: id,
                    horaire: hOut, // clockOut.val(),
                    mouvement: "D",
                    datesaisie: moment().format('HH:mm:ss'),
                    caduc: false
                })
            })

            let mail = $('#'+inputMailId).val();
            let params = `email=${mail}&data=${JSON.stringify(data)}`;
            

            // send data request
            cartoHoraireApi.request(
                params,
                function(e) {
                    if(e.length && e[0]) e = e[0];
                    if(e.success && e.valid) {
                        alert('Informatios sauvegardées !');
                    } else if(!e.valid) {
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