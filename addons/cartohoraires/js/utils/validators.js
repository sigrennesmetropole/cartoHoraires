(function(window){

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
            let mailInput = $('#'+inputMailId.id);
            let codeInput = $('#'+inputCodeId.id);

            if(_validators.isMailValid(inputMailId)) {
                callback(mailInput.val(), codeInput.val());
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
                }, cartoHoraireApi.createNewPassword, 'GET', 'createUser');
            }
        }

        return _validators;
    }

    // We need that our library is globally accesible, then we save in the window
    if(typeof(window.validators) === 'undefined'){
      window.validators = validators();
    }
  })(window); // We send the window variable withing our function