"use strict";

const
    _       = require('lodash'),
    semver  = require('semver'),
    params  = require('./parameters'),
    // private data
    _configuration = {
        dbType:             null, // shoud be overriden in driver implementation
        dbVer:              null, // shoud be overriden in driver implementation
        maxRows:           10000, // max rows for fetch results
        getConnMaxProbes:     30, // times
        getConnWaitMinTime: 1000, // miliseconds
        getConnWaitMaxTime: 4000,
        poolFetchTimeout:     60,  // timeout in seconds for waiting to getDbConnection() succesful callback
        gatherStats:       false
    };

// private data
let _driver = null;
let _dbPool = null;

class AbstractDriver {
    /**
     * Base Constructor
     *
     * @param driver
     * @param cfg
     * @constructor
     */
    constructor(driver, cfg) {
        this.setCfg(cfg);
        this.setDriver(driver);
        // disable setters (no longer needed)
        this.setCfg    = null;
        this.setDriver = null;
    }

    performStandardSetupChecks(requiredVer) {
        // check driver version match
        if(!semver.satisfies(this.getCfg().driverVersion, requiredVer)) {
            throw new Error('Driver version (' + this.getCfg().driverVersion + ') is not supported! Required version is ' + requiredVer);
        }

        // todo-me: replace it with injected object handler not global
        // check and eventually setup MyError global handler
        if(typeof global.MyError !== 'function') {
            global.MyError = Error;
        }

        // check connection param object existence
        if(typeof this.getCfg().connection !== 'object') {
            throw new Error('No connection parameters is provided in config data!');
        }
    }

    // getters/setters methods
    setCfg(cfg)       { _.extend(_configuration, cfg); }
    setDriver(driver) { _driver = driver; }
    setDbPool(dbPool) { _dbPool = dbPool; }
    getCfg()          { return _configuration; }
    getDriver()       { return _driver; }
    getDbPool()       { return _dbPool; }
    getFnParams(args, fnName) { return params[fnName](args); }

    // Templates methods
    setupPool            () { throw new Error('setupPool() must be implemented!'); }
    getDbConnection      () { throw new Error('getDbConnection() must be implemented!'); }
    executeTransaction   () { throw new Error('executeTransaction() must be implemented!'); }
    selectOneRowSql      () { throw new Error('selectOneRowSql() must be implemented!'); }
    selectOneRow         () { throw new Error('selectOneRow() must be implemented!'); }
    selectOneValueSql    () { throw new Error('selectOneValueSql() must be implemented!'); }
    selectOneValue       () { throw new Error('selectOneValue() must be implemented!'); }
    selectAllRowsSql     () { throw new Error('selectAllRowsSql() must be implemented!'); }
    selectAllRows        () { throw new Error('selectAllRows() must be implemented!'); }
    getSqlForSelectAllRowsSql () { throw new Error('getSqlForSelectAllRowsSql() must be implemented!'); }
    getSqlForSelectAllRows    () { throw new Error('getSqlForSelectAllRows() must be implemented!'); }
    runProcedure         () { throw new Error('runProcedure() must be implemented!'); }
    insertReturningId    () { throw new Error('insertReturningId() must be implemented!'); }
    insertReturningIdSql () { throw new Error('insertReturningIdSql() must be implemented!'); }
    querySql             () { throw new Error('querySql() must be implemented!'); }
    update               () { throw new Error('update() must be implemented!'); }
    insert               () { throw new Error('insert() must be implemented!'); }
    del                  () { throw new Error('del() must be implemented!'); }
}

module.exports = AbstractDriver;
