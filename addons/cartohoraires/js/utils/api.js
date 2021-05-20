/**
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This API utils file allow you to centralize this app API URL and general request method as lib.
 * Last modified  : 2020-09-25
 * By gaetan.bruel@jdev.fr
 */
(function(window){
    function cartoHoraireApi(){
        let _cartoHoraireApi = {};
    
        // This variable will be inaccessible to the user, only can be visible in the scope of your library.
        const api = 'https://testapp.sig.rennesmetropole.fr/api-horaires/public/'
        
        // change 
        const url = {
            getMoyenTransports: api + 'getMoyenTransports',
            logoutUser: api + 'logoutUser',
            deleteUserInfos : api + 'deleteUserInfos',
            loginUser: api + 'loginUser',
            updateUserPassword: api + 'updateUserPassword',
            createUser: api + 'createUser',
            verifyIndividu: api + 'individu',
            getUserId: api + 'individu' + '/id',
            verifyMail: api + 'individu' + '/existemail',
            horaire: api + 'horaire',
            getUserInfos: api + 'getUserInfos',
            updateUserInfos: api + 'updateUserInfos',
            absence: api + 'absence',
            getAbsenceType: api + 'getTypesAbsences'
        };
        
        /**
         * Query API
         * @param {Object*} data as query params object
         * @param {Function} callback to execute on query response
         * @param {String} type as HTTP requet type
         */
        _cartoHoraireApi.request = function(data = {}, callback, type = 'GET', name){
            const promise = new Promise((resolve, reject) => {
                if(!name || !url[name]) return reject('Method name missing or not exists !');
                let requestUrl = url[name];
               
                $.ajax({
                    url: requestUrl,
                    type: type,
                    data: data,
                    datatype: 'json',
                    success: (result) => {
                        resolve(result)
                    },
                    error: (xhr, status, err) => {
                        reject({xhr, status, err});
                    }
                });
            })
            promise.then((v) => {
                if(!callback) return v;
                callback(v);
            }).catch((e) => {
                if(!callback) return e;
                callback(e);
            })
        };

        /**
         * To create new code or generate new code if already user exists
         * @param {Object} resp from serveur
         * @param {String} userEmail 
         */
        _cartoHoraireApi.createNewPassword = function (resp = false, userEmail = false) {
            //return;
            if(resp) resp = resp[0];
            if(!userEmail) userEmail = $('#fst-email-form').val();
            if(resp && resp.success && resp.exist && formactions.isMailValid(userEmail)) {
                _cartoHoraireApi.request(
                    {email: userEmail},
                    function(e) {
                        if(e && e[0].success) messages.create(
                            '#createUserMsgFirst', 
                            messages.text.userAlreadyExist,
                            '#fed500'
                        );
                    },
                    'POST',
                    'updateUserPassword'
                )
            } else if(resp && !resp.exist) {
                messages.create(
                    '#createUserMsgFirst',
                    messages.text.createUser,
                    '#fed500'
                );
            }
        }
        return _cartoHoraireApi;
    }
  
    // We need that our library is globally accesible, then we save in the window
    if(typeof(window.cartoHoraireApi) === 'undefined'){
      window.cartoHoraireApi = cartoHoraireApi();
    }
  })(window); // We send the window variable withing our function
