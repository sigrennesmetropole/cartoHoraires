(function() {
    var map = mviewer.getMap();
    
    map.on('postrender', m => {
        if(!configuration.getConfiguration().mobile && mviewer.customComponents.mobilebtn.config.options.mobileonly) {
            $('#mobilebtn-el').remove();
        }
    });
})();