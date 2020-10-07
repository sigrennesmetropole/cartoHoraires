/**
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Create slider to select time with 15 min steps.
 * 
 * Last modified  : 2020-09-25
 * By gaetan.bruel@jdev.fr
 */
class Slider {
    /**
     * Constructor
     * @param {String} target id to target HTML with JQuery
     */
    constructor(target, callback) {
        let slider = this;
        this.time = null;
        this.formatTime = null;
        this.target = target || null;
        this.callback = callback;
        $('#' + target).slider({
            min: 240,
            max: 1200,
            step: 15,
            value: 480,
            formatter: (e) => {
                return this.timeConvert(e)
            },
            ticks: [240, 480, 720, 960, 1200],
            ticks_labels: ['4h', '8h', '12h', '16h', '20h'],
            ticks_snap_bounds: '1'
        });

        slider.formatTime = this.timeConvert($('#timeSlider').val());
        $('#slider-info').text(this.timeConvert($('#timeSlider').val()));

        // With JQuery
        $('#' + target).on('slideStop', function(e) {
            /**
             * Update map data only.
             * Chart could not take into account this info because chart display all available hours not only one.
             * @param {Object} e event target - slider
             */
            slider.formatTime = slider.timeConvert(e.target.value);
            slider.time = e.target.value;
            $('#slider-info').text(slider.formatTime);
            callback(e, false);
        });

        $('#' + target).on('slide', function(e) {
            /**
             * Update map data only.
             * Chart could not take into account this info because chart display all available hours not only one.
             * @param {Object} e event target - slider
             */
            slider.formatTime = slider.timeConvert(e.target.value);
            slider.time = e.target.value;
            $('#slider-info').text(slider.formatTime);
        });

        this.refresh = function() {
            return $('#'+this.target).slider('refresh');
        }
    }

    /**
     * Convert minutes to h:min format
     * @param {Integer} n as minutes
     */
    timeConvert(n) {
        let num = n;
        let hours = (num / 60);
        let rhours = Math.floor(hours);
        let minutes = (hours - rhours) * 60;
        let rminutes = Math.round(minutes);
        rminutes = rminutes == 0 ? '00' : rminutes;
        rhours = rhours > 9 ? rhours : `0${rhours}`;
        return rhours + ' h ' + rminutes + ' min';
    }

    /**
     * Return date formated as xx h yy min
     */
    getFormatTime() {
        return this.timeConvert($('#timeSlider').val());
    }

    /**
     * Return time as minutes count from day start.
     * Ex: value 15 is equal to 00 h 15 min
     * 
     * Use timeConvert function to get minutes as formated date as 00 h 15 min 
     * instead of simple 15 value.
     */
    getTime() {
        return $('#timeSlider').val();
    }
}