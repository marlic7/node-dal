"use strict";

/**
 * Module for parsing func arguments and checks proper types of each parameter from specification
 *
 * @param args - function arguments (array or arguments object)
 * @param {object} spec - expected parameters specification, for example:
             [
                 { name: 'arg0', type: 'number',          default: 15 },
                 { name: 'arg1', type: [Array, 'object'], optional: true },
                 { name: 'arg2', type: 'string',          optional: true },
                 { name: 'arg3', type: 'function'},
                 { name: 'arg4', type: [RegExp, 'string']},
             ]
 * @returns {object}|throw - object with parameters - param names as keys - or throw Error if provided param unmet specs
 */
const _ = require('lodash');

module.exports.parse = function (args, spec) {
    let outParams = {};

    // when only one parameter type of object and has at least one common key with spec param name 
    if(args.length === 1 && typeof args[0] === 'object' && _.intersection(_.keys(args[0]), _.map(spec, 'name')).length) {
        spec.forEach(function(v) {
	    if(_.has(args[0], v.name)) {
		if(checkTypeMatch(args[0][v.name], v.type)) {
		    outParams[v.name] = args[0][v.name];
		} else {
                    throw new Error(`No proper ${v.name} parameter data type. Expected type is: ${_.toString(v.type)}!`);
		}
	    } else if (v.default || v.optional) {
                outParams[v.name] = v.default || null;
	    } else {
                throw new Error(`Missing parameter ${v.name}!`);
	    }
        });
    } else {
        // position and type based match
        let i = 0;
        spec.forEach(function(v) {
            if(checkTypeMatch(_.get(args, i + ''), v.type)) {
                outParams[v.name] = args[i];
                i++;
            } else if (v.default || v.optional) {
                outParams[v.name] = v.default || null;
            } else {
                throw new Error(`No proper ${v.name} parameter data type. Expected type is: ${_.toString(v.type)}!`);
            }
        });
    }

    return outParams;
};

function checkTypeMatch(arg, specType) {
    return _.some(_.flatten([specType]), function(type) {
        return typeof type === 'string' && typeof arg === type ||
               type instanceof Function && arg instanceof type ||
               arg === null && (type === null || type === 'null');
    });
}
