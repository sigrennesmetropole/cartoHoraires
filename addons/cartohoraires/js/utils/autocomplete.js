/**
 * This class allow to use API with input HTML
 * Result panel and API search beahvier was fully mandatory.
 * This component have no default behavior to search and display results.
 * 
 * Needs JQUERY >=1.2.
 */
class Autocomplete {
    /**
     * Constructor
     * @param {Object} target as Jquery HTML component
     * @param {Object} list as Jquery HTML component
     * @param {Function} search as function to search wathever from your favorite API
     * @param {Function} html as function to create HTML List (as JQuery Object) content
     */
    constructor(target, list, search, html) {
        this.target = target;
        this.listTarget = list;
        this.search = search;
        this.html = html;
    }

    set Search(func) {
        this.search = func;
    }
    set Target(func) {
        this.target = func;
    }
    set ListTarget(func) {
        this.listTarget = func;
    }
    set Html(func) {
        this.html = func;
    }
    get Search() {
        return this.search
    }
    get Html() {
        return this.html
    }
    get ListTarget() {
        return this.listTarget
    }
    get Target() {
        return this.target
    }

    /**
     * Init input behavior under users actions
     */
    initListeners() {
        let autocomplete = this;
        let currentFocus;
        /*execute a function when someone writes in the text field:*/
        this.target.addEventListener("input", function(e) {
            let val = e.target.value;
            if (!val) {
                return false;
            }
            currentFocus = -1;
            /*close any already open lists of autocompleted values*/
            autocomplete.closeAllLists();
            /*Call API and display responses*/
            if (autocomplete.search) {
                autocomplete.search(val);
            }
        });
    }

    /**
     * Display list result
     * @param {Object} results from JSON parsed response
     */
    displayList(results) {
        // parse results
        if (this.html) {
            this.listTarget.append(this.html(results));
        }

        this.listTarget.show();
    }

    /**
     * Close all autocomplete lists in the document
     */
    closeAllLists() {
        this.listTarget.empty();
        this.listTarget.hide();
    }

    /**
     * Init behavior to close list on click out of input result box
     */
    initCloseAction() { // to trigger
        let autocomplete = this;
        document.addEventListener("click", function(e) {
            autocomplete.closeAllLists();
        });
    }

    /**
     * Selected list value to display into input search field
     * @param {String} val 
     */
    select(val) {
        $(this.target).val(val);
    }
}