/**
 * Create new graph from Chart.Js
 * 
 * Needs JQUERY >=1.2.
 */

class Graph {
    target = null;
    chart = null;
    features = [];
    /**
     * Constructor
     * @param {Object} target as Jquery HTML component
     * @param {Function} filterFunction as callback
     */
    constructor (target) {
        this.target = target;
        this.createGraph();
    }

    /**
     * Prepare data to display into chart bar
     */
    getInfos() {
        let horairesCount = {};
        this.features.forEach(e => {
            let h = e.getProperties().horaire;
            h = moment(h, 'HH:mm:ssZ').subtract(2, 'hours').format('HH:mm');
            if(!horairesCount[h]) {
                horairesCount[h] = 0;
            }
            horairesCount[h]+=1;
        });

        let labels = Object.keys(horairesCount);
        let values = labels.map(e => horairesCount[e]);
        return {
            labels: labels,
            values: values
        };
    }
    
    createGraph() {
        //this.features = mviewer.customLayers.etablissements.layer.getSource().getSource().getFeatures();
        this.features = mviewer.customLayers.etablissements.getReceiptData();
        this.infos = this.getInfos()
        
        let canvas = document.getElementById(this.target);
        
        let i = 1;
        let t = [];
        let labels = [];
        while (i<96) {
            if(i*15 <1201 && i*15 >419) {
                t.push(i);
                labels.push(i.toString());
            }
            i+=1;
        }
        var data = {
            labels: this.infos.labels,
            datasets: [{
                backgroundColor: "rgba(83,179,184,0.8)",
                strokeColor: "rgba(83,179,184,0.8)",
                data: this.infos.values
            }]
        }
        var options = {
            responsive:true,
            animation: {
                duration:5000
            },
            legend: {
                display: false
             }
        };
        
        this.chart = Chart.Bar(canvas,{
            data:data,
            options:options
        });

        $('.emptyGraph').hide();
    }

    getChart = function() {
        if(this.chart) {
            return this.chart;
        }
    }
}