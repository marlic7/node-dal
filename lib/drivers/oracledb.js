"use strict";

/*
    Oracle driver for DAL based on node-oracledb (https://github.com/oracle/node-oracledb/)
 */
const
    _              = require('lodash'),
    prepare        = require('oracle-prepare-sql'),
    async          = require('async'),
    Promise        = require("bluebird"),
    AbstractDriver = require('../AbstractDriver'),
    requiredVer    = '~1.12.0'; // oracledb@1.12.0 >= requiredVer < oracledb@1.13.0

// private data (for override Abstract configuration)
const _configuration = {
    dbType:         'oracle',
    dbVer:              '11',
    maxRows:             100 // max rows for fetch results
};


class OracleDB extends AbstractDriver {
    /**
     * Base Constructor
     *
     * @param driver
     * @param cfg
     * @constructor
     */
    constructor(driver, cfg) {
        // override Abstract configuration
        cfg = _.extend(_configuration, cfg);
        super(driver, cfg);

        // rewrite constants (for easy usage)
        this.DEFAULT    = driver.DEFAULT;
        this.STRING     = driver.STRING;
        this.NUMBER     = driver.NUMBER;
        this.DATE       = driver.DATE;
        this.CURSOR     = driver.CURSOR;
        this.BUFFER     = driver.BUFFER;
        this.CLOB       = driver.CLOB;
        this.BLOB       = driver.BLOB;

        this.BIND_IN    = driver.BIND_IN;
        this.BIND_INOUT = driver.BIND_INOUT;
        this.BIND_OUT   = driver.BIND_OUT;

        this.ARRAY      = driver.ARRAY;
        this.OBJECT     = driver.OBJECT;

        if(cfg.outFormat) {
            driver.outFormat = getOutFormatDriverIdentifier(cfg.outFormat, this);
        } else {
            driver.outFormat = driver.OBJECT;
        }
    }

        /**
     * init and remember dbPool and return OracleDB object in callback
     *
     * @param [cb]
     */
    setupPool(cb) {
        return new Promise((resolve, reject) => {
            // standard setup checks
            try {
                this.performStandardSetupChecks(requiredVer);
            } catch (e) {
                reject(e);
                return;
            }

            // setup maxRows
            this.getDriver().maxRows = this.getCfg().maxRows;

            this.getDriver().createPool(this.getCfg().connection)
                .then(pool => {
                    this.setDbPool(pool);
                    this.setDbPool = null; // disable setter (no longer needed)

                    resolve(this);
                })
                .catch(err => {
                    reject(err);
                });

        }).nodeify(cb);
    }

    /**
     * Fetch conn from pool.
     *
     * @params '[cb:function]'
     */
    getDbConnection() {
        const
            par    = this.getFnParams(arguments, 'getDbConnection'),
            dbPool = this.getDbPool();

        return new Promise((resolve, reject) => {
            dbPool.getConnection()
                .then(connection => {
                    // todo-me: implement it once per new session when it be possible (https://github.com/oracle/node-oracledb/issues/258)
                    return setNlsSessionParams(connection, this.getCfg().nlsSessionParameters);
                })
                .then(connection => {
                    resolve(connection);
                })
                .catch(err => {
                    reject(err);
                });
        }).nodeify(par.cb);
    }

    /**
     * Execute SQL queries within db transaction (all queries have to successful finish either rollback will be invoke)
     *
     * @params 'sqlBindArray:Array, [cb:function]'
     */
    executeTransaction() {
        const par = this.getFnParams(arguments, 'executeTransaction');

        let _conn = null;

        return new Promise((resolve, reject) => {
            this.getDbConnection()
                .then(connection => {
                    connection.autoCommit = false;
                    _conn = connection;

                    const executeSql = (sqlBind, cb) => {
                        connection.execute(sqlBind[0], sqlBind[1], (err, results) => {
                            if(err) {
                                // do not release connection!!!
                                cb(new MyError(err, sqlBind));
                                return;
                            }
                            cb(null, results);
                        });
                    };

                    // todo: change it to Promise.mapSeries
                    async.mapSeries(par.sqlBindArray, executeSql, (err, results) => {
                        if(err) {
                            connection.rollback(err2 => {
                                connection.release(getNoopCallback('executeTransaction mapSeries rollback'));
                                _conn = null;

                                if(err2) {
                                    reject(new MyError(err2, { mapSeriesError: err }));
                                    return;
                                }

                                reject(err);
                            });
                            return;
                        }

                        connection.commit(err => {
                            if(err) {
                                reject(err);
                                connection.release(getNoopCallback('executeTransaction commit'));
                                _conn = null;
                                return;
                            }

                            connection.release(err => {
                                _conn = null;
                                if(err) {
                                    reject(err);
                                    return;
                                }
                                resolve(results);
                            });
                        });
                    });
                })
                .catch(err => {
                    if(_conn !== null) {
                        _conn.release(getNoopCallback('executeTransaction catch'));
                    }
                    reject(err);
                });

        }).nodeify(par.cb);
    }

    /**
     * @params 'sql:string, bind:object|Array, [opt:object], [cb:function]'
     */
    selectOneRowSql() {
        const par = this.getFnParams(arguments, 'selectOneRowSql');

        return new Promise((resolve, reject) => {
            let debugCtx = { sql: par.sql, bind: par.bind };

            this.selectAllRowsSql(par.sql, par.bind, par.opt)
                .then(results => {
                    if(!results || results.length != 1) {
                        reject(new MyError(
                            'Wrong number of rows returned from database!',
                            Object.assign(debugCtx, { results })
                        ));
                        return;
                    }
                    resolve(results[0]);
                })
                .catch(err => {
                    reject(new MyError(err, { sql: par.sql, bind: par.bind }));
                });
        }).nodeify(par.cb);
    }

    /**
     * @params 'tbl:string, [fields:Array|null], where:Array, [opt:object], cb:function'
     */
    selectOneRow() {
        const par = this.getFnParams(arguments, 'selectOneRow');
        let obj;

        try {
            obj = prepare.prepareQuery(par.tbl, par.fields, par.where);
        } catch (e) {
            par.cb(e);
            return;
        }

        this.selectOneRowSql(obj.sql, obj.params, par.opt, par.cb);
    }

    /**
     * @params 'sql:string, bind:object|Array, [opt:object], [cb:function]'
     */
    selectOneValueSql() {
        const
            par   = this.getFnParams(arguments, 'selectOneValueSql'),
            ARRAY = this.getDriver().ARRAY;

        let debugCtx = {},
            _conn = null,
            _result;

        return new Promise((resolve, reject) => {
            this.getDbConnection()
                .then(connection => {
                    _conn = connection;

                    debugCtx = { sql: par.sql, bind: par.bind };

                    return _conn.execute(par.sql, par.bind, { outFormat: ARRAY });
                })
                .then(result => {
                    _result = result;
                    return _conn.release();
                })
                .then(() => {
                    _conn = null;

                    if(_result && _result.rows && _result.rows.length > 0) {
                        if(_result.rows.length > 1) {
                            reject(new MyError(`Wrong number rows returned from database (${_result.rows.length})`));
                            return;
                        }
                        if(_result.rows[0].length !== 1) {
                            reject(new MyError(`Wrong number colls returned from database (${_result.rows[0].length})`));
                            return;
                        }
                        resolve(_result.rows[0][0]);
                    } else {
                        resolve(null);
                    }
                })
                .catch(err => {
                    if(_conn !== null) {
                        _conn.release(getNoopCallback('selectOneValueSql'));
                    }
                    reject(new MyError(err, debugCtx));
                });
        }).nodeify(par.cb);
    }

    /**
     * @params 'tbl:string, field:string, where:Array|object, cb:function'
     */
    selectOneValue() {
        const par = this.getFnParams(arguments, 'selectOneValue');
        let obj;

        try {
            obj = prepare.prepareQuery(par.tbl, [par.field], par.where);
        } catch (e) {
            par.cb(e);
            return;
        }

        this.selectOneValueSql(obj.sql, obj.params, par.cb);
    }

    /**
     * @params 'sql:string, bind:object|Array, [opt:object], cb:function'
     */
    selectAllRowsSql() {
        const
            par     = this.getFnParams(arguments, 'selectAllRowsSql'),
            execOpt = { resultSet: true };

        return new Promise((resolve, reject) => {

            try {
                if(_.has(par.opt, 'outFormat')) {
                    execOpt.outFormat = getOutFormatDriverIdentifier(par.opt.outFormat, this.getDriver());
                }

                // limit, page (pagination)
                if(_.get(par.opt, 'limit')) {
                    let limit = par.opt.limit,
                        page = _.get(par.opt, 'page') || 1;

                    if(this.getCfg().dbVer >= '12') {
                        let offset = (page - 1) * limit;
                        par.sql += `\nOFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
                        if(_.get(par.opt, 'totalCount')) {
                            let m = par.sql.match(/^(\s*select\s+[a-z0-9_\s\.,\*]+)\s+from\s+/i);
                            par.sql = par.sql.replace(m[1], m[1] + ', Count(1) OVER () AS cnt__');
                        }
                    } else {
                        let re = new RegExp(/order\s+by\s+[a-z0-9,\s]+/i),
                            order;

                        // adds ROWID to pagination for right records order
                        if (par.sql.match(re)) {
                            // check if ID exists in ORDER BY
                            if(!par.sql.match(/order\s+by\s+(.*?)\s+id\s*,\s+/i)) {
                                order   = par.sql.match(re)[0] + ', rowid';
                                par.sql = par.sql.replace(re, order);
                            }
                        } else {
                            par.sql += ' ORDER BY rowid';
                        }

                        // todo: missing total support
                        par.sql = `SELECT * FROM (\n` +
                                        `SELECT a.*, rownum r__\nFROM (\n${par.sql}\n) a\n` +
                                        `WHERE rownum < ((${page} * ${limit}) + 1 )\n)\n` +
                                  `WHERE r__ >= (((${page} -1) * ${limit}) + 1)`;
                    }
                }
            } catch (err) {
                reject(err);
                return;
            }

            let debugCtx = {},
                _conn = null;

            this.getDbConnection()
                .then(connection => {
                    _conn = connection;
                    debugCtx = { sql: par.sql, bind: par.bind };

                    return _conn.execute(par.sql, par.bind, execOpt);
                })
                .then(result => {

                    fetchResultSet(result, _conn, par, (err, rows) => {
                        if(err) {
                            reject(err);
                            return;
                        }

                        resolve(rows);
                    });
                })
                .catch(err => {
                    if(_conn !== null) {
                        _conn.release(getNoopCallback('selectAllRowsSql catch'));
                    }
                    reject(new MyError(err, debugCtx));
                });

        }).nodeify(par.cb);
    }

    /**
     * @params 'tbl:string, [fields:Array], [where:Array|object], [order:Array|string], [opt:object], cb:function'
     */
    selectAllRows() {
        const
            par   = this.getFnParams(arguments, 'selectAllRows'),
            limit = _.get(par.opt, 'limit'),
            page  = _.get(par.opt, 'page'),
            tc    = _.get(par.opt, 'totalCount');
        let obj;

        try {
            obj     = prepare.prepareQuery(par.tbl, par.fields, par.where, par.order, limit, page, tc, this.getCfg().dbVer);
            par.opt = _.omit(par.opt, ['limit', 'page', 'totalCount']);
        } catch (e) {
            par.cb(e);
            return;
        }
        this.selectAllRowsSql(obj.sql, obj.params, par.opt, par.cb);
    }

    /**
     *
     * example for bind object:
     * {
     *     i:  'Chris',  // bind type is determined from the data type
     *     i2: { fn: 'To_Date(?, \'yyyymmdd\')', bind: '20151023' }
     *     io: { val: 'Jones', dir : oracledb.BIND_INOUT },
     *     o:  { type: oracledb.NUMBER, dir : oracledb.BIND_OUT },
     * }
     * @params 'procName:string, bind:object|Array, [opt:object], [cb:function]'
     */
    runProcedure() {
        const
            par    = this.getFnParams(arguments, 'runProcedure'),
            params = [],
            binds  = {},
            that   = this;
        let sql;

        return new Promise((resolve, reject) => {
            try {
                _.each(par.bind, (v, k) => {
                    if(_.isObject(v) && v.fn && typeof v.bind !== 'undefined') {
                        params.push(v.fn.replace(/\?/g, ':' + k));
                        binds[k] = v.bind;
                    } else {
                        params.push(':' + k);
                        binds[k] = v;
                    }
                });

                sql = 'BEGIN ' + par.procName + '(' + params.join(', ') + '); END;';
            } catch (err) {
                reject(err);
                return;
            }

            if(_.get(par.opt, 'dbmsOutput')) { // when we catch DBMS_OUTPUT.PUT_LINE
                async.waterfall(
                    [
                        getDbConnectionFn(that),
                        enableDbmsOutput,
                        (conn, cb) => {
                            let dbmsOutput = [];
                            conn.execute(sql, binds, { autoCommit: true }, (err, result) => {
                                if (err) {
                                    cb(new MyError(err, { sql: sql, bind: binds }), conn);
                                    return;
                                }
                                cb(null, conn, result, dbmsOutput);
                            });
                        },
                        getFetchDbmsOutputLineFn(that),
                        releaseDbConnection,
                        (data) => {
                            let out = Object.assign({}, { dbmsOutput: _.get(data, 'dbmsOutput') }, _.get(data, 'results.outBinds'));
                            resolve(out);
                        }
                    ],
                    getCatchErrorFn(reject)
                );
            } else {
                async.waterfall(
                    [
                        getDbConnectionFn(that),
                        (conn, cb) => {
                            conn.execute(sql, binds, { autoCommit: true }, (err, result) => {
                                if (err) {
                                    cb(new MyError(err, { sql: sql, bind: binds }), conn);
                                    return;
                                }
                                cb(null, conn, result);
                            });
                        },
                        releaseDbConnection,
                        (data) => {
                            resolve(_.get(data, 'outBinds') || []);
                        }
                    ],
                    getCatchErrorFn(reject)
                );
            }
        }).nodeify(par.cb);
    }

    /**
     * @params 'tbl:string, data:object, sequence:string, cb:function'
     */
    insertReturningId() {
        const par = this.getFnParams(arguments, 'insertReturningId');

        let obj;

        try {
            obj = prepare.prepareInsert(par.tbl, par.data);
        } catch (e) {
            par.cb(e);
            return;
        }
        this.insertReturningIdSql(obj.sql, obj.params, par.sequence, par.cb);
    }

    /**
     * @params 'sql:string, bind:object|Array, sequence:string, [cb:function]'
     */
    insertReturningIdSql() {
        const
            par = this.getFnParams(arguments, 'insertReturningIdSql'),
            ARRAY = this.getDriver().ARRAY;

        // params completeness check (bind should have one field with value = { type: 'pk' }
        if(!_.find(par.bind, v => _.get(v, 'type') === 'pk' )) {
            par.cb(new MyError('bind parameter should have one field with value = { type: "pk" }', { par }));
            return;
        }

        this.getDbConnection((err, connection) => {
            if (err) {
                par.cb(new MyError(err));
                return;
            }

            const sqlSeq = 'SELECT ' + par.sequence + '.NEXTVAL FROM dual';
            connection.execute(sqlSeq, [], { outFormat: ARRAY }, (err, result1) => {
                if (err) {
                    connection.release(getNoopCallback('insertReturningIdSql sqlSeq'));
                    par.cb(new MyError(err, {sql: sqlSeq}));
                    return;
                }

                let seqId, key0;
                try {
                    seqId = result1.rows[0][0];
                    // replace { type: 'pk' } with seqId value
                    par.bind = _.map(par.bind, v => {
                        if(_.get(v, 'type') === 'pk') {
                            v = seqId;
                        }
                        return v;
                    });
                } catch (e) {
                    par.cb(new MyError('Wrong array/object with bind values!', {bind: par.bind, result1: result1, e: e.message, key0: key0}));
                    return;
                }

                connection.execute(par.sql, par.bind, { autoCommit: true }, (err, result) => {
                    if (err) {
                        connection.release(getNoopCallback('insertReturningIdSql sql'));
                        par.cb(new MyError(err, {sql: par.sql, bind: par.bind}));
                        return;
                    }

                    /* Release the connection back to the connection pool */
                    connection.release(err => {
                        if (err) {
                            par.cb(new MyError(err));
                            return;
                        }

                        if (result) {
                            par.cb(null, seqId);
                        } else {
                            par.cb(new MyError('No inserted any row!', {result: result, seqId: seqId}));
                        }
                    });
                });
            });
        });
    }

    /**
     * @params 'sql:string, [bind:object|Array], [opt:object], cb:function'
     */
    querySql() {
        const
            par = this.getFnParams(arguments, 'querySql'),
            execOpt = { autoCommit: true },
            driver = this.getDriver();

        let debugCtx = {},
            _conn = null,
            _result;

        return new Promise((resolve, reject) => {
            this.getDbConnection()
                .then(connection => {
                    _conn = connection;

                    if (_.has(par.opt, 'outFormat')) {
                        execOpt.outFormat = getOutFormatDriverIdentifier(par.opt.outFormat, driver);
                    }

                    par.bind = par.bind || [];
                    debugCtx = { sql: par.sql, bind: par.bind };

                    return _conn.execute(par.sql, par.bind, execOpt);
                })
                .then(result => {
                    _result = result;
                    /* Release the connection back to the connection pool */
                    return _conn.release();
                })
                .then(() => {
                    _conn = null;
                    if(_result) {
                        return resolve(_result);
                    }
                    return resolve([]);
                })
                .catch(err => {
                    if(_conn !== null) {
                        _conn.release(getNoopCallback('querySql execute'));
                    }
                    reject(new MyError(err, debugCtx));
                });
        }).nodeify(par.cb);
    }

    /**
     * @params 'tbl:string, data:object, where:Array|object, cb:function'
     */
    update() {
        const par = this.getFnParams(arguments, 'update');
        let obj;

        try {
            obj = prepare.prepareUpdate(par.tbl, par.data, par.where);
        } catch (e) {
            par.cb(e);
            return;
        }

        this.querySql(obj.sql, obj.params, par.cb);
    }

    /**
     * @params 'tbl:string, data:object, cb:function'
     */
    insert() {
        const par = this.getFnParams(arguments, 'insert');
        let obj;

        try {
            obj = prepare.prepareInsert(par.tbl, par.data);
        } catch (e) {
            par.cb(e);
            return;
        }

        this.querySql(obj.sql, obj.params, par.cb);
    }

    /**
     * @params 'tbl:string, where:Array|object, cb:function'
     */
    del() {
        const par = this.getFnParams(arguments, 'del');
        let obj;

        try {
            obj = prepare.prepareDelete(par.tbl, par.where);
        } catch (e) {
            par.cb(e);
            return;
        }

        this.querySql(obj.sql, obj.params, par.cb);
    }

    /**
     * @params 'tbl:string, field:string, where:Array|object, cb:function'
     */
    selectOneClobValue() {
        const par = this.getFnParams(arguments, 'selectOneValue');
        let obj;

        try {
            obj = prepare.prepareQuery(par.tbl, [par.field], par.where);
        } catch (e) {
            par.cb(e);
            return;
        }

        this.selectOneClobValueSql(obj.sql, obj.params, par.cb);
    }

    /**
     * @params 'sql:string, bind:object|Array, [opt:object], cb:function'
     */
    selectOneClobValueSql() {
        const
            par = this.getFnParams(arguments, 'selectClobValueSql'),
            ARRAY = this.getDriver().ARRAY;

        this.getDbConnection((err, connection) => {
            if (err) {
                par.cb(new MyError(err));
                return;
            }

            connection.execute(par.sql, par.bind, { outFormat: ARRAY }, (err, result) => {
                if (err) {
                    connection.release(getNoopCallback('selectOneClobValueSql execute'));
                    par.cb(new MyError(err, {sql: par.sql, bind: par.bind}));
                    return;
                }

                // closure
                const retValue = value => {
                    connection.release(err => {
                        if (err) {
                            par.cb(new MyError(err));
                            return;
                        }
                        par.cb(null, value);
                    });
                };

                if (result.rows.length === 0) {
                    retValue(null);
                } else {
                    fetchLobData({ lob: result.rows[0][0] }, (err, out) => {
                        if(err) {
                            connection.release(getNoopCallback('selectOneClobValueSql fetchLobData'));
                            par.cb(new MyError(err, { result }));
                            return;
                        }
                        retValue(out.outData);
                    });
                }
            });
        });
    }

    /**
     * for backward compatibility
     */
    selectClobValueSql() {
        this.selectOneClobValueSql(...arguments);
    }

    /**
     * only for test purpose
     */
    testParams() {
        const par = this.getFnParams(arguments, 'testParams');

        // eslint-disable-next-line
        console.log('testParams params: ', par);
        par.cb();
    }
}

const libPromisify = {
    setupPool:              true,
    getDbConnection:        true,
    executeTransaction:     true,
    selectOneRowSql:        true,
    selectOneRow:           true,
    selectOneValueSql:      true,
    selectOneValue:         true,
    selectAllRowsSql:       true,
    selectAllRows:          true,
    runProcedure:           true,
    insertReturningId:      true,
    insertReturningIdSql:   true,
    querySql:               true,
    update:                 true,
    insert:                 true,
    del:                    true,
    selectOneClobValue:     true,
    selectOneClobValueSql:  true,
    selectClobValueSql:     true,
    testParams:             false
};


// _.each(libPromisify, function(v, k) {
//     OracleDB.prototype[k] = (v ? promisify(lib[k]) : lib[k]);
// });


// // own properties
// OracleDB.prototype._stats = { connCnt: [] };

module.exports = OracleDB;


/*
 * Private functions
 */
function getOutFormatDriverIdentifier(outFormat, driver) {
    switch (outFormat) {
        case 'array':
            return driver.ARRAY;
        case 'object':
            return driver.OBJECT;
    }

    throw new Error(`Value ${outFormat} is not supported for config key: outFormat (supported values: array, object)!`);
}

function getDbConnectionFn(dal) {
    return cb => {
        dal.getDbConnection((err, conn) => {
            if (err) {
                cb(new Error(err), conn);
                return;
            }
            cb(null, conn);
        });
    };
}

function enableDbmsOutput(conn, cb) {
    conn.execute("BEGIN DBMS_OUTPUT.ENABLE(NULL); END;", function(err) {
        return cb(err, conn);
    });
}

function getFetchDbmsOutputLineFn (dal) {
    const fetchDbmsOutputLine = (conn, results, dbmsOutput, cb) => {

        const par = {
            ln: {dir: dal.BIND_OUT, type: dal.STRING, maxSize: 32767},
            st: {dir: dal.BIND_OUT, type: dal.NUMBER}
        };

        conn.execute("BEGIN DBMS_OUTPUT.GET_LINE(:ln, :st); END;", par, (err, output) => {
            if (err) {
                cb(new Error(err), conn);
            } else {
                if (output.outBinds.st == 1) {
                    cb(null, conn, {results: results, dbmsOutput: dbmsOutput.join("\n")});  // no more output
                } else {
                    dbmsOutput.push(output.outBinds.ln);
                    fetchDbmsOutputLine(conn, results, dbmsOutput, cb);
                }
            }
        });
    };

    return fetchDbmsOutputLine;
}

function releaseDbConnection(conn, data, cb) {
    conn.release(err => {
        if (err) {
            cb(new MyError(err), conn);
            return;
        }
        cb(null, data);
    });
}

function getCatchErrorFn(callback) {
    return (err, conn) => {
        if (err) {
            callback(new Error(err));
        }
        conn.release(getNoopCallback('getCatchErrorFn'));
    };
}

function setNlsSessionParams(conn, params) {
    if (!params) {
        return conn;
    }

    const
        sqlArr = [],
        executeSql = (sql, cb) => {
            conn.execute(sql, [], err => {
                if (err) {
                    // do not release connection!!!
                    cb(new MyError(err, { sql: sql }));
                    return;
                }
                cb();
            });
        };

    return new Promise((resolve, reject) => {
        _.each(params, (v, k) => {
            sqlArr.push('ALTER SESSION SET ' + k + ' = \'' + v + '\'');
        });

        async.mapSeries(sqlArr, executeSql, err => {
            if (err) {
                reject(new MyError(err, { sqlArr }));
                conn.release(getNoopCallback('setNlsSessionParams'));
                return;
            }
            resolve(conn);
        });
    });
}

function getNoopCallback(tagPlace) {
    return (err) => {
        if(err) {
            new MyError(err, { tagPlace });
        }
    }
}

function fetchLobData(obj, cb) {
    if (obj.lob === null) {
        cb(null, null);
        return;
    }

    obj.lob.setEncoding('utf8');  // we want text, not binary output

    obj.outData = '';

    obj.lob.on('data',  chunk => { obj.outData += chunk; });
    obj.lob.on('close', ()    => { cb(null, obj); });
    obj.lob.on('error', cb);
}

function fetchResultSet(result, connection, par, cb) {
    let allRows = [],
        numRows = 50,
        fetchClobs = _.get(par, 'opt.fetchClobs', false);

    fetch();

    function fetch() {
        result.resultSet.getRows(numRows, (err, rows) => {
            if (err)  {
                connection.release(getNoopCallback('selectAllRowsSql resultSet.getRows'));
                cb(new MyError(err, { sql: par.sql, bind: par.bind }));
                return;
            }

            if(!fetchClobs) {
                processRows(rows);
                return;
            }

            const lobsToProcess = [];

            // process lobs colls
            _.each(rows, (row, rowIndex) => {
                _.each(row, (lob, field) => {
                    if(lob && typeof lob.iLob === 'object') {
                        lobsToProcess.push({ rowIndex, field, lob });
                    }
                });
            });

            async.map(lobsToProcess, fetchLobData, (err, results) => {
                _.each(results, v => {
                   rows[v.rowIndex][v.field] = v.outData;
                });

                processRows(rows);
            });
        });
    }

    function processRows(rows) {
        allRows = allRows.concat(rows);

        if (rows.length === numRows) {
            fetch();
        } else {
            closeResultSetAndReturnResponse();
        }
    }

    function closeResultSetAndReturnResponse() {
        result.resultSet.close(err => {
            if (err) {
                connection.release(getNoopCallback('selectAllRowsSql resultSet.close'));
                cb(new MyError(err, { sql: par.sql, bind: par.bind }));
                return;
            }

            connection.release(err => {
                if (err) {
                    cb(new MyError(err));
                    return;
                }

                cb(null, allRows);
            });
        });
    }
}