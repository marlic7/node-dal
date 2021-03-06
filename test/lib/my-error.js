/**
 * own Error handler
 * @type {global.MyError}
 */
MyError = global.MyError = function (msg, debug) {
    const _error = Error.call(Error, msg); // create object with it

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

    // console.error(_error.stack, debug);

    return _error;
};

module.exports = {};