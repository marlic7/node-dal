
// setup MyError
require("./lib/my-error");

var assert     = require('assert'),
    conf       = require('./config').oracle,
    dalFactory = require('../lib/dalFactory');

describe('Data Access Layer simple test', function() {
    var dal,
        clob_1 = randomString(120000);

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

    describe('prepare DB structure', function() {

        it('should create test_01 table', function(done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should create test_02 table', function(done) {
            dal.querySql({ sql: 'CREATE TABLE test_02 (id NUMBER NOT NULL, text_clob CLOB, CONSTRAINT test_02_pk PRIMARY KEY (id))', bind: [], cb: done});
        });

        it('should insert 1st row to test_01', function(done) {
            dal.querySql('INSERT INTO test_01 VALUES (1, \'test1\')', [], done);
        });

        it('should insert 2nd row to test_01', function(done) {
            dal.querySql({ sql: 'INSERT INTO test_01 VALUES (2, \'test2\')', bind: [], cb: done });
        });

        it('should insert 1nd row to test_02', function(done) {
            dal.querySql({ sql: 'INSERT INTO test_02 VALUES (1, :0)', bind: [clob_1], cb: done });
        });

        it('should get col text value', function(done) {
            dal.selectOneValueSql('SELECT text FROM test_01 WHERE id=:0', [1], function(err, result) {
                if(err) {
                    done(err);
                    return;
                }
                assert.equal(result, 'test1');
                done();
            });
        });

        // to narazie nie działa czekamy na implementację od Oracle (fetchAsString dla CLOB)
        //it('should get CLOB value (fake)', function(done) {
        //    dal.selectOneValueSql('SELECT text_clob FROM test_02 WHERE id=:0', [1], function(err, result) {
        //        if(err) {
        //            done(err);
        //            return;
        //        }
        //        assert.equal(result, 'test1');
        //        done();
        //    });
        //});

        // @todo-me: selectClobValueSql do dokumentacji
        it('should get CLOB value', function(done) {
            dal.selectClobValueSql('SELECT text_clob FROM test_02 WHERE id=:0', [1], function(err, result) {
                if(err) {
                    done(err);
                    return;
                }
                assert.equal(result.length, 120000);
                done();
            });
        });

        it('should create test_01_sid sequence', function(done) {
            dal.querySql('CREATE SEQUENCE test_01_sid ' +
                         'MINVALUE 10 MAXVALUE 9999999999 INCREMENT BY 1 ' +
                         'NOCYCLE ORDER NOCACHE', [], done);
        });
    });

    describe('modify data', function() {
        it('should insert row and return next ID (SQL version)', function(done) {
            dal.insertReturningIdSql('INSERT INTO test_01 (id, text) VALUES (:0, :1)', [null,'test10'], 'test_01_sid', function(err, result) {
                if(err) {
                    done(err);
                    return;
                }

                assert.equal(result, 10);
                done();
            });
        });

        it('should insert row and return next ID (NO SQL version)', function(done) {
            dal.insertReturningId('test_01', {id: null, text: 'test11'}, 'test_01_sid', function(err, result) {
                if(err) {
                    done(err);
                    return;
                }

                assert.equal(result, 11);
                done();
            });
        });

        it('should insert row (simple)', function(done) {
            dal.insert('test_01', {id: 999, text: 'simple'}, function(err, result) {
                if(err) {
                    done(err);
                    return;
                }

                assert.equal(result.rowsAffected, 1);
                done();
            });
        });

        it('should delete row', function(done) {
            dal.del('test_01', ['id = ?', 999], function(err, result) {
                if(err) {
                    done(err);
                    return;
                }

                assert.equal(result.rowsAffected, 1);
                done();
            });
        });

        it('should modify field in row ID = 11', function(done) {
            dal.update('test_01', {text: 'test11-modified'}, ['id = ?', 11], function(err, result) {
                if(err) {
                    done(err);
                    return;
                }

                assert.equal(result.rowsAffected, 1);
                done();
            });
        });

        it('should modify CLOB field in row ID = 1', function(done) {
            dal.update('test_02', {text_clob: 'modified CLOB'}, ['id = ?', 1], function(err, result) {
                if(err) {
                    done(err);
                    return;
                }

                assert.equal(result.rowsAffected, 1);
                done();
            });
        });

        it('should do transaction and commit', function(done) {
            dal.getDbConnection(function(err, conn) {
                if(err) {
                    done(err);
                    return;
                }

                conn.isAutoCommit = false;

                conn.execute('INSERT INTO test_01 VALUES (:0, :1)', [123, 'AAA'], function(err) {
                    if (err) {
                        done(err);
                        return;
                    }

                    conn.execute('INSERT INTO test_01 VALUES (:0, :1)', [124, 'AAA'], function(err) {
                        if (err) {
                            done(err);
                            return;
                        }

                        conn.commit(function(err) {
                            if (err) {
                                done(err);
                                return;
                            }

                            conn.release(function(err) {
                                if (err) {
                                    done(err);
                                    return;
                                }

                                dal.selectOneValueSql('SELECT count(*) FROM test_01 WHERE text=:0', ['AAA'], function(err, result) {
                                    if(err) {
                                        done(err);
                                        return;
                                    }
                                    assert.equal(result, 2);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it('should do transaction and rollback', function(done) {
            dal.getDbConnection(function(err, conn) {
                if(err) {
                    done(err);
                    return;
                }

                conn.isAutoCommit = false;

                conn.execute('INSERT INTO test_01 VALUES (:0, :1)', [125, 'BBB'], function(err) {
                    if (err) {
                        done(err);
                        return;
                    }

                    conn.execute('INSERT INTO test_01 VALUES (:0, :1)', [126, 'BBB'], function(err) {
                        if (err) {
                            done(err);
                            return;
                        }

                        //noinspection JSUnresolvedFunction
                        conn.rollback(function(err) {
                            if (err) {
                                done(err);
                                return;
                            }

                            conn.release(function(err) {
                                if (err) {
                                    done(err);
                                    return;
                                }

                                dal.selectOneValueSql('SELECT count(*) FROM test_01 WHERE text=:0', ['BBB'], function(err, result) {
                                    if(err) {
                                        done(err);
                                        return;
                                    }
                                    assert.equal(result, 0);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it('should do transaction and commit with executeTransaction', function(done) {
            var sqlBinds = [
                ['INSERT INTO test_01 VALUES (:0, :1)', [131, 'T01']],
                ['UPDATE test_01 SET text = :0 WHERE id = :1', ['T02', 131]],
                ['UPDATE test_01 SET text = :0 WHERE id = :1', ['AAB', 124]],
                ['DELETE FROM test_01 WHERE id = :0', [131]]
            ];

            dal.executeTransaction(sqlBinds, function(err, results) {
                if(err) {
                    done(err);
                    return;
                }

                assert.equal(results.length, 4);
                done();
            });
        });

        it('should do transaction and rollback with executeTransaction', function(done) {
            var sqlBinds = [
                ['INSERT INTO test_01 VALUES (:0, :1)', [131, 'T01']],
                ['UPDATE test_01 SET text = :0 WHERE id = :1', ['AAC', 124]],
                ['UPDATE test_01_fake SET text = :0 WHERE id = :1', ['T02', 131]]
            ];

            //noinspection JSUnusedLocalSymbols
            dal.executeTransaction(sqlBinds, function(err, results) {
                if(err) {
                    assert.equal(err.message, 'ORA-00942: table or view does not exist');
                    done();
                    return;
                }
                done(new Error('Error is not occured!'));
            });
        });

    });

    describe('select data', function() {

        it('should get current date', function(done) {
            dal.selectOneRowSql("SELECT To_Char(sysdate, 'yyyy-mm-dd') dat FROM dual", [], function(err, result) {
                if(err) {
                    done(err);
                    return;
                }
                //noinspection JSUnresolvedVariable
                assert.equal(result.DAT, (new Date()).toJSON().slice(0, 10));
                done();
            });
        });

        it('should get value for ID=10', function(done) {
            dal.selectOneValueSql('SELECT text FROM test_01 WHERE id=:0', [10], function(err, result) {
                if(err) {
                    done(err);
                    return;
                }
                assert.equal(result, 'test10');
                done();
            });
        });

        it('should get row with ID=11', function(done) {
            dal.selectOneValueSql('SELECT text FROM test_01 WHERE id=:0', [11], function(err, result) {
                if(err) {
                    done(err);
                    return;
                }
                assert.equal(result, 'test11-modified');
                done();
            });
        });

        it('should get value for ID=10 (no sql)', function(done) {
            dal.selectOneValue('test_01', 'text',  ['id = ?', 10], function(err, result) {
                if(err) {
                    done(err);
                    return;
                }
                assert.equal(result, 'test10');
                done();
            });
        });

        it('should get null for ID=15', function(done) {
            dal.selectOneValueSql('SELECT text FROM test_01 WHERE id=:0', [15], function(err, result) {
                if(err) {
                    done(err);
                    return;
                }
                assert.equal(result, null);
                done();
            });
        });

        it('should get one row for ID=10', function(done) {
            dal.selectOneRow('test_01', null, ['id = ?', 10], function(err, result) {
                if(err) {
                    done(err);
                    return;
                }
                assert.deepEqual(result, { ID:10, TEXT: "test10" });
                done();
            });
        });

        it('should get all rows for test_01', function(done) {
            dal.selectAllRows('test_01', null, [], ['id'], function(err, result) {
                if(err) {
                    console.log('debug: ', err.debug);
                    done(err);
                    return;
                }
                assert.deepEqual(result, [
                    {ID: 1,   TEXT: "test1"},
                    {ID: 2,   TEXT: "test2"},
                    {ID: 10,  TEXT: "test10"},
                    {ID: 11,  TEXT: "test11-modified"},
                    {ID: 123, TEXT: "AAA"},
                    {ID: 124, TEXT: "AAB"}
                ]);
                done();
            });
        });

        it('should get all rows for test_01 (outFormat=array)', function(done) {
            dal.selectAllRows('test_01', null, [], null, {outFormat: 'array'}, function(err, result) {
                if(err) {
                    done(err);
                    return;
                }
                assert.deepEqual(result, [[1,"test1"],[2,"test2"],[10,"test10"],[11,"test11-modified"],[124,"AAB"],[123,"AAA"]]);
                done();
            });
        });

        it('should get all rows for page 1 test_01', function(done) {
            dal.selectAllRows('test_01', null, [], ['id DESC'], {outFormat: 'array', limit: 2}, function(err, result) {
                if(err) {
                    done(err);
                    return;
                }
                assert.deepEqual(result, [[124,"AAB",1],[123,"AAA",2]]);
                done();
            });
        });

        it('should get all rows for page 2 test_01', function(done) {
            dal.selectAllRows('test_01', null, [], ['id DESC'], {outFormat: 'array', limit: 2, page: 2, totalCount: true}, function(err, result) {
                if(err) {
                    done(err);
                    return;
                }
                assert.deepEqual(result, [[11,"test11-modified",3,6],[10,"test10",4,6]]);
                done();
            });
        });

        it('should get all rows for page 2 test_01', function(done) {
            dal.selectAllRows('test_01', null, [], ['id DESC'], {outFormat: 'array', limit: 2, page: 4}, function(err, result) {
                if(err) {
                    done(err);
                    return;
                }
                assert.deepEqual(result, []);
                done();
            });
        });

        it('should throw Error: Niewłaściwa liczba wierszy zwrócona przez bazę danych', function(done) {
            //noinspection JSUnusedLocalSymbols
            dal.selectOneRow('test_01', null, [], function(err, result) {
                assert.equal(err.message, 'Wrong number rows returned from database (6)');
                done();
            });
        });


    });

    describe('insert 150 records and fetch them', function() {
        it('should delete all records from test_01', function(done) {
            dal.querySql('DELETE FROM test_01', [], done);
        });

        it('should insert 150 records', function(done) {
            var qrys = [];
            for(var i = 1; i < 151; i++) {
                qrys.push(['INSERT INTO test_01 VALUES(:0, :1)', [i, 'text_' + i]]);
            }
            dal.executeTransaction(qrys, function(err, results) {
                if(err) {
                    done(err);
                    return;
                }

                assert.equal(results.length, 150);
                done();
            });
        });

        it('should fetch 150 records', function(done) {

            dal.selectAllRows('test_01', function(err, results) {
                if(err) {
                    done(err);
                    return;
                }
                assert.equal(results.length, 150);
                done();
            });
        });
    });

    describe('drop objects - clean schema', function() {
        it('should drop test_01 table', function(done) {
            dal.querySql('DROP TABLE test_01', [], done);
        });

        it('should drop test_02 table', function(done) {
            dal.querySql('DROP TABLE test_02', done);
        });

        it('should drop test_01_sid sequence', function(done) {
            dal.querySql('DROP sequence test_01_sid', done);
        });
    });

});

function randomString(len, charSet) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}