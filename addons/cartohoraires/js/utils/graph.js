/**
 * Create new graph from Chart.Js
 * 
 * Needs JQUERY >=1.2.
 */

class Graph {
    target = null;
    chart = null;
    features = null;
    dataSet = [];
    /**
     * Constructor
     * @param {Object} target as Jquery HTML component
     * @param {Array} features features to send to bar chart
     */
    constructor (target, features) {
        this.target = target;
        this.features = features || null;
        this.createGraph();
    }

    /**
     * Prepare data to display into chart bar
     */
    getInfos() {
        let horairesCount = {};
        let data = this.features || this.dataSet;
        data.forEach(e => {
            let p = e.properties || e.getProperties();
            if(p.horaire) {
                let h = p.horaire;
                h = moment(h, 'HH:mm:ssZ').subtract(2, 'hours').format('HH:mm');
                if(!horairesCount[h]) {
                    horairesCount[h] = 0;
                }
                horairesCount[h]+=1;
            }
        });

        let labels = Object.keys(horairesCount).sort();
        let values = labels.map(e => horairesCount[e]);

        console.log(labels);
        return {
            labels: labels,
            values: values
        };
    }
    
    /**
     * Create graph
     */
    createGraph() {
        this.dataSet = mviewer.customLayers.etablissements.getReceiptData();
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

    /**
     * return chart
     */
    getChart = function() {
        if(this.chart) {
            return this.chart;
        }
    }
}