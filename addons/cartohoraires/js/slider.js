/**
 * Create slider to select time with 15 min steps.
 * 
 * Needs JQUERY >=1.1 and bootstrap-slider librairie already lodaded by Mviewer index.html.
 * https://github.com/seiyria/bootstrap-slider
 */

class Slider {
    target = null;
    formatTime = null;
    time = null;
    callback = null;
    /**
     * Constructor
     * @param {String} target id to target HTML with JQuery
     */
    constructor (target, callback) {
        this.target = target || null;
        let slider = this;
        this.callback = callback;
        $('#'+target).slider({
            min: 0,
            max: 1425,
            step: 15,
            value: 480,
            formatter: (e) => {return this.timeConvert(e)}
        });
        $('#'+target).on('slideStop', function(e){
            slider.formatTime = slider.timeConvert(e.target.value);
            slider.time = e.target.value;
            $('#slider-info').text(slider.formatTime);
            callback(e, false);
        });
        slider.formatTime = this.timeConvert($('#timeSlider').val());
        $('#slider-info').text(this.timeConvert($('#timeSlider').val()));
    }

    /**
     * Convert minutes to h:min format
     * @param {Integer} n as minutes
     */
    timeConvert = function (n) {
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
    getFormatTime = function () {
        return this.timeConvert($('#timeSlider').val());
    }

    /**
     * Return time as minutes count from day start.
     * Ex: value 15 is equal to 00 h 15 min
     * 
     * Use timeConvert function to get minutes as formated date as 00 h 15 min 
     * instead of simple 15 value.
     */
    getTime = function () {
        return $('#timeSlider').val();
    }
}