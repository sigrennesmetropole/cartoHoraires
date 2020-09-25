(function(window){
  
    // This function will contain the code
    function messages(){
        let _msg = {};
    
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