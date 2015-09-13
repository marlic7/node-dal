/*
    Oracle driver for DAL based on node-oracledb (https://github.com/oracle/node-oracledb/)
 */
var _              = require('underscore-mixins2'),
    prepare        = require('oracle-prepare-sql'),
    async          = require('async'),
    inherits       = require('util').inherits,
    AbstractDriver = require('../AbstractDriver'),
    requiredVer    = '1.1.0'; // oracledb@1.1.0

// private data (for override Abstract configuration)
var _configuration = {
    dbType:         'oracle',
    dbVer:              '11',
    maxRows:             100, // max rows for fetch results
    getConnMaxProbes:     30, // times
    getConnWaitMinTime: 1000, // miliseconds
    getConnWaitMaxTime: 4000
};

function OracleDB(driver, cfg) {
    // override Abstract configuration
    //noinspection JSUnusedAssignment
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
}
inherits(OracleDB, AbstractDriver);

module.exports = OracleDB;

/*
 * Start oracledb driver implementation
 */

/**
 * init and remember dbPool and return OracleDB object in callback
 *
 * @param cb
 */
OracleDB.prototype.setupPool = function(cb) {
    var self = this;

    // standard setup checks
    try {
        this.performStandardSetupChecks(requiredVer);
    } catch (e) {
        cb(e);
        return;
    }

    // setup maxRows
    this.getDriver().maxRows = this.getCfg().maxRows;

    //noinspection JSUnresolvedFunction
    this.getDriver().createPool(this.getCfg().connection, function(err, pool) {
        if (err) {
            cb(new Error(err));
            return;
        }
        self.setDbPool(pool);
        self.setDbPool = null; // disable setter (no longer needed)

        cb(null, self);
    });
};

/**
 * Pobiera połączenie z póli, jeżeli wszystkie zajęte to czeka losowy czas i ponawia próbę
 * Error: ORA-24418: Nie można otworzyć kolejnych sesji.
 *
 * @params 'cb:function, [probes:number], [waitTime:waitTime]'
 */
OracleDB.prototype.getDbConnection = function(cb) {
    var par    = this.getFnParams(arguments, 'getDbConnection'),
        dbPool = this.getDbPool(),
        self   = this,
        poolUsage = dbPool.connectionsInUse/dbPool.poolMax;

    par.probes   = par.probes   || 1;
    par.waitTime = par.waitTime || 0;

    // priority
    //1. if pool is 80% in use then push new conn request in queue with random delay
    if(poolUsage > 0.8 && poolUsage < 1 && par.probes < 2) {
        invokeNextProbeAfterRandomDelay(par.cb, par.probes, par.waitTime, this);
        return;
    }
    // 2. if pool is 100% in use then queue request with delay < 3 * cfg.getConnWaitMinTime
    if(poolUsage == 1 && par.probes < 3) {
        invokeNextProbeAfterRandomDelay(par.cb, par.probes, par.waitTime, this);
        return;
    }

    //noinspection JSUnresolvedFunction
    dbPool.getConnection(function(err, connection) {
        if (err) {
            if(err.message.match(/ORA-24418/)) {
                if (par.probes < self.getCfg().getConnMaxProbes) {
                    invokeNextProbeAfterRandomDelay(par.cb, par.probes, par.waitTime, self);
                } else {
                    var debug = { timeout: true, probes: par.probes };
                    par.cb(new MyError(err, debug));
                }
            } else {
                par.cb(new MyError(err));
            }
            return;
        }
        if(self.getCfg().gatherStats) {
            self._stats.connCnt.push([par.probes, par.waitTime]);
        }
        par.cb(null, connection);
    });
};

/**
 * Execute SQL queries within db transaction (all queries have to successful finish either rollback will be invoke)
 *
 * @params 'sqlBindArray:Array, cb:function'
 */
OracleDB.prototype.executeTransaction = function(sqlBindArray, cb) {
    var par = this.getFnParams(arguments, 'executeTransaction');

    this.getDbConnection(function(err, connection) {
        if (err) {
            par.cb(new MyError(err));
            return;
        }

        // isAutoCommit for oracledb < 0.5
        connection.isAutoCommit = false;
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
                //noinspection JSUnresolvedFunction
                connection.rollback(function(err) {
                    if (err) {
                        par.cb(err);
                        // return; // must be commented becouse we need release
                    }

                    //noinspection JSUnresolvedVariable
                    connection.release(_.noop); // ignore error
                });
                par.cb(new MyError(err));
                return;
            }

            connection.commit(function(err) {
                if (err) {
                    par.cb(err);
                    //noinspection JSUnresolvedVariable
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
};

/**
 * @params 'sql:string, bind:object|Array, [opt:object], cb:function'
 */
OracleDB.prototype.selectOneRowSql = function(sql, bind, _opt, cb) {
    var par     = this.getFnParams(arguments, 'selectOneRowSql'),
        execOpt = {};

    //noinspection JSUnresolvedVariable
    if(_.lookup(par.opt, 'outFormat') !== 'array') {
        execOpt.outFormat = this.getDriver().OBJECT;
    }

    this.getDbConnection(function(err, connection){
        if (err) {
            par.cb(new MyError(err));
            return;
        }

        //noinspection JSUnresolvedVariable
        connection.execute(par.sql, par.bind, execOpt, function(err, result) {
            if (err) {
                //noinspection JSUnresolvedVariable
                connection.release(_.noop); // ignore error
                par.cb(new MyError(err, {sql: sql, bind: bind}));
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
};

/**
 * @params 'tbl:string, [fields:Array|null], where:Array, [opt:object], cb:function'
 */
OracleDB.prototype.selectOneRow = function(tbl, _fields, where, _opt, cb) {
    var par = this.getFnParams(arguments, 'selectOneRow'),
        obj;

    try {
        obj = prepare.prepareQuery(par.tbl, par.fields, par.where);
    } catch (e) {
        par.cb(e);
        return;
    }

    //noinspection JSUnresolvedVariable
    this.selectOneRowSql(obj.sql, obj.params, par.opt, par.cb);
};

/**
 * @params 'sql:string, bind:object|Array, [opt:object], cb:function'
 */
OracleDB.prototype.selectOneValueSql = function(sql, bind, _opt, cb) {
    var par = this.getFnParams(arguments, 'selectOneValueSql');

    this.getDbConnection(function(err, connection){
        if (err) {
            par.cb(new MyError(err));
            return;
        }

        //noinspection JSUnresolvedVariable
        connection.execute(par.sql, par.bind, function(err, result) {
            if (err) {
                //noinspection JSUnresolvedVariable
                connection.release(_.noop); // ignore error
                par.cb(new MyError(err, {sql: sql, bind: bind}));
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
};

/**
 * @params 'tbl:string, field:string, where:Array|object, cb:function'
 */
OracleDB.prototype.selectOneValue = function(tbl, field, where, cb) {
    var par = this.getFnParams(arguments, 'selectOneValue'),
        obj;

    try {
        //noinspection JSUnresolvedVariable
        obj = prepare.prepareQuery(par.tbl, [par.field], par.where);
    } catch (e) {
        par.cb(e);
        return;
    }

    this.selectOneValueSql(obj.sql, obj.params, par.cb);
};

/**
 * @params 'sql:string, bind:object|Array, [opt:object], cb:function'
 */
OracleDB.prototype.selectAllRowsSql = function(sql, bind, _opt, cb) {
    var par     = this.getFnParams(arguments, 'selectAllRowsSql'),
        execOpt = { resultSet: true },
        allRows = [];

    //noinspection JSUnresolvedVariable
    if(_.lookup(par.opt, 'outFormat') !== 'array') {
        execOpt.outFormat = this.getDriver().OBJECT;
    }

    // limit, page (stronicowanie)
    //noinspection JSUnresolvedVariable
    if(_.lookup(par.opt, 'limit')) {
        //noinspection JSUnresolvedVariable,JSCheckFunctionSignatures
        var limit = par.opt.limit,
            page = _.lookup(par.opt, 'page') || 1,
            re = new RegExp(/order\s+by\s+[a-z0-9,\s]+/i),
            order;

        // dopisanie ROWID do sortowania aby zawsze mieć właściwą kolejność rekordów
        if (par.sql.match(re)) {
            // sprawdzenie czy jest ID w order by
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

    //noinspection JSUnresolvedFunction
    this.getDbConnection(function(err, connection){
        if (err) {
            par.cb(new MyError(err));
            return;
        }

        //noinspection JSUnresolvedVariable
        connection.execute(par.sql, par.bind, execOpt, function(err, result) {
            if (err) {
                //noinspection JSUnresolvedVariable
                connection.release(_.noop); // ignore error
                par.cb(new MyError(err, { sql: par.sql, bind: par.bind }));
                return;
            }

            function fetch() {
                var max = 50;
                //noinspection JSUnresolvedFunction
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
};

/**
 * @params 'tbl:string, [fields:Array], [where:Array|object], [order:Array|string], [opt:object], cb:function'
 */
OracleDB.prototype.selectAllRows = function(tbl, _fields, _where, _order, _opt, cb) {
    var par   = this.getFnParams(arguments, 'selectAllRows'),
        obj,
        limit = _.lookup(par.opt, 'limit'),
        page  = _.lookup(par.opt, 'page'),
        tc    = _.lookup(par.opt, 'totalCount');

    try {
        obj   = prepare.prepareQuery(par.tbl, par.fields, par.where, par.order, limit, page, tc);
        par.opt = _.omit(par.opt, ['limit', 'page', 'totalCount']);
    } catch (e) {
        par.cb(e);
        return;
    }
    this.selectAllRowsSql(obj.sql, obj.params, par.opt, par.cb);
};

/**
 *
 * example for bind object:
 * {
 *     i:  'Chris',  // bind type is determined from the data type
 *     io: { val: 'Jones', dir : oracledb.BIND_INOUT },
 *     o:  { type: oracledb.NUMBER, dir : oracledb.BIND_OUT },
 * }
 * @params 'procName:string, bind:object|Array, cb:function'
 */
OracleDB.prototype.runProcedure = function(procName, bind, cb) {
    var par    = this.getFnParams(arguments, 'runProcedure'),
        params = [], sql;

    _.keys(par.bind).forEach(function(itm) {
        params.push(':' + itm);
    });
    //noinspection JSUnresolvedVariable
    sql = 'BEGIN ' + par.procName + '(' + params.join(', ') + '); END;';

    //noinspection JSUnresolvedFunction
    this.getDbConnection(function(err, connection){
        if (err) {
            par.cb(new MyError(err));
            return;
        }

        //noinspection JSUnresolvedVariable
        connection.execute(sql, par.bind, { isAutoCommit: true, autoCommit: true }, function(err, result) { // isAutoCommit for oracledb < 0.5
            if (err) {
                //noinspection JSUnresolvedVariable
                connection.release(_.noop); // ignore error
                par.cb(new MyError(err, { sql: sql, bind: par.bind }));
                return;
            }

            /* Release the connection back to the connection pool */
            connection.release(function(err) {
                if (err) {
                    par.cb(new MyError(err));
                    return;
                }

                //noinspection JSUnresolvedVariable
                if(result) {
                    //noinspection JSUnresolvedVariable
                    par.cb(null, _.lookup(result, 'outBinds'));
                } else {
                    par.cb(null, []);
                }
            });
        });
    });
};

/**
 * @params 'tbl:string, data:object, seqence:string, cb:function'
 */
OracleDB.prototype.insertReturningId = function(tbl, data, seqence, cb) {
    var par = this.getFnParams(arguments, 'insertReturningId'),
        obj;

    try {
        obj = prepare.prepareInsert(par.tbl, par.data);
    } catch (e) {
        par.cb(e);
        return;
    }
    //noinspection JSUnresolvedVariable
    this.insertReturningIdSql(obj.sql, obj.params, par.seqence, par.cb);
};

/**
 * @params 'sql:string, bind:object|Array, seqence:string, cb:function'
 */
OracleDB.prototype.insertReturningIdSql = function(sql, bind, seqence, cb) {
    var par = this.getFnParams(arguments, 'insertReturningIdSql');

    this.getDbConnection(function(err, connection){
        if (err) {
            par.cb(new MyError(err));
            return;
        }

        //noinspection JSUnresolvedVariable
        var sqlSeq = 'SELECT ' + par.seqence + '.NEXTVAL FROM dual';
        //noinspection JSUnresolvedVariable
        connection.execute(sqlSeq, [], function(err, result1) {
            if (err) {
                //noinspection JSUnresolvedVariable
                connection.release(_.noop); // ignore error
                par.cb(new MyError(err, {sql: sqlSeq}));
                return;
            }

            var seqId, key0;
            try {
                seqId = result1.rows[0][0];
                key0  = _.keys(par.bind)[0];
                if(typeof key0 === 'string') {
                    par.bind[key0] = seqId;
                } else {
                    par.bind[0] = seqId;
                }
            } catch (e) {
                //noinspection JSUnusedAssignment
                par.cb(new MyError('Wrong array/object with bind values!', {bind: par.bind, result1: result1, e: e.message, key0: key0}));
                return;
            }

            //noinspection JSUnresolvedVariable
            connection.execute(par.sql, par.bind, { isAutoCommit: true, autoCommit: true }, function(err, result) { // isAutoCommit for oracledb < 0.5
                if (err) {
                    //noinspection JSUnresolvedVariable
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
};

/**
 * @params 'sql:string, [bind:object|Array], [opt:object], cb:function'
 */
OracleDB.prototype.querySql = function(sql, bind, _opt, cb) {
    var par = this.getFnParams(arguments, 'querySql');

    this.getDbConnection(function(err, connection) {
        if (err) {
            par.cb(new MyError(err));
            return;
        }

        par.bind = par.bind || [];

        //noinspection JSUnresolvedVariable
        connection.execute(par.sql, par.bind, { isAutoCommit: true, autoCommit: true }, function(err, result) { // isAutoCommit for oracledb < 0.5
            if (err) {
                //noinspection JSUnresolvedVariable
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

                if(result) {
                    par.cb(null, result);
                } else {
                    par.cb(null, []);
                }
            });
        });
    });
};

/**
 * @params 'tbl:string, data:object, where:Array|object, cb:function'
 */
OracleDB.prototype.update = function(tbl, data, where, cb) {
    var par = this.getFnParams(arguments, 'update'),
        obj;

    try {
        obj = prepare.prepareUpdate(par.tbl, par.data, par.where);
    } catch (e) {
        par.cb(e);
        return;
    }

    this.querySql(obj.sql, obj.params, par.cb);
};

/**
 * @params 'tbl:string, data:object, cb:function'
 */
OracleDB.prototype.insert = function(tbl, data, cb) {
    var par = this.getFnParams(arguments, 'insert'),
        obj;

    try {
        obj = prepare.prepareInsert(par.tbl, par.data);
    } catch (e) {
        par.cb(e);
        return;
    }

    this.querySql(obj.sql, obj.params, par.cb);
};

/**
 * @params 'tbl:string, where:Array|object, cb:function'
 */
OracleDB.prototype.del = function(tbl, where, cb) {
    var par = this.getFnParams(arguments, 'del'),
        obj;

    try {
        obj = prepare.prepareDelete(par.tbl, par.where);
    } catch (e) {
        par.cb(e);
        return;
    }

    this.querySql(obj.sql, obj.params, par.cb);
};

/**
 * @params 'sql:string, bind:object|Array, [opt:object], cb:function'
 */
OracleDB.prototype.selectClobValueSql = function(sql, bind, _opt, cb) {
    var par = this.getFnParams(arguments, 'selectClobValueSql');

    this.getDbConnection(function(err, connection){
        if (err) {
            par.cb(new MyError(err));
            return;
        }

        //noinspection JSUnresolvedVariable
        connection.execute(par.sql, par.bind, function(err, result) {
            if (err) {
                //noinspection JSUnresolvedVariable
                connection.release(_.noop); // ignore error
                par.cb(new MyError(err, {sql: sql, bind: bind}));
                return;
            }

            // closure
            var retValue = function(value) {
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
                var lob = result.rows[0][0];

                if (lob === null) {
                    retValue(null);
                    return;
                }

                var outData = '';

                lob.setEncoding('utf8');  // we want text, not binary output

                lob.on('data',  function(chunk) { outData += chunk;  });
                lob.on('end',   function()      { retValue(outData); });
                lob.on('error', function(err)   {
                    connection.release(_.noop); // ignore error
                    par.cb(new MyError(err));
                });
            }
        });
    });
};


// only for test params procesing
OracleDB.prototype.testParams = function() {
    var par = this.getFnParams(arguments, 'testParams');

    console.log('testParams params: ', par);
    par.cb();
};

// own properties
OracleDB.prototype._stats = { connCnt: [] };

/*
 * Private functions
 */
function getRandomConnWaitTime(cfg) {
    return Math.floor(Math.random() * (cfg.getConnWaitMaxTime - cfg.getConnWaitMinTime + 1)) + cfg.getConnWaitMinTime;
}

function invokeNextProbeAfterRandomDelay(cb, probes, waitTime, drvObj) {
    var delay = getRandomConnWaitTime(drvObj.getCfg());
    probes++;
    waitTime = waitTime + delay;

    setTimeout(function () {
        drvObj.getDbConnection(cb, probes, waitTime);
    }, delay);
}

/** @typedef {Error} MyError */