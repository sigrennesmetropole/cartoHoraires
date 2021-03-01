/**
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This class create new graph from Chart.Js
 * 
 * Last modified  : 2020-09-25
 * By gaetan.bruel@jdev.fr
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

        this.options = mviewer.customComponents.cartohoraires.config.options.graph || {};
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

    /**
     * To group data by values
     * @param {Object} data 
     */
    groupData(data) {
        let val = this.steps;
        let options = this.options;
        if(!val) return data;
        let group = {
            labels: [],
            values: []
        };
        data.labels.forEach((e,i) => {
            let start = moment(e,'HH:mm'); 
            let remainder = start.minute() % val;
            let dateTime = moment(start).subtract(remainder, "minutes").format("HH:mm");
            let idx = group.labels.indexOf(dateTime);
            if(!data.values && !options.keepEmpty) idx = null; // to don't display 0 or null values
            if(idx && idx < 0) {
                group.labels.push(dateTime);
                group.values.push(data.values[i]);
            } else if(idx != null) {
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

        let data = {
            labels: this.infos.labels,
            datasets: [{
                backgroundColor: "rgba(87,179,185,0.8)",
                strokeColor: "rgba(87,179,185,0.8)",
                data: this.infos.values
            }]
        }
        let options = {
            responsive: this.options.responsive || true,
            maintainAspectRatio: this.options.maintainAspectRatio || true,
            animation: {
                duration: this.options.duration || 0
            },
            legend: {
                display: false
            },
            scales: {
                yAxes: [{
                    ticks: {
                        min: 0
                    }
                }]
            }
        };

        if(this.options.aspectRatio) options.aspectRatio = this.options.aspectRatio;
        
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