
// setup MyError
require("./lib/my-error");

const 
    assert     = require('assert'),
    conf       = require('./config').oracle,
    dalFactory = require('../lib/dalFactory');

describe('Data Access Layer Pool tests', function() {
    let dal;

    before(done => {
        dalFactory('oracledb', conf, (err, dalObj) => {
            if(err) {
                done(err);
                return;
            }
            dal = dalObj;
            done();
        });
    });

    describe('pool properties', function() {
        const
            getPoolProps = pool => {
                return {
                    connectionsInUse: pool.connectionsInUse,
                    connectionsOpen:  pool.connectionsOpen,
                    poolMax:          pool.poolMax
                };
            },
            expectedEmptyPool = {
                connectionsInUse: 0,
                connectionsOpen:  conf.connection.poolMin,
                poolMax:          conf.connection.poolMax
            };

        it('pool should be empty', done => {
            assert.deepEqual(getPoolProps(dal.getDbPool()), expectedEmptyPool);
            done();
        });

        it('pool should be allocated', done => {
            dal.getDbConnection((err, connection) => {
                if (err) {
                    done(err);
                    return;
                }
                const poolPropsAllocated = getPoolProps(dal.getDbPool());
                connection.release(err => {
                    if (err) {
                        done(err);
                        return;
                    }

                    const poolPropsEmpty = getPoolProps(dal.getDbPool());

                    assert.equal(1, poolPropsAllocated.connectionsInUse);
                    assert.equal(0, poolPropsEmpty.connectionsInUse);
                    done();
                });
            });
        });
    });
});
