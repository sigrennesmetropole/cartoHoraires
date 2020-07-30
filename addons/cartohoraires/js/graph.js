/**
 * Create new graph from Chart.Js
 * 
 * Needs JQUERY >=1.2.
 */

class Graph {
    data = null;
    filterfunc = null;
    /**
     * Constructor
     * @param {Object} target as Jquery HTML component
     * @param {Object} list as Jquery HTML component
     * @param {Function} search as function to search wathever from your favorite API
     * @param {Function} html as function to create HTML List (as JQuery Object) content
     */
    constructor (data, filterFunc, ) {
        this.filterFunc = filterFunc;
        this.data = data;
    }
}