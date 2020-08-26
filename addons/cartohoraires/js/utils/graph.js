/**
 * Create new graph from Chart.Js
 * 
 * Needs JQUERY >=1.2.
 */
class Graph {   
    /**
     * Constructor
     * @param {Object} target as Jquery HTML component
     * @param {Array} features features to send to bar chart
     */
    constructor(target, features, steps = null) {
        this.chart = null;
        this.target = target;
        this.features = features || null;
        this.dataSet = [];
        this.steps = steps;

        this.createGraph = this.newGraph;
    }

    /**
     * Prepare data to display into chart bar
     */
    getInfos() {
        let horairesCount = {};
        let data = this.features || this.dataSet;
        
        data.forEach(e => {
            let p = e.properties || e.getProperties();
            if (p.horaire) {
                let h = p.horaire;
                if (!horairesCount[h]) {
                    horairesCount[h] = 0;
                }
                horairesCount[h] += 1;
            }
        });     
        

        let labels = Object.keys(horairesCount).sort();
        let values = labels.map(e => horairesCount[e]);

        return {
            labels: labels,
            values: values
        };
    }

    groupData(data) {
        let val = this.steps;
        if(!val) return data;
        let group = {
            labels: [],
            values: []
        };
        data.labels.forEach((e,i) => {
            let start = moment(e,'HH:mm'); 
            let remainder = val - (start.minute() % val); 
            let dateTime = moment(start).add(remainder, "minutes").format("HH:mm");
            let idx = group.labels.indexOf(dateTime);
            if(idx < 0) {
                group.labels.push(dateTime);
                group.values.push(data.values[i]);
            } else {
                // we create addition for same label to avoid multi same graph labels
                group.values[idx] = group.values[idx] + data.values[i];
            }
        });
        return group;
    }

    /**
     * Create graph
     */
    newGraph() {
        this.dataSet = mviewer.customLayers.etablissements.getReceiptData();
        this.infos = this.getInfos()

        if(this.steps) {
            this.infos = this.groupData(this.infos);
        }

        let canvas = document.getElementById(this.target);

        let i = 1;
        let t = [];
        let labels = [];
        while (i < 96) {
            if (i * 15 < 1201 && i * 15 > 419) {
                t.push(i);
                labels.push(i.toString());
            }
            i += 1;
        }

        var data = {
            labels: this.infos.labels,
            datasets: [{
                backgroundColor: "rgba(87,179,185,0.8)",
                strokeColor: "rgba(87,179,185,0.8)",
                data: this.infos.values
            }]
        }
        var options = {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio:2.1,
            animation: {
                duration: 3000
            },
            legend: {
                display: false
            }
        };

        this.chart = Chart.Bar(canvas, {
            data: data,
            options: options
        });

        $('.emptyGraph').hide();
    }

    /**
     * return chart
     */
    getChart() {
        if (this.chart) {
            return this.chart;
        }
    }
}