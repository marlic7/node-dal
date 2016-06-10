
// setup MyError
require("./lib/my-error");

var assert     = require('assert'),
    conf       = require('./config').oracle,
    dalFactory = require('../lib/dalFactory');

describe('Data Access Layer Pool test', function() {
    var dal;

    before(function(done) {
        dalFactory('oracledb', conf, function(err, dalObj) {
            if(err) {
                done(err);
                return;
            }
            dal = dalObj;
            done();
        });
    });

    describe('pool properties', function() {
        var getPoolProps = function(pool) {
            return {
                connectionsInUse: pool.connectionsInUse,
                connectionsOpen:  pool.connectionsOpen,
                poolMax:          pool.poolMax
            };
        };
        var expectedEmptyPool = {
            connectionsInUse: 0,
            connectionsOpen:  conf.connection.poolMin,
            poolMax:          conf.connection.poolMax
        };

        it('pool should be empty', function(done) {
            assert.deepEqual(getPoolProps(dal.getDbPool()), expectedEmptyPool);
            done();
        });

        it('pool should be allocated', function(done) {
            dal.getDbConnection(function(err, connection) {
                if (err) {
                    done(err);
                    return;
                }
                var poolPropsAllocated = getPoolProps(dal.getDbPool());
                connection.release(function(err) {
                    if (err) {
                        done(err);
                        return;
                    }

                    var poolPropsEmpty = getPoolProps(dal.getDbPool());

                    assert.equal(1, poolPropsAllocated.connectionsInUse);
                    assert.equal(0, poolPropsEmpty.connectionsInUse);
                    done();
                });
            });
        });

    });


});
