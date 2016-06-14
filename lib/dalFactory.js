"use strict";

var findup = require('find-up').sync;

/**
 *
 * Example of usage:
    var dalFactory = require('node-dal'),
        oracledb   = require('oracledb'), // this line is not required but library must be installed!
        conf       = require('./config');

     dalFactory('oracledb', conf, function(err, dal) {
        if(err) {
            throw err;
        }

        /** @typedef {OracleDB} global.dal * /
        global.dal = dal;

        invokeFurtherActions();
     });
 *
 * @param {string} dbDriverName
 * @param {object} cfg
 * @param {function} cb
 */

// return object factory function
module.exports = function(dbDriverName, cfg, cb) {
    var Dal, dal;

    if(typeof cb != 'function') {
        throw new Error('third parameter of dalFactory should by calback function');
    }
    if(typeof dbDriverName != 'string') {
        cb('First parameter of dalFactory should by DB driver name');
    }
    if(typeof cfg != 'object') {
        cb('Second parameter of dalFactory should by configuration object for DB driver');
    }

    var driver = require(dbDriverName);

    var driverFile = require.cache[require.resolve(dbDriverName)].filename;
    var pkgJson    = require(findup('package.json', { cwd: driverFile }));

    if(!pkgJson) {
        cb('package.json of ' + dbDriverName + ' is missing');
    }
    if(!pkgJson.version) {
        cb('No version specified for ' + dbDriverName + ' in package.json');
    }

    cfg.driverVersion = pkgJson.version;

    Dal = require('./drivers/' + dbDriverName);

    dal = new Dal(driver, cfg);
    dal.setupPool(cb);
};
