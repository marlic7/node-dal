const _ = require('lodash');

module.exports = promisify;

/**
 * @param func
 * @returns {Function}
 */
function promisify(func) {
    return function() {
        let self = this;

        if (typeof _.last(arguments) === 'function' || typeof _.get(arguments, '[0].cb') === 'function') {
            return func.apply(self, arguments);
        } else {
            let args = Array.prototype.slice.call(arguments);

            return new Promise(function(resolve, reject) {
                try {
                    let callback = function(err, result) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    };
                    if(_.isPlainObject(args[0])) {
                        args[0]['cb'] = callback;
                    } else {
                        args[args.length] = callback;
                    }
                    func.apply(self, args);
                } catch (err) {
                    // Throwing the error outside of the promise wrapper.
                    process.nextTick(function() {
                        throw err;
                    });
                }
            });
        }
    };
}