// setup MyError
require("./lib/my-error");

const _        = require('lodash'),
    should     = require('should'),
    async      = require('asyncawait/async'),
    await      = require('asyncawait/await'),
    conf       = require('./config').oracle,
    dalFactory = require('../lib/dalFactory');

describe('Data Access Layer promises with asyncawait test', function() {
    let dal,
        tbls = ['testp_01', 'testp_02', 'testp_03', 'testp_04', 'testp_05'];

    before(function (done) {
        dalFactory('oracledb', conf, function (err, dalObj) {
            if (err) {
                done(err);
                return;
            }
            dal = dalObj;
            done();
        });
    });

    describe('prepare DB structure', function() {

        it('should remove tables silently', function (done) {
            let querySqlSilent = function(query) {
                return new Promise(function (resolve) {
                    dal.querySql(query, [], function (err, result) {
                        resolve(result);
                    });
                });
            };

            let dropTabs = async(function() {
                return await(_.map(tbls, function(tbl) {
                    return querySqlSilent(`DROP TABLE ${tbl}`);
                }));
            });

            dropTabs()
                .then(function(out) {
                    should.equal(out.length, 5);
                    //should.deepEqual(out, {});
                    done();
                })
                .catch(function(err) { done(err) });
        });

        it('should create new tables', function (done) {
            let createTabs = async(function() {
                return await(_.map(tbls, function(tbl) {
                    return dal.querySql(`CREATE TABLE ${tbl} (text VARCHAR2(20))`);
                }));
            });

            createTabs()
                .then(function(out) {
                    should.equal(out.length, 5);
                    done();
                })
                .catch(function(err) { done(err) });
        });

        it('should async code run like sync', function (done) {
            let doJob = async(function() {
                let tabCnt1 = await(dal.selectOneValueSql("SELECT count(*) FROM user_tables WHERE table_name LIKE 'TESTP%'", [])),
                    tabCnt2 = await(dal.selectOneValueSql({ sql: "SELECT count(*) FROM user_tables WHERE table_name LIKE 'TESTP%'", bind: [] }));

                return [tabCnt1, tabCnt2];
            });

            doJob()
                .then(function(out) {
                    should.equal(out.length, 2);
                    should.deepEqual(out, [5, 5]);
                    done();
                })
                .catch(function(err) { done(err) });
        });
    });

});