/**
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This function will contain the code to display customs message
 * 
 * Last modified  : 2020-09-25
 * By gaetan.bruel@jdev.fr
 */
(function(window){

    function messages(){
        let _msg = {};

        // Change, delete or add new message from this file directly
        // This text is read as HTML
        _msg.text = {
            'createUser' : '<i class="fas fa-check-circle"></i> Un mot de passe de connexion vous est envoyé par email. Au cas où, vérifiez vos spams.',
            'userAlreadyExist': '<i class="fas fa-exclamation-circle"></i> Votre compte existe déjà. Un nouveau mot de passe vous est envoyé par email. Au cas où, vérifiez vos spams.',
            'updatePassword':'<i class="fas fa-exclamation-circle"></i> Votre compte existe déjà. Un nouveau mot de passe vous est envoyé par email. Au cas où, vérifiez vos spams.',
            'saveError': '<i class="fas fa-dizzy"></i> Votre connexion a expiré. Vos informations n\'ont pas pu être sauvegardées ! Veuillez vous reconnecter',
            'saveSuccess': 'Information sauvegardées !',
            'accountMandatory': '<i class="fas fa-exclamation-triangle"></i> Vous devez créer un compte avant de vous connecter !',
            'wrongLogin': '<i class="fas fa-exclamation-triangle"></i> Le code ou l\'email saisi est erroné !',
            'getUserInfoError': '<i class="fas fa-exclamation-triangle"></i> Vos informations n\'ont pas pu être récupérées !',
            'logoutError': '<i class="fas fa-dizzy"></i> Une erreur technique s\'est produite !',
            'deleteSuccess': '<i class="fas fa-check-circle"></i> Votre compte utilisateur et vos données sont supprimées. La confirmation de la suppression vous sera adressée par email. Au cas où, vérifiez vos spams.',
            'wrongPassword': '<i class="fas fa-exclamation-triangle"></i> Mot de passe erroné ! Merci de saisir le bon mot de passe ou d\'en demander un nouveau.',
            'loginRequired': '<i class="fas fa-exclamation-triangle"></i> Vous devez être connecté pour saisir vos informations !',
            'newPasswordSend': '<i class="fas fa-check-circle"></i> Un mot nouveau mot de passe vient de vous être envoyé par mail. Au cas où, vérifiez vos spams.',
            'userNotExists': '<i class="fas fa-exclamation-triangle"></i> Votre mail n\'est pas reconnu. Veuillez créer un compte !',
            'systemError': '<i class="fas fa-dizzy"></i> Erreur : Merci de contacter un administrateur !',
            'emailInvalid': '<i class="fas fa-exclamation-triangle"></i> Vous devez saisir une adresse valide !',
            'saveAndLogout': 'Informations sauvegardées et utilisateur déconnecté !',
            'invalidLocation': '<i class="fas fa-exclamation-triangle"></i> Veuillez localiser votre lieu de travail'
        }
    
        /**
         * Generic method to create custom messages inside a simple component
         * 
         * @param {String} target  as css class or id. Ex : '#id' or '.redClass'
         * @param {String} msg as HTML content to display
         * @param {String} color as message text
         * @param {Function} callback allow to execute a function on message fade out
         * @param {Integer} time to configure time before display and fadeout started
         */
        _msg.create = function (target, msg, color='#70ad46', callback=null, time = 3000) {
            $(target).empty();
            $(target).css('color', color).removeClass('hide').show().append(msg);
            if (time > 0){
                setTimeout(function() {
                    $(target).fadeOut(1000, function() {
                        if(callback) {
                            callback();
                        }
                    });
                }, time);
            }
        }
                
        return _msg;
    }
  
    // We need that our library is globally accesible, then we save in the window
    if(typeof(window.message) === 'undefined'){
      window.messages = messages();
    }
  })(window); // We send the window variable withing our function