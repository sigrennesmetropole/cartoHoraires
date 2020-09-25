(function(window){
  
    // This function will contain the code
    function messages(){
        let _msg = {};

        _msg.text = {
            'createUser' : '<i class="fas fa-check-circle"></i> Un mot de passe de connexion vous sera envoyé par email !',
            'userAlreadyExist': '<i class="fas fa-exclamation-circle"></i> Votre compte existe déjà. Un nouveau mot de passe vous sera envoyé par email !',
            'updatePassword':'<i class="fas fa-exclamation-circle"></i> Votre compte existe déjà. Un nouveau mot de passe vous sera envoyé par email !',
            'saveError': '<i class="fas fa-dizzy"></i> Vos informations n\'ont pas pu être sauvegardées !',
            'saveSuccess': 'Information sauvegardées !',
            'accountMandatory': '<i class="fas fa-exclamation-triangle"></i> Vous devez créer un compte avant de vous connecter !',
            'wrongLogin': '<i class="fas fa-exclamation-triangle"></i> Le code ou l\'email saisi est erroné !',
            'getUserInfoError': '<i class="fas fa-exclamation-triangle"></i> Vos informations n\'ont pas pu être récupérées !',
            'logoutError': '<i class="fas fa-dizzy"></i> Une erreur technique s\'est produite !',
            'deleteSuccess': '<i class="fas fa-check-circle"></i> Vos informations seront bien supprimées dans quelques secondes...',
            'wrongPassword': '<i class="fas fa-exclamation-triangle"></i> Mot de passe erroné ! Merci de saisir un bon mot de passe.',
            'loginRequired': '<i class="fas fa-exclamation-triangle"></i> Vous devez être connecté pour saisir vos informations !',
            'newPasswordSend': '<i class="fas fa-check-circle"></i> Un mot nouveau mot de passe vient de vous être envoyé par mail !',
            'userNotExists': '<i class="fas fa-exclamation-triangle"></i> Votre mail n\'est pas reconnu. Veuillez créer un compte !',
            'systemError': '<i class="fas fa-dizzy"></i> Erreur : Merci de contacter un administrateur !',
            'emailInvalid': '<i class="fas fa-exclamation-triangle"></i> Vous devez saisir une adresse valide !',
        }
    
        // This variable will be inaccessible to the user, only can be visible in the scope of your library.
        _msg.create = function (target, msg, color='#70ad46', callback=null, time = 5000) {
            $(target).empty();
            $(target).css('color', color).removeClass('hide').show().append(msg);
            setTimeout(function() {
                $(target).fadeOut(1000, function() {
                    if(callback) {
                        callback();
                    }
                });
            }, time);
        }
                
        return _msg;
    }
  
    // We need that our library is globally accesible, then we save in the window
    if(typeof(window.message) === 'undefined'){
      window.messages = messages();
    }
  })(window); // We send the window variable withing our function