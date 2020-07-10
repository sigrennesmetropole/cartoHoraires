const cartohoraires = (function() {
    let config = mviewer.customComponents.cartohoraires.config;
    let options = mviewer.customComponents.cartohoraires.config.options;
    const mapWidth = options.mapWidth;
    const itemsRight = options.templateWidth + 2;

    let selected = null;

    /**
     * PRIVATE
    */

    /**
     * Standardize request creation
     * @param {Object} infos as data params
     * @param {*} successFunc as callback function
     */
    const createRequest = function(infos, successFunc) {
        return {
            url: infos.url,
            data: infos.data,
            success: function(r) {
                infos.success(r);
            }
        };
    }

    /**
     * Request to call Mustache template from server or local path.
     */
    const initTemplate = function() {
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
    function displayTemplate(template) {
        // render mustache file
        var panelContent = Mustache.render(template);
        if (configuration.getConfiguration().mobile) {
            // hide classic panel
            $('.cartohoraires-panel').hide();
            // clean modal content
            $("#cartohoraires-modal .modal-body").children().remove();
            // add to modal
            $("#cartohoraires-modal .modal-body").append(panelContent);
        } else {
            // close modal if visible
            if ($("#cartohoraires-modal").is(':visible')) {
                $("#cartohoraires-modal").modal('toggle');
            }
            // clean classic panel
            $(".cartohoraires-panel .panel-body").children().remove();
            // add to classic panel
            $(".cartohoraires-panel .panel-body").append(panelContent);
        }
    }

    /**
     * Display modal on mobile device only and display it only if a user clic on button
     */
    function initModalBehavior() {
        $('#mobilebtn-el').on('click', function() {
            $("#cartohoraires-modal").modal('toggle');
        });
    }

    /**
     * Force display component for desktop device only
     */
    function initDisplayComponents() {
        if (!configuration.getConfiguration().mobile) {
            $('#map').attr('style', `width:${mapWidth}% !important`);
            $('#zoomtoolbar').attr('style', `right: ${itemsRight}% !important`);
            $('#toolstoolbar').attr('style', `right: ${itemsRight}% !important`);
        }
    }

    function initSearchItem() {
        mviewer.getMap().on('postrender', m => {
            $('.search-input').autoComplete({
                resolver: 'custom',
                minLength: 3,
                resolverSettings: {
                    requestThrottling: 50
                },
                formatResult: function (record) {
                    let txt = [record.fields.denominationunitelegale, record.fields.libellecommuneetablissement].join(', ');
                    let rec = JSON.stringify(record);
                    let str = `<div style='overflow-x:hidden;'>
                                    <a href="#" onclick='cartohoraires.searchBehavior(${rec})'>${txt}</a>
                                </div>`;
                    return {
                        value: record.datasetid,
                        text: txt,
                        html: [str]
                    };
                },
                noResultsText: '<div style="overflow-x:hidden"><span>Aucun résultat - Merci de sélectionner une adresse<span></div>',
                events: {
                    search: function (qry, callback) {
                        // let's do a custom ajax call
                        $.ajax(
                            'https://data.rennesmetropole.fr/api/records/1.0/search/',
                            {
                                data: {
                                'dataset':'base-sirene-v3-ss',
                                'q' : `denominationunitelegale = ${qry}`,
                                'rows': 5
                                }
                            }
                        ).done(function (res) {
                            callback(res.records);
                        });
                    }
                }
            });
        });
        $('.bootstrap-autocomplete.dropdown-menu').css('width','100%');
    }

    function displayResult() {
        if(selected) {
           var geom = selected.geometry.coordinates;
           mviewer.zoomToLocation(geom[0], geom[1], 16, null);
        }
    }

    function setSelected(e) {return selected = e;}

    /**
     * PUBLIC
    */

    return {
        init: () => {
            mviewer.getMap().once('postrender', m => {
                initTemplate();
                initDisplayComponents();
                initModalBehavior();
                
            });
            initSearchItem();
        },
        searchBehavior : function(e) {
            if(e) {
                setSelected(e);
                displayResult();
            }
        }
    };
})();

new CustomComponent("cartohoraires", cartohoraires.init);