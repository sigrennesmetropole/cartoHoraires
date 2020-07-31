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
    /**
     * Constructor
     * @param {String} target id to target HTML with JQuery
     */
    constructor (target) {
        this.target = target || null;
        let slider = this;
        $('#'+target).slider({
            min: 0,
            max: 1425,
            step: 15,
            value: 0,
            formatter: (e) => {return this.timeConvert(e)}
        });
        $('#'+target).on('slideStop', function(e){
            slider.formatTime = slider.timeConvert(e.target.value);
            slider.time = e.target.value;
            $('#slider-info').text(slider.formatTime);
        })
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
        rhours = rhours > 10 ? rhours : `0${rhours}`;
        return rhours + ' h ' + rminutes + ' min';
    }
    
    /**
     * Return date formated as xx h yy min
     */
    getFormatTime() {
        return this.formatTime;
    }

    /**
     * Return time as minutes count from day start.
     * Ex: value 15 is equal to 00 h 15 min
     * 
     * Use timeConvert function to get minutes as formated date as 00 h 15 min 
     * instead of simple 15 value.
     */
    getTime() {
        return this.time;
    }
}