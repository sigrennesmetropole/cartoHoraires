/**
 * This class allow to use API with input HTML
 * Result panel and API search beahvier was fully mandatory.
 * This component have no default behavior to search and display results.
 * 
 * Needs JQUERY >=1.2.
 */

class Autocomplete {
    target = null;
    search = null;
    html = null;
    listTarget = null;
    /**
     * Constructor
     * @param {Object} target as Jquery HTML component
     * @param {Object} list as Jquery HTML component
     * @param {Function} search as function to search wathever from your favorite API
     * @param {Function} html as function to create HTML List (as JQuery Object) content
     */
    constructor (target, list, search, html) {
        this.target = target;
        this.listTarget = list;
        this.search = search;
        this.html = html;
    }

    setSearch(func) {this.search = func;}
    setTarget(func) {this.target = func;}
    setListTarget(func) {this.listTarget = func;}
    setHtml(func) {this.html = func;}
    getSearch() {return this.search}
    getHtml() {return this.html}
    getListTarget() {return this.listTarget}
    getTarget() {return this.target}

    /**
     * Init input behavior under users actions
     */
    initListeners() {
        let autocomplete = this;
        let currentFocus;
        /*execute a function when someone writes in the text field:*/
        this.target.addEventListener("input", function(e) {
            let val = e.target.value;
            if (!val) { return false;}
            currentFocus = -1;
            /*close any already open lists of autocompleted values*/
            autocomplete.closeAllLists();
            /*Call API and display responses*/
            if(autocomplete.search){
                autocomplete.search(val);
            }
        });

        /**
        * Execute a function presses a key on the keyboard:
        */
        this.target.addEventListener("keydown", function(e) {
            var x = document.getElementById(this.id + "autocomplete-list");
            if (x) x = x.getElementsByTagName("div");
            if (e.keyCode == 40) {
                /*If the arrow DOWN key is pressed,
                increase the currentFocus variable:*/
                currentFocus++;
                /*and and make the current item more visible:*/
                addActive(x);
            } else if (e.keyCode == 38) { //up
                /*If the arrow UP key is pressed,
                decrease the currentFocus variable:*/
                currentFocus--;
                /*and and make the current item more visible:*/
                addActive(x);
            } else if (e.keyCode == 13) {
                /*If the ENTER key is pressed, prevent the form from being submitted,*/
                e.preventDefault();
                if (currentFocus > -1) {
                    /*and simulate a click on the "active" item:*/
                    if (x) x[currentFocus].click();
                }
            }
        });
    }

    /**
     * Display list result
     * @param {Object} results from JSON parsed response
     */
    displayList = function (results) {
        // parse results
        if(this.html) {
            this.listTarget.append(this.html(results));
        }
        
        this.listTarget.show();
    }

    addActive(x) {
        if (!x) return false;
        /*start by removing the "active" class on all items:*/
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        /*add class "autocomplete-active":*/
        x[currentFocus].classList.add("autocomplete-active");
    }
    /**
    * A function to remove the "active" class from all autocomplete items:
    */
    removeActive(x) {
        for (var i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }
    /**
    * Close all autocomplete lists in the document
    */
    closeAllLists = function () {
        this.listTarget.empty();
        this.listTarget.hide();
    }

    /**
     * Init behavior to close list on click out of input result box
     */
    initCloseAction() { // to trigger
        let autocomplete = this;
        document.addEventListener("click", function (e) {
            autocomplete.closeAllLists();
        });
    }
}