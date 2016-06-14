"use strict";

var _       = require('lodash'),
    semver  = require('semver'),
    params  = require('./parameters');

module.exports = AbstractDriver;

// private data
var _configuration = {
    dbType:             null, // shoud be overriden in driver implementation
    dbVer:              null, // shoud be overriden in driver implementation
    maxRows:           10000, // max rows for fetch results
    getConnMaxProbes:     30, // times
    getConnWaitMinTime: 1000, // miliseconds
    getConnWaitMaxTime: 4000,
    poolFetchTimeout:     60,  // timeout in seconds for waiting to getDbConnection() succesful callback
    gatherStats:       false
};
var _driver = null;
var _dbPool = null;

/**
 * Base Constructor
 *
 * @param driver
 * @param cfg
 * @constructor
 */
function AbstractDriver(driver, cfg) {
    this.setCfg(cfg);
    this.setDriver(driver);
    // disable setters (no longer needed)
    this.setCfg    = null;
    this.setDriver = null;
}

AbstractDriver.prototype.performStandardSetupChecks = function(requiredVer) {
    // check driver version match
    if(!semver.satisfies(this.getCfg().driverVersion, requiredVer)) {
        throw new Error('Driver version (' + this.getCfg().driverVersion + ') is not supported! Required version is ' + requiredVer);
    }

    // todo-me: replace it with object handler not global
    // check and eventualy setup MyError global handler
    if(typeof global.MyError !== 'function') {
        global.MyError = Error;
    }

    // check connection param object existance
    if(typeof this.getCfg().connection !== 'object') {
        throw new Error('No connection parameters is provided in config data!');
    }
};

AbstractDriver.prototype.getFnParams = function(args, fnName) {
    return params[fnName](args);
};

/*
 *  getters/setters methods
 */
AbstractDriver.prototype.setCfg    = function(cfg)    { _.extend(_configuration, cfg); };
AbstractDriver.prototype.setDriver = function(driver) { _driver = driver; };
AbstractDriver.prototype.setDbPool = function(dbPool) { _dbPool = dbPool; };
AbstractDriver.prototype.getCfg    = function() { return _configuration; };
AbstractDriver.prototype.getDriver = function() { return _driver; };
AbstractDriver.prototype.getDbPool = function() { return _dbPool; };

/*
 * Templates methods
 */
AbstractDriver.prototype.setupPool            = function() { throw new Error('setupPool() must be implemented!'); };
AbstractDriver.prototype.getDbConnection      = function() { throw new Error('getDbConnection() must be implemented!'); };
AbstractDriver.prototype.executeTransaction   = function() { throw new Error('executeTransaction() must be implemented!'); };
AbstractDriver.prototype.selectOneRowSql      = function() { throw new Error('selectOneRowSql() must be implemented!'); };
AbstractDriver.prototype.selectOneRow         = function() { throw new Error('selectOneRow() must be implemented!'); };
AbstractDriver.prototype.selectOneValueSql    = function() { throw new Error('selectOneValueSql() must be implemented!'); };
AbstractDriver.prototype.selectOneValue       = function() { throw new Error('selectOneValue() must be implemented!'); };
AbstractDriver.prototype.selectAllRowsSql     = function() { throw new Error('selectAllRowsSql() must be implemented!'); };
AbstractDriver.prototype.selectAllRows        = function() { throw new Error('selectAllRows() must be implemented!'); };
AbstractDriver.prototype.runProcedure         = function() { throw new Error('runProcedure() must be implemented!'); };
AbstractDriver.prototype.insertReturningId    = function() { throw new Error('insertReturningId() must be implemented!'); };
AbstractDriver.prototype.insertReturningIdSql = function() { throw new Error('insertReturningIdSql() must be implemented!'); };
AbstractDriver.prototype.querySql             = function() { throw new Error('querySql() must be implemented!'); };
AbstractDriver.prototype.update               = function() { throw new Error('update() must be implemented!'); };
AbstractDriver.prototype.insert               = function() { throw new Error('insert() must be implemented!'); };
AbstractDriver.prototype.del                  = function() { throw new Error('del() must be implemented!'); };
AbstractDriver.prototype.getStats             = function() { return this._stats; };

// properties
AbstractDriver.prototype._stats = { connCnt: [] };
