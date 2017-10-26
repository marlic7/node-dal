// setup MyError
require("./lib/my-error");

const
    _          = require('lodash'),
    should     = require('should'),
    conf       = require('./config').oracle,
    dalFactory = require('../lib/dalFactory');

describe('Data Access Layer promises with asyncawait tests', function() {
    let dal,
        tbls = ['testp_01', 'testp_02', 'testp_03', 'testp_04', 'testp_05'];

    before(done => {
        dalFactory('oracledb', conf, (err, dalObj) => {
            if (err) {
                done(err);
                return;
            }
            dal = dalObj;
            done();
        });
    });

    describe('prepare DB structure', function() {
        this.timeout(5000);

        it('should remove tables silently', done => {
            const querySqlSilent = query => {
                return new Promise(resolve => {
                    dal.querySql(query, [], (err, result) => {
                        resolve(result);
                    });
                });
            };

            const dropTabs = async () => {
                return await (_.map(tbls, tbl => {
                    return querySqlSilent(`DROP TABLE ${tbl}`);
                }));
            };

            dropTabs()
                .then(out => {
                    should.equal(out.length, 5);
                    //should.deepEqual(out, {});
                    done();
                })
                .catch(err => { done(err) });
        });

        it('should create new tables', done => {
            const createTabs = async () => {
                return await _.map(tbls, tbl => {
                    return dal.querySql(`CREATE TABLE ${tbl} (text VARCHAR2(20))`);
                });
            };

            createTabs()
                .then(out => {
                    should.equal(out.length, 5);
                    done();
                })
                .catch(err => { done(err); });
        });

        it('should async code run like sync', done => {
            const doJob = async () => {
                const
                    tabCnt1 = await dal.selectOneValueSql("SELECT count(*) FROM user_tables WHERE table_name LIKE 'TESTP%'"),
                    tabCnt2 = await dal.selectOneValueSql({ sql: "SELECT count(*) FROM user_tables WHERE table_name LIKE 'TESTP%'" });

                return [tabCnt1, tabCnt2];
            };

            doJob()
                .then(out => {
                    should.equal(out.length, 2);
                    should.deepEqual(out, [5, 5]);
                    done();
                })
                .catch(err => {
                    console.log('debug:', err.debug);
                    done(err);
                });
        });
    });
});