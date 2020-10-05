const mir = (function() {
    let map = mviewer.getMap();
    const element = () => {return document.getElementById('mir-marker')};
    const options = mviewer.customComponents.mir.config.options;
    let isVisible = null;
    
    return {
        init: () => {
            let marker = new ol.Overlay({
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

                    if(isVisible === false) {
                        element().style.display='none';
                    }
                }
            });
        },

        deactivate: () => {
            isVisible = false;
        },

        activate: () => {
            isVisible = true;
        }
    };
})();
new CustomComponent("mir", mir.init);