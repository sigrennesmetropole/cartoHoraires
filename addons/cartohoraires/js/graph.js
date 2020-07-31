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
     * @param {Function} filterFunction as callback
     */
    constructor (data, filterFunc ) {
        this.filterFunc = filterFunc;
        this.data = data;
    }
}