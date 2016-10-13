process.env.UV_THREADPOOL_SIZE = 10; // This will work

var operateSimultaneouslyTabsCnt  =  20, // równoczesny zapis do n tabel
    insertsSimultaneouslyPerTable =   2, // liczba równoległych insertów per tabela
    poolMax                       =  10; // maxymalna liczba połączeń w puli
// setup MyError
require("../lib/my-error");

var assert     = require('assert'),
    async      = require('async'),
    conf       = require('./../config').oracle,
    dalFactory = require('../../lib/dalFactory'),
    MyErrorOrgin = MyError;

conf.connection.poolMax = poolMax;

describe('Performance tests', function() {
    var dal, tables = [], records = [];

    before(function(done) {

        dalFactory('oracledb', conf, function(err, dalObj) {
            if(err) {
                done(err);
                return;
            }
            dal = dalObj;
            done();
        });

        for(var i = 1; i < 101; i++) {
            tables.push('test_tab_' + i);
            records.push({ id: i, text: 'rec no ' + i });
        }
    });

    describe('prepare DB structure', function() {
        this.timeout(120000); // 2 minuty

        disableConsoleLogErrors();

        it('should drop 100 tables from previous test run', function(done) {
            var dropTabs = function(tabname, cb) {
                dal.querySql('DROP TABLE ' + tabname, [], function() {
                    cb(); // ignore errors
                });
            };
            async.mapSeries(tables, dropTabs, done);
        });

        it('should create 100 tables', function(done) {
            var createTabs = function(tabname, cb) {
                var sql = 'CREATE TABLE ' + tabname + ' (id NUMBER NOT NULL, text VARCHAR2(20))';
                dal.querySql(sql, [], function() {
                    cb(); // ignore errors
                });
            };
            async.mapSeries(tables, createTabs, () => {
                enableConsoleLogErrors();
                done();
            });
        });

    });

    describe('insert records', function() {
        this.timeout(120000); // 2 minuty

        it('should insert 100*100 records in ' + (operateSimultaneouslyTabsCnt * insertsSimultaneouslyPerTable) + ' parallel sessions', function(done) {
            var insertRecsClosure = function(tab) {
                return function (rec, cb) {
                    dal.insert(tab, rec, cb);
                };
            };
            var insertIntoTable = function(table, cb) {
                async.mapLimit(records, insertsSimultaneouslyPerTable, insertRecsClosure(table), cb);
            };

            async.mapLimit(tables, operateSimultaneouslyTabsCnt, insertIntoTable, function(err) {
                if(err) {
                    done(err);
                    return;
                }
                done();
            });
        });
    });

    describe('test count(*) for all tables', function() {
        this.timeout(120000); // 2 minuty

        it('test if count(*) = 100', function(done) {
            var sqlArray = [];
            tables.forEach(function(tab) {
                sqlArray.push('SELECT count(*) AS ile FROM ' + tab);
            });
            var selectCount = function(sql, cb) {
                dal.querySql(sql, [], { outFormat: 'array' }, cb);
            };

            async.mapLimit(sqlArray, operateSimultaneouslyTabsCnt, selectCount, function(err, results) {
                if(err) {
                    done(err);
                    return;
                }
                results.forEach(function(r) {
                    //console.log('r: ', r);
                    assert.deepEqual(r.rows[0][0], 100);
                });
                done();
            });
        });
    });

    // runs after all tests in this block
    after(function() {
        dal.getDbPool()._logStats();
    });

});

function disableConsoleLogErrors() {
    global.MyError = Error;
}

function enableConsoleLogErrors() {
    global.MyError = MyErrorOrgin;
}
