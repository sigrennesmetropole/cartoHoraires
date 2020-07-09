const cartohoraires = (function() {
    let config = mviewer.customComponents.cartohoraires.config;
    let options = mviewer.customComponents.cartohoraires.config.options;
    /**
     * Standardize request creation
     * @param {Object} infos as data params
     * @param {*} successFunc as callback function
     */
    const createRequest = function(infos, successFunc) {
        return {
            url:infos.url,
            data: infos.data,
            success: function (r) {
                infos.success(r);
            }
        };
    }

    /**
     * Request to call Mustache template from server or local path.
    */
    const initTemplate = function () {
        let req = createRequest({
            url: options.template,
            success: function(template) {
                config.template = template;
                displayTemplate(template);
            }
        });
        $.ajax(req);
    }
        /**
     * Method from Mviewer from features to template.
     * Manage display / hide and content from mustache template.
     * @param {Array} features - Array of OpenLayers features
     * @param {Object} configuration - Mviewer configuration
     */
    function displayTemplate (template) {
        // render mustache file
        var panelContent = Mustache.render(template);
        if(configuration.getConfiguration().mobile) {
            // hide classic panel
            $('.cartohoraires-panel').hide();
            // clean modal content
            $("#cartohoraires-modal .modal-body").children().remove();
            // add to modal
            $("#cartohoraires-modal .modal-body").append(panelContent);
        } else {
            // close modal if visible
            if($("#cartohoraires-modal").is(':visible')){$("#cartohoraires-modal").modal('toggle');}
            // clean classic panel
            $(".cartohoraires-panel .panel-body").children().remove();
            // add to classic panel
            $(".cartohoraires-panel .panel-body").append(panelContent);
        }
    }

    function initModalBehavior() {
        mviewer.getMap().once('postrender', m => {
            $('#mobilebtn-el').on('click', function() {
                $("#cartohoraires-modal").modal('toggle');
            });
        });
    }

    function initDisplayComponents() {
        mviewer.getMap().once('postrender', m => {
            if(!configuration.getConfiguration().mobile) {
                $('#map').attr('style',`width:${options.mapWidth}% !important`);
            }
            $('#zoomtoolbar').css('right',`${options.templateWidth + 2}%`);
            $('#toolstoolbar').css('right',`${options.templateWidth + 2}%`);
        });

    }

    return {
        init : () => {
            console.log('init cartohoraires module');
            initDisplayComponents();
            initTemplate();
            initModalBehavior();            
        },
    };
})();

new CustomComponent("cartohoraires", cartohoraires.init)