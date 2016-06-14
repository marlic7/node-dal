"use strict";

/**
 * module for parsing variable arguments of functions and check proper type of each arg
 *
 * Based on Zhou Yu module: https://github.com/joeyu/zvargs
 *
 * @param args - function arguments (array or arguments object)
 * @param {object} proto - expected arguments definitions, for example:
             [
                 {'name': 'arg0', 'type':    'number'},
                 {'name': 'arg1', 'type':    Array,      'optional': true},
                 {'name': 'arg2', 'type':    'string',   'optional': true},
                 {'name': 'arg3', 'type':    'function'},
                 {'name': 'arg4', 'type':    [RegExp, 'string']},
             ]
 * @returns {{}} - object with argName:argValue properties
 */

module.exports.parse = function (args, proto) {
    var thisObj = {},
        i, j, k;

    if (typeof proto === 'string') {
        proto = proto.split(',').map(function(s) {
            s = s.trim();
            var m = s.match(/^(\[)?\s*(\w*)\s*\:([^\]]+)(\])?$/);
            if (m) {
                if (m[1] === '[' && m[4] === ']') {
                    s = {'name': m[2], 'type': m[3], 'optional': true};
                } else {
                    s = {'name': m[2], 'type': m[3]};
                }

                s.type = s.type.split('|').map(function(t) {
                    return t.trim();
                });

                return s;
            }
        });
    }

    if (!(proto instanceof Array)) {
        throw new Error("Only array is supported for arguments definition!");
    }

    args = standarizeParams(args, proto);

    for (j = 0; j < proto.length; j ++) {
        if (!(proto[j].type instanceof Array)) {
            proto[j].type = [proto[j].type];
        }

        proto[j].type = proto[j].type.map(function (s) {
            if ( typeof s === 'string' && ['number', 'string', 'boolean', 'function', 'object', 'symbol'].indexOf(s) === -1) {
                s = eval(s); // jshint ignore:line
            }
            return s;
        });
        thisObj[proto[j].name] = null;
    }

    for (i = j = 0; i < args.length && j < proto.length; i ++) {
        while (j < proto.length) {
            var isMatched = false;

            // Tests type
            for (k = 0; k < proto[j].type.length; k ++ ) {
                if (typeof proto[j].type[k] === 'string') {
                    if (typeof args[i] === proto[j].type[k]) {
                        isMatched = true;
                        break;
                    }
                } else if (proto[j].type[k] instanceof Function) {
                    if (args[i] instanceof proto[j].type[k]) {
                        isMatched = true;
                        break;
                    }
                } else if(proto[j].type[k] === null || proto[j].type[k] === 'null') {
                    if (args[i] === null) {
                        isMatched = true;
                        break;
                    }
                }
            }

            if (!isMatched) {
                if (proto[j].hasOwnProperty('default') && proto[j].default) {
                    thisObj[proto[j++].name] = proto[j].default;
                } else if (proto[j].hasOwnProperty('optional') && proto[j].optional) {
                    ++ j;
                } else {
                    var expectedType = proto[j].type;
                    expectedType = (expectedType instanceof Array ? expectedType.join('|') : expectedType);
                    throw new Error("Parameter " + proto[j].name + ' has invalid type (expected type is ' + expectedType + ')');
                }
            } else {
                // matched
                thisObj[proto[j++].name] = args[i];
                break;
            }
        }
    }

    // Checks if all mandatory arguments are passed
    for(;j < proto.length; j++) {
        if (!proto[j].hasOwnProperty('optional') || !proto[j].optional) {
            throw new Error("Not all mandatory arguments are passed");
        }
    }

    return thisObj;
};

/**
 * standarize object parameter (e.g. {par1: 12, par2: 'abc'}) to array (e.g. [12, abc])
 *
 * @param args
 * @param proto
 * @returns {Array|object}
 */
function standarizeParams(args, proto) {
    if(args.length === 1 && typeof args[0] === 'object') {
        var o = args[0],
            argTab = [];

        proto.forEach(function(i) {
            if(typeof o[i.name] !== 'undefined') {
                argTab.push(o[i.name]);
            } else {
                argTab.push(null);
            }
        });

        return argTab;
    }

    return args;
}
