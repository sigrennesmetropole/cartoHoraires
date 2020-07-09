(function() {
    var map = mviewer.getMap();

    var element = () => {return document.getElementById('mir-marker')};

    var options = mviewer.customComponents.mir.config.options;

    var marker = new ol.Overlay({
        position: map.getView().getCenter(),
        positioning: 'center-center',
        element: document.getElementById('mir-marker'),
        stopEvent: false
    });
      
    map.addOverlay(marker);
    
    map.on('postrender', m => {
        if(element()) {
            if(!marker.getElement()) {
                marker.setElement(document.getElementById('mir-marker'));
            }
            marker.setPosition(map.getView().getCenter())
            if(options.maxzoom && map.getView().getZoom() <= options.maxzoom) {
                element().style.display='none';
            } else {
                element().style.display='block';
            }
        }
    });
})();