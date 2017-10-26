"use strict";

const
    findup = require('find-up').sync,
    Promise = require("bluebird");

Promise.config({
    longStackTraces: true,
    warnings: true
});

/**
 *
 * Example of usage:
    const
        dalFactory = require('node-dal'),
        oracledb   = require('oracledb'), // this line is not required but library must be installed!
        conf       = require('./config');

    dalFactory('oracledb', conf)
        .then(dal => {
            return dal.querySql('select ...')
        })
        .then(results => {
            console.log(results);
        })
        .catch(err => {
            console.log(err.message);
        })
 *
 * @param {string} dbDriverName
 * @param {object} cfg
 * @param {function} cb
 */

module.exports = dalFactory;

function dalFactory(dbDriverName, cfg, cb) {
    let Dal, dal;

    return new Promise((resolve, reject) => {
        if(typeof dbDriverName !== 'string') {
            reject('First parameter of dalFactory should by DB driver name');
        }
        if(typeof cfg !== 'object') {
            reject('Second parameter of dalFactory should by configuration object for DB driver');
        }

        const
            driver = require(dbDriverName),
            driverFile = require.cache[require.resolve(dbDriverName)].filename,
            pkgJson    = require(findup('package.json', { cwd: driverFile }));

        if(!pkgJson) {
            reject('package.json of ' + dbDriverName + ' is missing');
        }
        if(!pkgJson.version) {
            reject('No version specified for ' + dbDriverName + ' in package.json');
        }

        cfg.driverVersion = pkgJson.version;

        Dal = require('./drivers/' + dbDriverName);

        dal = new Dal(driver, cfg);

        dal.setupPool()
            .then(dalObj => {
                resolve(dalObj);
            })
            .catch(err => {
                reject(err);
            });

    }).nodeify(cb);
}
