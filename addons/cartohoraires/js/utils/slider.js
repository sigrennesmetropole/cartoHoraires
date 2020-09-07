/**
 * Create slider to select time with 15 min steps.
 * 
 * Needs JQUERY >=1.1 and bootstrap-slider librairie already lodaded by Mviewer index.html.
 * https://github.com/seiyria/bootstrap-slider
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
            ticks_labels: ["4h", "8h", "12h", "16h", "20h"],
            data_slider_ticks_snap_bounds:"60"
        });

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
        slider.formatTime = this.timeConvert($('#timeSlider').val());
        $('#slider-info').text(this.timeConvert($('#timeSlider').val()));

        this.refresh = function() {
            return $('#'+this.target).slider('refresh');
        }
    }

    /**
     * Convert minutes to h:min format
     * @param {Integer} n as minutes
     */
    timeConvert(n) {
        var num = n;
        var hours = (num / 60);
        var rhours = Math.floor(hours);
        var minutes = (hours - rhours) * 60;
        var rminutes = Math.round(minutes);
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