process.env.UV_THREADPOOL_SIZE = 10; // This will work

var operateSimultaneouslyTabsCnt  =  20, // równoczesny zapis do n tabel
    insertsSimultaneouslyPerTable =   2, // liczba równoległych insertów per tabela
    poolMax                       =  10, // maxymalna liczba połączeń w puli
    getConnMaxProbes              =  50, // maksymalna liczba prób pobrania połączenia z póli
    getConnWaitMinTime            = 100, // minimalna zwłoka przy odrzuconej próbie
    getConnWaitMaxTime            = 200; // maksymalna zwłoka przy odrzuconej próbie
// setup MyError
require("../lib/my-error");

var assert     = require('assert'),
    async      = require('async'),
    conf       = require('./../config').oracle,
    dalFactory = require('../../lib/dalFactory');

conf.connection.poolMax = poolMax;

describe('Performance tests', function() {
    var dal, tables = [], records = [];

    before(function(done) {

        conf.getConnMaxProbes   = getConnMaxProbes; // times
        conf.getConnWaitMinTime = getConnWaitMinTime; // miliseconds
        conf.getConnWaitMaxTime = getConnWaitMaxTime;  // miliseconds
        conf.gatherStats        = true;

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
            async.mapSeries(tables, createTabs, done);
        });

    });

    describe('insert records', function() {
        this.timeout(120000); // 2 minuty

        it('should insert 100*100 records in ' + (operateSimultaneouslyTabsCnt * insertsSimultaneouslyPerTable) + ' parallel sessions', function(done) {
            var insertRecsClosure = function(tab) {
                return function (rec, cb) {
                    dal.insert(tab, rec, cb);
                }
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
                dal.querySql(sql,[], cb);
            };

            async.mapLimit(sqlArray, operateSimultaneouslyTabsCnt, selectCount, function(err, results) {
                if(err) {
                    done(err);
                    return;
                }
                results.forEach(function(r) {
                    //noinspection JSUnresolvedVariable
                    //console.log('r: ', r);
                    assert.deepEqual(r.rows[0][0], 100);
                });
                done();
            });
        });
    });

    //describe('print stats', function() {
    //    var stat = dal.getStats().connCnt;
    //    console.log('Wszystkich pobrań z puli: ', stat.length);
    //    done();
    //});

    // runs after all tests in this block
    after(function() {
        var stat = dal.getStats().connCnt,
            Stats = require('fast-stats').Stats,
            pad = require('node-string-pad');

        // rozbij na 5 koszyków i osobno próby i waity
        var k1_p = new Stats(), k1_w = new Stats(),
            k2_p = new Stats(), k2_w = new Stats(),
            k3_p = new Stats(), k3_w = new Stats(),
            k4_p = new Stats(), k4_w = new Stats(),
            k5_p = new Stats(), k5_w = new Stats(),
            pSum = 0, wSum = 0;
        stat.forEach(function(v) {
            switch (v[0]) {
                case 1:
                    k1_p.push(v[0]);
                    k1_w.push(v[1]);
                    break;
                case 2:
                    k2_p.push(v[0]);
                    k2_w.push(v[1]);
                    break;
                case 3:
                case 4:
                case 5:
                    k3_p.push(v[0]);
                    k3_w.push(v[1]);
                    break;
                case 6:
                case 7:
                case 8:
                case 9:
                case 10:
                    k4_p.push(v[0]);
                    k4_w.push(v[1]);
                    break;
                default:
                    k5_p.push(v[0]);
                    k5_w.push(v[1]);
                    break;
            }
            pSum = pSum + v[0];
            wSum = wSum + v[1];
        });

        var getStats = function(p, w) {
            var out = [], outS = '|';
            out.push(p.length);
            out.push(w.range()[0]);
            out.push(w.range()[1]);
            out.push(w.amean().toFixed(2));
            out.push(p.range()[1]);
            out.push(p.amean().toFixed(2));

            out.forEach(function(v) {
                outS = outS + pad(v.toString(), 10, 'LEFT', ' ') + ' ' + '|';
            });

            return outS;
        };

        console.log('Wszystkich pobrań połączenia z puli:  ',  stat.length);
        console.log('Liczba wszystkich prób pobrań z puli: ', pSum);
        console.log('Łączny czas wszystkich waitów: ',        wSum);

        console.log('                                |liczebność | min opóźn.| max opóźn.| śr.opóźn. |  max prób |   śr.prób |');
        console.log('Statystyka pobrań z 1 próbą:   ',  getStats(k1_p, k1_w));
        console.log('Statystyka pobrań z 2 próbami: ',  getStats(k2_p, k2_w));
        console.log('Statystyka pobrań z 3-5 prób:  ',  getStats(k3_p, k3_w));
        console.log('Statystyka pobrań z 6-10 prób: ',  getStats(k4_p, k4_w));
        console.log('Statystyka pobrań pow 10 prób: ',  getStats(k5_p, k5_w));
    });

});