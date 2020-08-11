(function(window){
    // You can enable the strict mode commenting the following line  
    // 'use strict';
  
  
    // This function will contain all our code
    function cartoHoraireApi(){
        let _cartoHoraireApi = {};
    
        // This variable will be inaccessible to the user, only can be visible in the scope of your library.
        const api = 'http://testapp.sig.rennesmetropole.fr/api-horaires/public/'
        
        const url = {
            getTransport: api+  'moytransp',
            getTransports: api + 'getTransport',
            logoutUser: api + 'logoutUser',
            deleteUserInfos : api + 'deleteUserInfos',
            loginUser: api + 'loginUser',
            updateUserPassword: api + 'updateUserPassword',
            createUser: api + 'createUser',
            verifyIndividu: api + 'individu',
            getUserId: api + 'individu' + '/id',
            verifyMail: api + 'individu' + '/existemail',
            horaire: api + '/horaire',
            getUserInfos: api + '/getUserInfos',
            updateUserInfos: api + '/updateUserInfos',
            absence: api + '/absence',
            getAbsenceType: api + 'getTypesAbsences'
        };
        

        /**
         * Query API
         * @param {Object*} data as query params object
         * @param {Function} callback to execute on query response
         * @param {String} type as HTTP requet type
         */
        _cartoHoraireApi.getTransports = function(data = {}, callback, type = 'GET'){
            if(!callback) return;

            const promise = new Promise((resolve, reject) => {
                $.ajax({
                    url: url.getTransports,
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
                callback(v);
            }).catch((e) => {
                callback(e);
            })
        };

        return _cartoHoraireApi;
    }
  
    // We need that our library is globally accesible, then we save in the window
    if(typeof(window.cartoHoraireApi) === 'undefined'){
      window.cartoHoraireApi = cartoHoraireApi();
    }
  })(window); // We send the window variable withing our function