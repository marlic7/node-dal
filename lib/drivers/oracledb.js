"use strict";

/*
    Oracle driver for DAL based on node-oracledb (https://github.com/oracle/node-oracledb/)
 */
const _            = require('lodash'),
    prepare        = require('oracle-prepare-sql'),
    async          = require('async'),
    inherits       = require('util').inherits,
    AbstractDriver = require('../AbstractDriver'),
    promisify      = require('../promisify'),
    requiredVer    = '~1.10.0'; // oracledb@1.10.0 >= requiredVer < oracledb@1.11.0

// private data (for override Abstract configuration)
const _configuration = {
    dbType:         'oracle',
    dbVer:              '11',
    maxRows:             100 // max rows for fetch results
};

function OracleDB(driver, cfg) {
    // override Abstract configuration
    cfg = _.extend(_configuration, cfg);

    // invoke constructor from base class
    OracleDB.super_.apply(this, arguments);

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
inherits(OracleDB, AbstractDriver);


/*
 * Start oracledb driver implementation
 */

const lib = {
    /**
     * init and remember dbPool and return OracleDB object in callback
     *
     * @param cb
     */
    setupPool: function(cb) {
        const self = this;

        // standard setup checks
        try {
            this.performStandardSetupChecks(requiredVer);
        } catch (e) {
            cb(e);
            return;
        }

        // setup maxRows
        this.getDriver().maxRows = this.getCfg().maxRows;

        this.getDriver().createPool(this.getCfg().connection, function(err, pool) {
            if (err) {
                cb(new Error(err));
                return;
            }
            self.setDbPool(pool);
            self.setDbPool = null; // disable setter (no longer needed)

            cb(null, self);
        });
    },

    /**
     * Pobiera połączenie z póli, jeżeli wszystkie zajęte to czeka losowy czas i ponawia próbę
     * Error: ORA-24418: Nie można otworzyć kolejnych sesji.
     *
     * @params 'cb:function, [probes:number], [waitTime:waitTime]'
     */
    getDbConnection: function() {
        const par    = this.getFnParams(arguments, 'getDbConnection'),
            dbPool = this.getDbPool(),
            self   = this;

        dbPool.getConnection(function(err, connection) {
            if (err) {
                par.cb(new MyError(err));
                return;
            }

            if(self.getCfg().nlsSessionParameters) {
                // todo-me: implement it once per new session when it be possible (https://github.com/oracle/node-oracledb/issues/258)
                setNlsSessionParams(connection, self.getCfg().nlsSessionParameters, par.cb);
            } else {
                par.cb(null, connection);
            }
        });
    },

    /**
     * Execute SQL queries within db transaction (all queries have to successful finish either rollback will be invoke)
     *
     * @params 'sqlBindArray:Array, cb:function'
     */
    executeTransaction: function() {
        var par = this.getFnParams(arguments, 'executeTransaction');

        this.getDbConnection(function(err, connection) {
            if (err) {
                par.cb(new MyError(err));
                return;
            }

            connection.autoCommit   = false;

            var executeSql = function(sqlBind, cb) {
                connection.execute(sqlBind[0], sqlBind[1], function(err, results) {
                    if (err) {
                        // do not release connection!!!
                        cb(new MyError(err, sqlBind));
                        return;
                    }
                    cb(null, results);
                });
            };

            async.mapSeries(par.sqlBindArray, executeSql, function(err, results) {
                if (err) {
                    connection.rollback(function(err) {
                        if (err) {
                            par.cb(err);
                            // return; // must be commented becouse we need release
                        }

                        connection.release(_.noop); // ignore error
                    });
                    par.cb(new MyError(err));
                    return;
                }

                connection.commit(function(err) {
                    if (err) {
                        par.cb(err);
                        connection.release(_.noop); // ignore error
                        return;
                    }

                    connection.release(function (err) {
                        if (err) {
                            par.cb(err);
                            return;
                        }
                        par.cb(null, results);
                    });
                });
            });
        });
    },

    /**
     * @params 'sql:string, bind:object|Array, [opt:object], cb:function'
     */
    selectOneRowSql: function() {
        const par     = this.getFnParams(arguments, 'selectOneRowSql'),
            execOpt = {};

        if(_.has(par.opt, 'outFormat')) {
            execOpt.outFormat = getOutFormatDriverIdentifier(par.opt.outFormat, this.getDriver());
        }

        this.getDbConnection(function(err, connection) {
            if (err) {
                par.cb(new MyError(err));
                return;
            }

            connection.execute(par.sql, par.bind, execOpt, function(err, result) {
                if (err) {
                    connection.release(_.noop); // ignore error
                    par.cb(new MyError(err, {sql: par.sql, bind: par.bind}));
                    return;
                }

                /* Release the connection back to the connection pool */
                connection.release(function(err) {
                    if (err) {
                        par.cb(new MyError(err));
                        return;
                    }

                    if(result && result.rows) {
                        if(result.rows.length > 1) {
                            par.cb(new MyError('Wrong number rows returned from database (' + result.rows.length + ')'));
                            return;
                        }
                        par.cb(null, result.rows[0]);
                    } else {
                        par.cb(null, []);
                    }
                });
            });
        });
    },

    /**
     * @params 'tbl:string, [fields:Array|null], where:Array, [opt:object], cb:function'
     */
    selectOneRow: function() {
        let par = this.getFnParams(arguments, 'selectOneRow'),
            obj;

        try {
            obj = prepare.prepareQuery(par.tbl, par.fields, par.where);
        } catch (e) {
            par.cb(e);
            return;
        }

        this.selectOneRowSql(obj.sql, obj.params, par.opt, par.cb);
    },

    /**
     * @params 'sql:string, bind:object|Array, [opt:object], cb:function'
     */
    selectOneValueSql: function() {
        let par   = this.getFnParams(arguments, 'selectOneValueSql'),
            ARRAY = this.getDriver().ARRAY;

        this.getDbConnection(function(err, connection){
            if (err) {
                par.cb(new MyError(err));
                return;
            }

            connection.execute(par.sql, par.bind, { outFormat: ARRAY }, function(err, result) {
                if (err) {
                    connection.release(_.noop); // ignore error
                    par.cb(new MyError(err, {sql: par.sql, bind: par.bind}));
                    return;
                }

                /* Release the connection back to the connection pool */
                connection.release(function(err) {
                    if (err) {
                        par.cb(new MyError(err));
                        return;
                    }
                    if(result && result.rows && result.rows.length > 0) {
                        if(result.rows.length > 1) {
                            par.cb(new MyError('Wrong number rows returned from database (' + result.rows.length + ')'));
                            return;
                        }
                        if(result.rows[0].length !== 1) {
                            par.cb(new MyError('Wrong number colls returned from database (' + result.rows[0].length + ')'));
                            return;
                        }
                        par.cb(null, result.rows[0][0]);
                    } else {
                        par.cb(null, null);
                    }
                });
            });
        });
    },

    /**
     * @params 'tbl:string, field:string, where:Array|object, cb:function'
     */
    selectOneValue: function() {
        let par = this.getFnParams(arguments, 'selectOneValue'),
            obj;

        try {
            obj = prepare.prepareQuery(par.tbl, [par.field], par.where);
        } catch (e) {
            par.cb(e);
            return;
        }

        this.selectOneValueSql(obj.sql, obj.params, par.cb);
    },

    /**
     * @params 'sql:string, bind:object|Array, [opt:object], cb:function'
     */
    selectAllRowsSql: function() {
        let par     = this.getFnParams(arguments, 'selectAllRowsSql'),
            execOpt = { resultSet: true },
            allRows = [];

        if(_.has(par.opt, 'outFormat')) {
            execOpt.outFormat = getOutFormatDriverIdentifier(par.opt.outFormat, this.getDriver());
        }

        // limit, page (pagination)
        if(_.get(par.opt, 'limit')) {
            let limit = par.opt.limit,
                page = _.get(par.opt, 'page') || 1,
                re = new RegExp(/order\s+by\s+[a-z0-9,\s]+/i),
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

            par.sql = 'SELECT * FROM (\n' +
                'SELECT a.*, rownum r__\n' +
                'FROM (\n' +
                par.sql + '\n' +
                ') a\n' +
                'WHERE rownum < ((' + page + ' * ' + limit + ') + 1 )\n' +
                ')\n' +
                'WHERE r__ >= (((' + page + '-1) * ' + limit + ') + 1)';
        }

        this.getDbConnection(function(err, connection) {
            if (err) {
                par.cb(new MyError(err));
                return;
            }

            connection.execute(par.sql, par.bind, execOpt, function(err, result) {
                if (err) {
                    connection.release(_.noop); // ignore error
                    par.cb(new MyError(err, { sql: par.sql, bind: par.bind }));
                    return;
                }

                function fetch() {
                    let max = 50;
                    result.resultSet.getRows(max, function(err, rows) {
                        if (err)  {
                            connection.release(_.noop); // ignore error
                            par.cb(new MyError(err, { sql: par.sql, bind: par.bind }));
                            return;
                        }
                        allRows = allRows.concat(rows);
                        if (rows.length === max) {
                            fetch();
                        } else {
                            result.resultSet.close(function(err) {
                                if (err) {
                                    connection.release(_.noop); // ignore error
                                    par.cb(new MyError(err, { sql: par.sql, bind: par.bind }));
                                    return;
                                }

                                connection.release(function(err) {
                                    if (err) {
                                        par.cb(new MyError(err));
                                        return;
                                    }

                                    par.cb(null, allRows);
                                });
                            });
                        }
                    });
                }
                fetch();
            });
        });
    },

    /**
     * @params 'tbl:string, [fields:Array], [where:Array|object], [order:Array|string], [opt:object], cb:function'
     */
    selectAllRows: function() {
        let par   = this.getFnParams(arguments, 'selectAllRows'),
            obj,
            limit = _.get(par.opt, 'limit'),
            page  = _.get(par.opt, 'page'),
            tc    = _.get(par.opt, 'totalCount');

        try {
            obj     = prepare.prepareQuery(par.tbl, par.fields, par.where, par.order, limit, page, tc);
            par.opt = _.omit(par.opt, ['limit', 'page', 'totalCount']);
        } catch (e) {
            par.cb(e);
            return;
        }
        this.selectAllRowsSql(obj.sql, obj.params, par.opt, par.cb);
    },

    /**
     *
     * example for bind object:
     * {
     *     i:  'Chris',  // bind type is determined from the data type
     *     io: { val: 'Jones', dir : oracledb.BIND_INOUT },
     *     o:  { type: oracledb.NUMBER, dir : oracledb.BIND_OUT },
     * }
     * @params 'procName:string, bind:object|Array, [opt:object], cb:function'
     */
    runProcedure: function() {
        let par    = this.getFnParams(arguments, 'runProcedure'),
            params = [],
            binds  = {},
            that   = this,
            sql;

        _.each(par.bind, function(v, k) {
            if(typeof v === 'object' && v.fn && typeof v.bind !== 'undefined') {
                params.push(v.fn.replace(/\?/g, ':' + k));
                binds[k] = v.bind;
            } else {
                params.push(':' + k);
                binds[k] = v;
            }
        });

        sql = 'BEGIN ' + par.procName + '(' + params.join(', ') + '); END;';

        if(_.get(par.opt, 'dbmsOutput')) { // when we catch DBMS_OUTPUT.PUT_LINE
            async.waterfall(
                [
                    getDbConnectionFn(that),
                    enableDbmsOutput,
                    function(conn, cb) {
                        let dbmsOutput = [];
                        conn.execute(sql, binds, { autoCommit: true }, function(err, result) {
                            if (err) {
                                cb(new MyError(err, { sql: sql, bind: binds }), conn);
                                return;
                            }
                            cb(null, conn, result, dbmsOutput);
                        });
                    },
                    getFetchDbmsOutputLineFn(that),
                    releaseDbConnection,
                    function(data) {
                        par.cb(null, _.get(data, 'results.outBinds'), _.get(data, 'dbmsOutput'));
                    }
                ],
                getCatchErrorFn(par.cb)
            );
        } else {
            async.waterfall(
                [
                    getDbConnectionFn(that),
                    function(conn, cb) {
                        conn.execute(sql, binds, { autoCommit: true }, function(err, result) {
                            if (err) {
                                cb(new MyError(err, { sql: sql, bind: binds }), conn);
                                return;
                            }
                            cb(null, conn, result);
                        });
                    },
                    releaseDbConnection,
                    function(data) {
                        par.cb(null, _.get(data, 'outBinds') || []);
                    }
                ],
                getCatchErrorFn(par.cb)
            );
        }
    },

    /**
     * @params 'tbl:string, data:object, seqence:string, cb:function'
     */
    insertReturningId: function() {
        let par = this.getFnParams(arguments, 'insertReturningId'),
            obj;

        try {
            obj = prepare.prepareInsert(par.tbl, par.data);
        } catch (e) {
            par.cb(e);
            return;
        }
        this.insertReturningIdSql(obj.sql, obj.params, par.seqence, par.cb);
    },

    /**
     * @params 'sql:string, bind:object|Array, seqence:string, cb:function'
     */
    insertReturningIdSql: function() {
        const par = this.getFnParams(arguments, 'insertReturningIdSql'),
            ARRAY = this.getDriver().ARRAY;

        // params completeness check (bind should have one field with value = { type: 'pk' }
        if(!_.find(par.bind, v => _.get(v, 'type') === 'pk' )) {
            par.cb(new MyError('bind parameter should have one field with value = { type: "pk" }', { par }));
            return;
        }

        this.getDbConnection(function(err, connection){
            if (err) {
                par.cb(new MyError(err));
                return;
            }

            const sqlSeq = 'SELECT ' + par.seqence + '.NEXTVAL FROM dual';
            connection.execute(sqlSeq, [], { outFormat: ARRAY }, function(err, result1) {
                if (err) {
                    connection.release(_.noop); // ignore error
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

                connection.execute(par.sql, par.bind, { autoCommit: true }, function(err, result) {
                    if (err) {
                        connection.release(_.noop); // ignore error
                        par.cb(new MyError(err, {sql: par.sql, bind: par.bind}));
                        return;
                    }

                    /* Release the connection back to the connection pool */
                    connection.release(function (err) {
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
    },

    /**
     * @params 'sql:string, [bind:object|Array], [opt:object], cb:function'
     */
    querySql: function() {
        const par   = this.getFnParams(arguments, 'querySql'),
            execOpt = { autoCommit: true },
            driver  = this.getDriver();

        this.getDbConnection(function(err, connection) {
            if (err) {
                par.cb(new MyError(err));
                return;
            }

            if(_.has(par.opt, 'outFormat')) {
                execOpt.outFormat = getOutFormatDriverIdentifier(par.opt.outFormat, driver);
            }

            par.bind = par.bind || [];

            connection.execute(par.sql, par.bind, execOpt, function(err, result) {
                if (err) {
                    connection.release(_.noop); // ignore error todo: logging error
                    par.cb(new MyError(err, {sql: par.sql, bind: par.bind}));
                    return;
                }

                /* Release the connection back to the connection pool */
                connection.release(function(err) {
                    if (err) {
                        par.cb(new MyError(err));
                        return;
                    }

                    if(result) {
                        par.cb(null, result);
                    } else {
                        par.cb(null, []);
                    }
                });
            });
        });
    },

    /**
     * @params 'tbl:string, data:object, where:Array|object, cb:function'
     */
    update: function() {
        let par = this.getFnParams(arguments, 'update'),
            obj;

        try {
            obj = prepare.prepareUpdate(par.tbl, par.data, par.where);
        } catch (e) {
            par.cb(e);
            return;
        }

        this.querySql(obj.sql, obj.params, par.cb);
    },

    /**
     * @params 'tbl:string, data:object, cb:function'
     */
    insert: function() {
        let par = this.getFnParams(arguments, 'insert'),
            obj;

        try {
            obj = prepare.prepareInsert(par.tbl, par.data);
        } catch (e) {
            par.cb(e);
            return;
        }

        this.querySql(obj.sql, obj.params, par.cb);
    },

    /**
     * @params 'tbl:string, where:Array|object, cb:function'
     */
    del: function() {
        let par = this.getFnParams(arguments, 'del'),
            obj;

        try {
            obj = prepare.prepareDelete(par.tbl, par.where);
        } catch (e) {
            par.cb(e);
            return;
        }

        this.querySql(obj.sql, obj.params, par.cb);
    },

    /**
     * @params 'sql:string, bind:object|Array, [opt:object], cb:function'
     */
    selectClobValueSql: function() {
        const par = this.getFnParams(arguments, 'selectClobValueSql'),
            ARRAY = this.getDriver().ARRAY;

        this.getDbConnection(function(err, connection) {
            if (err) {
                par.cb(new MyError(err));
                return;
            }

            connection.execute(par.sql, par.bind, { outFormat: ARRAY }, function(err, result) {
                if (err) {
                    connection.release(_.noop); // ignore error
                    par.cb(new MyError(err, {sql: par.sql, bind: par.bind}));
                    return;
                }

                // closure
                const retValue = function(value) {
                    connection.release(function(err) {
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
                    const lob = result.rows[0][0];

                    if (lob === null) {
                        retValue(null);
                        return;
                    }

                    lob.setEncoding('utf8');  // we want text, not binary output

                    let outData = '';
                    lob.on('data',  function(chunk) { outData += chunk;  });
                    lob.on('close', function()      { retValue(outData); });
                    lob.on('error', function(err)   {
                        connection.release(_.noop); // ignore error
                        par.cb(new MyError(err));
                    });
                }
            });
        });
    },

    /**
     * only for test purpose
     */
    testParams: function() {
        const par = this.getFnParams(arguments, 'testParams');

        // eslint-disable-next-line
        console.log('testParams params: ', par);
        par.cb();
    }
};


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
    selectClobValueSql:     true,
    testParams:             false
};


_.each(libPromisify, function(v, k) {
    OracleDB.prototype[k] = (v ? promisify(lib[k]) : lib[k]);
});


// own properties
OracleDB.prototype._stats = { connCnt: [] };

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
    return function(cb) {
        dal.getDbConnection(function(err, conn) {
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
    const fetchDbmsOutputLine = function (conn, results, dbmsOutput, cb) {

        const par = {
            ln: {dir: dal.BIND_OUT, type: dal.STRING, maxSize: 32767},
            st: {dir: dal.BIND_OUT, type: dal.NUMBER}
        };

        conn.execute("BEGIN DBMS_OUTPUT.GET_LINE(:ln, :st); END;", par, function (err, output) {
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
    conn.release(function(err) {
        if (err) {
            cb(new MyError(err), conn);
            return;
        }
        cb(null, data);
    });
}

function getCatchErrorFn(callback) {
    return function(err, conn) {
        if (err) {
            callback(new Error(err));
        }
        conn.release(_.noop); // ignore error
    };
}

function setNlsSessionParams(conn, params, callback) {
    const sqls = [];

    _.each(params, function(v, k) {
        sqls.push('ALTER SESSION SET ' + k + ' = \'' + v + '\'');
    });

    const executeSql = function(sql, cb) {
        conn.execute(sql, [], function(err) {
            if (err) {
                // do not release connection!!!
                cb(new MyError(err, { sql: sql }));
                return;
            }
            cb();
        });
    };

    async.mapSeries(sqls, executeSql, function(err) {
        if (err) {
            callback(new MyError(err));
            conn.release(_.noop); // ignore error
            return;
        }

        callback(null, conn);
    });
}
