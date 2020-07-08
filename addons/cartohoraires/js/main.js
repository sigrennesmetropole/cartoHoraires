const cartohoraires = (function() {
    return {
        init : () => {
            console.log('init cartohoraires module');
        },
    };
})();

new CustomComponent("cartohoraires", cartohoraires.init)