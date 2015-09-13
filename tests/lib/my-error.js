
// own Error handler
global.MyError = function (msg, debug) {
    var _error = Error.call(Error, msg); // create object with it

    _error.debug = [];
    if (msg && msg.debug) {
        if(msg.debug.length && msg.debug.length === 1) {
            _error.debug = msg.debug;
        } else {
            _error.debug.push(msg.debug);
        }
    }

    if(debug) {
        _error.debug.push(debug);
    }

    if(msg && msg.message) {
        _error.message = msg.message.replace('Error: Error: ', 'Error: ').trim();
    }
    //console.log(_error.message);

    // wyrzucenie do logu stosu z oryginalnego wyrzutu błedu jeżeli taki istnieje
    if(typeof msg['stack'] != 'undefined') {
        //noinspection JSUnresolvedVariable
        console.log('error.stack: ', msg.stack);
    }

    if(_error.debug) {
        console.log('error.debug: ', JSON.stringify(_error.debug));
    }

    return _error;
};

module.exports = {};