"use strict";
//process.env.UV_THREADPOOL_SIZE = 10; // This will work
//process.env.TZ = 'Europe/Warsaw';

// setup MyError
require("./lib/my-error");

const
    should     = require('should'),
    async      = require('async'),
    conf       = require('./config').oracle,
    dalFactory = require('../lib/dalFactory'),
    MyErrorOrgin = MyError;

describe('Data Access Layer common tests', function() {
    const
        clob_1 = randomString(120000),
        clob_2 = randomString(5000),
        clob_3 = randomString(100);

    let dal;

    before(done => {
        dalFactory('oracledb', conf)
            .then((dalObj) => {
                dal = dalObj;
                done();
            })
            .catch((err) => {
                done(err);
            });
    });

    describe('cleanup DB structure and some DDL in case previous test failed', function() {
        disableConsoleLogErrors();

        it('should drop test_01 table if table exists', done => {
            dal.querySql('DROP TABLE test_01', () => { done(); });
        });

        it('should drop test_02 table if table exists', done => {
            dal.querySql('DROP TABLE test_02', () => { done(); });
        });

        it('should drop test_03 table if table exists', done => {
            dal.querySql('DROP TABLE test_03', () => { done(); });
        });

        it('should drop test_04 table if table exists', done => {
            dal.querySql('DROP TABLE test_04', () => { done(); });
        });

        it('should drop test_01_sid sequence if any exists', done => {
            dal.querySql('DROP sequence test_01_sid', () => { done(); });
        });

        it('should fail on drop not existed table', done => {
            dal.querySql('DROP table this_table_not_exist', (err) => {
                should.exists(err);
                err.message.should.containEql('ORA-00942');
                done();
            });
        });

        it('should fail on create table whith to long name', done => {
            dal.querySql('CREATE TABLE this_is_to_long_name_for_oracle_table (a date)', (err) => {
                should.exists(err);
                err.message.should.containEql('ORA-00972');
                enableConsoleLogErrors();
                done();
            });
        });

    });

    describe('prepare DB structure', function() {

        it('should create test_01 table', done => {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should create test_02 table', done => {
            dal.querySql({ sql: 'CREATE TABLE test_02 (id NUMBER NOT NULL, text_clob CLOB, CONSTRAINT test_02_pk PRIMARY KEY (id))', cb: done});
        });

        it('should create test_03 table', done => {
            dal.querySql({ sql: 'CREATE TABLE test_03 (start_date DATE)', cb: done});
        });

        it('should create test_04 table', done => {
            dal.querySql({ sql: 'CREATE TABLE test_04 (id NUMBER NOT NULL, clob_2 CLOB, fake VARCHAR(20), clob_3 CLOB, clob_4 CLOB)', cb: done});
        });

        it('should insert 1st row to test_01', done => {
            dal.querySql('INSERT INTO test_01 VALUES (1, \'test1\')', [], done);
        });

        it('should insert 2nd row to test_01', done => {
            dal.querySql({ sql: 'INSERT INTO test_01 VALUES (2, \'test2\')', bind: [], cb: done });
        });

        it('should insert 3rd row to test_02', done => {
            dal.querySql({ sql: 'INSERT INTO test_02 VALUES (1, :0)', bind: [clob_1], cb: done });
        });

        it('should insert 120 records to test_04', done => {
            let sqls = [];
            for(let i = 1; i < 121; i++) {
                sqls.push(['INSERT INTO test_04 VALUES (:0, :1, :2, :3, null)', [i, clob_2, 'abc', clob_3]]);
            }
            dal.executeTransaction(sqls, (err, results) => {
                if(err) {
                    done(err);
                    return;
                }

                should.equal(results.length, 120);
                done();
            });
        });

        it('should get col text value', done => {
            dal.selectOneValueSql('SELECT text FROM test_01 WHERE id=:0', [1], (err, result) => {
                should.not.exist(err);
                should.equal(result, 'test1');
                done();
            });
        });

        it('should get CLOB value by selectOneValueSql if opt.fetchClobs provided', done => {
            dal.selectOneValueSql('SELECT text_clob FROM test_02 WHERE id=:0', [1], { fetchClobs: true }, (err, result) => {
                if(err) {
                    done(err);
                    return;
                }
                should.equal(result.length, 120000);
                done();
            });
        });

        it('should get CLOB value (promise)', done => {
            dal.selectOneClobValue('test_02', 'text_clob', ['id = ?', 1])
                .then(result => {
                    should.equal(result.length, 120000);
                    done();
                })
                .catch(done);
        });

        it('should get CLOB value', done => {
            dal.selectOneClobValue('test_02', 'text_clob', ['id = ?', 1], (err, result) => {
                should.not.exist(err);
                should.equal(result.length, 120000);
                done();
            });
        });

        it('should get CLOB value sql', done => {
            dal.selectClobValueSql('SELECT text_clob FROM test_02 WHERE id=:0', [1], (err, result) => {
                should.not.exist(err);
                should.equal(result.length, 120000);
                done();
            });
        });

        it('should create test_01_sid sequence', done => {
            dal.querySql('CREATE SEQUENCE test_01_sid ' +
                         'MINVALUE 10 MAXVALUE 9999999999 INCREMENT BY 1 ' +
                         'NOCYCLE ORDER NOCACHE', [], done);
        });
    });

    describe('modify data', function() {
        const sql_1 = 'INSERT INTO test_01 (id, text) VALUES (:0, :1)';
        const seq_1 = 'test_01_sid';

        it('should insert row and return next ID (SQL version)', done => {
            dal.insertReturningIdSql(sql_1, [{type: 'pk'},'test10'], seq_1, (err, result) => {
                should.not.exist(err);
                should.equal(result, 10);
                done();
            });
        });

        it('insert should throw Error if given wrong sequence name (SQL version)', done => {
            dal.insertReturningIdSql(sql_1, [{ type: 'pk' }, 'test10'], 'fake_seq_name', err => {
                should(err).be.instanceOf(Error);
                should(err.message).match(/ORA-02289/);
                should(err).have.property('debug');
                should(err.debug[0].par.sequence).equal('fake_seq_name');
                done();
            });
        });

        it('insert should throw Error if wrong second bind parameter type (SQL version)', done => {
            const bind = [{ type: 'pk' }, { fake: true }];
            dal.insertReturningIdSql(sql_1, bind, seq_1, err => {
                should(err).be.instanceOf(Error);
                should(err.message).match(/NJS-044/);
                should(err).have.property('debug');
                bind[0] = 11; // next sequence value
                should(err.debug[0].par.bind).eql(bind);
                done();
            });
        });

        it('should insert row and return next ID (NO SQL version)', done => {
            dal.insertReturningId('test_01', { id: { type: 'pk' }, text: 'test11' }, seq_1, (err, result) => {
                should.not.exist(err);
                should.equal(result, 12);
                done();
            });
        });

        it('should insert row (simple)', done => {
            dal.insert('test_01', { id: 999, text: 'simple' }, (err, result) => {
                should.not.exist(err);
                should.equal(result.rowsAffected, 1);
                done();
            });
        });

        it('should delete row', done => {
            dal.del('test_01', ['id = ?', 999], (err, result) => {
                should.not.exist(err);
                should.equal(result.rowsAffected, 1);
                done();
            });
        });

        it('should modify field in row ID = 12', done => {
            dal.update('test_01', {text: 'test11-modified'}, ['id = ?', 12], (err, result) => {
                should.not.exist(err);
                should.equal(result.rowsAffected, 1);
                done();
            });
        });


        it('should modify CLOB field in row ID = 1', done => {
            dal.update('test_02', { text_clob: 'modified CLOB' }, ['id = ?', 1], (err, result) => {
                should.not.exist(err);
                should.equal(result.rowsAffected, 1);
                done();
            });
        });

        it('should do transaction and commit', done => {
            dal.getDbConnection((err, conn) => {
                should.not.exist(err);

                conn.isAutoCommit = false;

                conn.execute('INSERT INTO test_01 VALUES (:0, :1)', [123, 'AAA'], err => {
                    should.not.exist(err);

                    conn.execute('INSERT INTO test_01 VALUES (:0, :1)', [124, 'AAA'], err => {
                        should.not.exist(err);

                        conn.commit(err => {
                            should.not.exist(err);

                            conn.release(err => {
                                should.not.exist(err);

                                dal.selectOneValueSql('SELECT count(*) FROM test_01 WHERE text=:0', ['AAA'], (err, result) => {
                                    should.not.exist(err);
                                    should.equal(result, 2);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it('should do transaction and rollback', done => {
            dal.getDbConnection((err, conn) => {
                should.not.exist(err);

                conn.isAutoCommit = false;

                conn.execute('INSERT INTO test_01 VALUES (:0, :1)', [125, 'BBB'], err => {
                    should.not.exist(err);

                    conn.execute('INSERT INTO test_01 VALUES (:0, :1)', [126, 'BBB'], err => {
                        should.not.exist(err);

                        conn.rollback(err => {
                            should.not.exist(err);

                            conn.release(err => {
                                should.not.exist(err);

                                dal.selectOneValueSql('SELECT count(*) FROM test_01 WHERE text=:0', ['BBB'], (err, result) => {
                                    should.not.exist(err);
                                    should.equal(result, 0);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it('should do transaction and commit with executeTransaction', done => {
            const sqlBinds = [
                ['INSERT INTO test_01 VALUES (:0, :1)', [131, 'T01']],
                ['UPDATE test_01 SET text = :0 WHERE id = :1', ['T02', 131]],
                ['UPDATE test_01 SET text = :0 WHERE id = :1', ['AAB', 124]],
                ['DELETE FROM test_01 WHERE id = :0', [131]]
            ];

            dal.executeTransaction(sqlBinds, (err, results) => {
                should.not.exist(err);
                should.equal(results.length, 4);
                done();
            });
        });

        it('should do transaction and rollback with executeTransaction', done => {
            const sqlBinds = [
                ['INSERT INTO test_01 VALUES (:0, :1)', [131, 'T01']],
                ['UPDATE test_01 SET text = :0 WHERE id = :1', ['AAC', 124]],
                ['UPDATE test_01_fake SET text = :0 WHERE id = :1', ['T02', 131]]
            ];
            disableConsoleLogErrors();
            dal.executeTransaction(sqlBinds, err => {
                (err.message).should.containEql('ORA-00942');
                enableConsoleLogErrors();
                done();
            });
        });

        // todo: sprawdzić czy nie ma zapisanego rekordu [131, 'T01'] bo powinien być rollback

    });

    describe('select data', function() {

        it('should get current date', done => {
            dal.selectOneRowSql("SELECT To_Char(sysdate, 'yyyy-mm-dd') dat FROM dual", [], (err, result) => {
                should.not.exist(err);
                should.equal(result.DAT, (new Date()).toJSON().slice(0, 10));
                done();
            });
        });

        it('should get value for ID=10', done => {
            dal.selectOneValueSql('SELECT text FROM test_01 WHERE id=:0', [10], (err, result) => {
                should.not.exist(err);
                should.equal(result, 'test10');
                done();
            });
        });

        it('should get one value with ID=12 (sql)', done => {
            dal.selectOneValueSql('SELECT text FROM test_01 WHERE id=:0', [12], (err, result) => {
                should.not.exist(err);
                should.equal(result, 'test11-modified');
                done();
            });
        });

        it('should get one value for ID=10 (no sql)', done => {
            dal.selectOneValue('test_01', 'text',  ['id = ?', 10], (err, result) => {
                should.not.exist(err);
                should.equal(result, 'test10');
                done();
            });
        });

        it('should get null for ID=15', done => {
            dal.selectOneValueSql('SELECT text FROM test_01 WHERE id=:0', [15], (err, result) => {
                should.not.exist(err);
                should.equal(result, null);
                done();
            });
        });

        it('should get one row for ID=10', done => {
            dal.selectOneRow('test_01', null, ['id = ?', 10], (err, result) => {
                should.not.exist(err);
                should.deepEqual(result, { ID:10, TEXT: "test10" });
                done();
            });
        });

        it('should get one row for ID=10 (filter as object)', done => {
            dal.selectOneRow('test_01', null, { id: 10 }, { fetchClobs: true }, (err, result) => {
                should.not.exist(err);
                should.deepEqual(result, { ID:10, TEXT: "test10" });
                done();
            });
        });

        it('should get one row for ID=99 with CLOB fields (filter as object)', done => {
            dal.selectOneRow('test_04', null, { id: 99 }, { fetchClobs: true }, (err, result) => {
                should.not.exist(err);
                should.equal(result.ID, 99);
                (result.CLOB_2).should.be.String();
                (result.CLOB_3).should.be.String();
                should(result.CLOB_4).be.exactly(null);
                should.equal(result.CLOB_2.length, 5000);
                should.equal(result.CLOB_3.length, 100);
                done();
            });
        });

        it('should get all rows for test_01', done => {
            dal.selectAllRows('test_01', null, [], ['id'], (err, result) => {
                should.not.exist(err);
                should.deepEqual(result, [
                    {ID: 1,   TEXT: "test1"},
                    {ID: 2,   TEXT: "test2"},
                    {ID: 10,  TEXT: "test10"},
                    {ID: 12,  TEXT: "test11-modified"},
                    {ID: 123, TEXT: "AAA"},
                    {ID: 124, TEXT: "AAB"}
                ]);
                done();
            });
        });

        it('should get all rows for test_04 (table with 3 CLOB fields)', done => {
            dal.selectAllRows('test_04', null, [], ['id'], { fetchClobs: true }, (err, result) => {
                should.not.exist(err);
                should.equal(result.length, 120);
                (result[0].CLOB_2).should.be.String();
                (result[0].CLOB_3).should.be.String();
                should(result[0].CLOB_4).be.exactly(null);
                should.equal(result[0].CLOB_2.length, 5000);
                should.equal(result[0].CLOB_3.length, 100);
                (result[100].CLOB_2).should.be.String();
                (result[100].CLOB_3).should.be.String();
                should(result[100].CLOB_4).be.exactly(null);
                should.equal(result[100].CLOB_2.length, 5000);
                should.equal(result[100].CLOB_3.length, 100);
                done();
            });
        });

        it('should get all rows for test_01 (outFormat=array)', done => {
            dal.selectAllRows('test_01', null, [], null, { outFormat: 'array' }, (err, result) => {
                should.not.exist(err);
                should.deepEqual(result, [[1,"test1"],[2,"test2"],[10,"test10"],[12,"test11-modified"],[124,"AAB"],[123,"AAA"]]);
                done();
            });
        });



        it('should get all rows for page 1 test_01', done => {
            // unfortunately results differs for dbVersions
            if(dal.getCfg().dbVer >= '12') {
                dal.selectAllRows('test_01', null, [], ['id DESC'], {outFormat: 'array', limit: 2}, (err, result) => {
                    should.not.exist(err);
                    should.deepEqual(result, [[124,"AAB"],[123,"AAA"]]);
                    done();
                });
            } else {
                dal.selectAllRows('test_01', null, [], ['id DESC'], {outFormat: 'array', limit: 2}, (err, result) => {
                    should.not.exist(err);
                    should.deepEqual(result, [[124,"AAB",1],[123,"AAA",2]]);
                    done();
                });
            }
        });

        it('should get all rows for page 2 test_01', done => {
            // unfortunately results differs for dbVersions
            if(dal.getCfg().dbVer >= '12') {
                dal.selectAllRows('test_01', null, [], ['id DESC'], {outFormat: 'array', limit: 2, page: 2, totalCount: true}, (err, result) => {
                    should.not.exist(err);
                    should.deepEqual(result, [[12, "test11-modified", 6], [10, "test10", 6]]);
                    done();
                });
            } else {
                dal.selectAllRows('test_01', null, [], ['id DESC'], {outFormat: 'array', limit: 2, page: 2, totalCount: true}, (err, result) => {
                    should.not.exist(err);
                    should.deepEqual(result, [[12, "test11-modified", 3, 6], [10, "test10", 4, 6]]);
                    done();
                });
            }
        });

        it('should get all rows for page 2 test_01 SQL version', done => {
            // unfortunately results differs for dbVersions
            if(dal.getCfg().dbVer >= '12') {
                dal.selectAllRowsSql('SELECT t.* FROM test_01 t ORDER BY id DESC', [], {outFormat: 'array', limit: 2, page: 2, totalCount: true}, (err, result) => {
                    should.not.exist(err);
                    should.deepEqual(result, [[12, "test11-modified", 6], [10, "test10", 6]]);
                    done();
                });
            } else {
                dal.selectAllRowsSql('SELECT * FROM test_01 ORDER BY id DESC', [], {outFormat: 'array', limit: 2, page: 2, totalCount: true}, (err, result) => {
                    should.not.exist(err);
                    should.deepEqual(result, [[12, "test11-modified", 3, 6], [10, "test10", 4, 6]]);
                    done();
                });
            }
        });

        it('should get all rows for page 2 test_01', done => {
            dal.selectAllRows('test_01', null, [], ['id DESC'], {outFormat: 'array', limit: 2, page: 4}, (err, result) => {
                should.not.exist(err);
                should.deepEqual(result, []);
                done();
            });
        });

        it('should throw Error: Wrong number of rows returned from database', done => {
            disableConsoleLogErrors();
            dal.selectOneRow('test_01', null, [], err => {
                (err.message).should.containEql('Wrong number of rows returned from database!');
                enableConsoleLogErrors();
                done();
            });
        });


    });

    describe('insert 150 records and fetch them', function() {
        it('should delete all records from test_01', done => {
            dal.querySql('DELETE FROM test_01', [], done);
        });

        it('should insert 150 records', done => {
            var qrys = [];
            for(var i = 1; i < 151; i++) {
                qrys.push(['INSERT INTO test_01 VALUES(:0, :1)', [i, 'text_' + i]]);
            }
            dal.executeTransaction(qrys, (err, results) => {
                should.not.exist(err);

                should.equal(results.length, 150);
                done();
            });
        });

        it('should fetch 150 records', done => {

            dal.selectAllRows('test_01', (err, results) => {
                should.not.exist(err);
                should.equal(results.length, 150);
                done();
            });
        });
    });

    describe('create procedures', function() {
        it('should create procedure 01', done => {
            dal.querySql('CREATE OR REPLACE PROCEDURE test_proc_01 IS \n' +
                'BEGIN \n' +
                'dbms_lock.sleep(4); \n' +
                'END;', [], done);
        });

        it('should create procedure 02', done => {
            dal.querySql('CREATE OR REPLACE PROCEDURE test_proc_02 IS \n' +
                'BEGIN \n' +
                    'Dbms_Output.Put_Line(\'start\');\n' +
                    'Dbms_Output.Put_Line(\'finish\');\n' +
                'END;', [], done);
        });

        it('should create procedure 03', done => {
            dal.querySql('CREATE OR REPLACE PROCEDURE test_proc_03(v_in IN VARCHAR2, v_out OUT VARCHAR2) IS \n' +
                'BEGIN \n' +
                    'v_out := \'Hello \' || v_in;\n' +
                'END;', [], done);
        });

        it('should create procedure 04', done => {
            dal.querySql('CREATE OR REPLACE PROCEDURE test_proc_04(v_start_date IN DATE, v_info OUT VARCHAR2, v_end_date OUT DATE) IS \n' +
                'BEGIN \n' +
                    'v_info := \'Start process at: \' || To_Char(v_start_date, \'yyyy.mm.dd hh24:mi:ss\');\n' +
                    'v_end_date := v_start_date + 1;\n' +
                    'INSERT INTO test_03 VALUES (v_end_date);' +
                    'Dbms_Output.Put_Line(v_info);\n' +
                'END;', [], done);
        });
    });

    describe('run procedures', function() {
        this.timeout(15000); // 15 sekund

        //it('should run procedure that wait 4 secs', done => {
        //    dal.runProcedure('test_proc_01', {}, done);
        //});

        it('should run procedure and grab DBMS_OUTPUT', done => {
            dal.runProcedure('test_proc_02', {}, { dbmsOutput: true }, (err, results) => {
                should.not.exist(err);
                should.equal(results.dbmsOutput, 'start\nfinish');
                done();
            });
        });

        it('should run procedure and grab DBMS_OUTPUT (as promise)', done => {
            dal.runProcedure('test_proc_02', {}, { dbmsOutput: true })
                .then(results => {
                    should.equal(results.dbmsOutput, 'start\nfinish');
                    done();
                })
                .catch(err => { done(err); });
        });

        it('should run procedure with params', done => {
            var params = {
                vIn:  'Tom',
                vOut: { type: dal.STRING, dir : dal.BIND_OUT }
            };
            dal.runProcedure('test_proc_03', params, (err, results) => {
                should.not.exist(err);
                should.equal(results.vOut, 'Hello Tom');
                done();
            });
        });

        it('should run procedure with params (as promise)', done => {
            var params = {
                vIn:  'Tom',
                vOut: { type: dal.STRING, dir : dal.BIND_OUT }
            };
            dal.runProcedure('test_proc_03', params)
                .then(results => {
                    should.equal(results.vOut, 'Hello Tom');
                    done();
                })
                .catch(err => { done(err); });
        });

        it('should run procedure with date type params with SQL cast function as IN parameter', done => {
            var params = {
                //vStartDate: '2015-10-23',
                vStartDate: { fn: 'To_Date(?, \'yyyymmdd\')', bind: '20151023' },
                vInfo:      { type: dal.STRING, dir : dal.BIND_OUT },
                vEndDate:   { type: dal.DATE,   dir : dal.BIND_OUT }
            };
            dal.runProcedure('test_proc_04', params, { dbmsOutput: true }, (err, results) => {
                should.not.exist(err);
                should.equal(results.vInfo,      'Start process at: 2015.10.23 00:00:00');
                should.equal(results.dbmsOutput, 'Start process at: 2015.10.23 00:00:00');
                should.deepEqual(results.vEndDate.toJSON(), (new Date('2015-10-24')).toJSON());
                done();
            });
        });

        it('should run procedure with date type params with SQL cast function as IN parameter (as promise)', done => {
            var params = {
                //vStartDate: '2015-10-23',
                vStartDate: { fn: 'To_Date(?, \'yyyymmdd\')', bind: '20151023' },
                vInfo:      { type: dal.STRING, dir : dal.BIND_OUT },
                vEndDate:   { type: dal.DATE,   dir : dal.BIND_OUT }
            };
            dal.runProcedure('test_proc_04', params, { dbmsOutput: true })
                .then(results => {
                    should.equal(results.vInfo,                 'Start process at: 2015.10.23 00:00:00');
                    should.equal(results.dbmsOutput,            'Start process at: 2015.10.23 00:00:00');
                    should.deepEqual(results.vEndDate.toJSON(), (new Date('2015-10-24')).toJSON());
                    done();
                })
                .catch(err => { done(err); });
        });
    });

    describe('test NLS params', function() {
        it('should NLS_DATE_FORMAT match yyyy-mm-dd on 10 concurent sessions', done => {
            let sql = 'SELECT value FROM nls_session_parameters WHERE parameter = :0',
                fetchNlsDateFormat = (cnt, cb) => {
                    dal.selectOneValueSql(sql, ['NLS_DATE_FORMAT'], (err, result) => {
                        if(err) {
                            cb(new Error(err));
                            return;
                        }
                        should.equal(result, "yyyy-mm-dd");
                        cb();
                    });
                },
                execCnt = [0,1,2,3,4,5,6,7,8,9];
            async.map(execCnt, fetchNlsDateFormat, done);
        });
    });

    describe('test session context', function() {
        it('should create or replace CONTEXT', done => {
            dal.querySql('CREATE OR REPLACE CONTEXT CTX_NODE_DAL USING set_ctx_node_dal', [], done);
        });

        it('should create or replace procedure for ctx attr sets', done => {
            const sql = `CREATE OR REPLACE PROCEDURE set_ctx_node_dal(p_name VARCHAR2, p_val VARCHAR2) AUTHID definer IS
                         BEGIN
                             DBMS_SESSION.set_context('CTX_NODE_DAL', p_name, p_val);
                         END;`;
            dal.querySql(sql, [], done);
        });

        it('should create or replace view with session ctx parameter', done => {
            const sql = `CREATE OR REPLACE VIEW test_01_v AS
                             SELECT *
                             FROM   test_01
                             WHERE  id = Sys_Context('CTX_NODE_DAL', 'current_id')`;
            dal.querySql(sql, [], done);
        });

        it('should fetch only one record from view after proper set session ctx', done => {
            const ctxOpt = {
                ctxProcedureName: 'set_ctx_node_dal',
                ctxAttribute: 'current_id',
                ctxValue: '10'
            };

            dal.selectAllRows({ tbl: 'test_01_v', opt: { sessionCtx: ctxOpt } })
                .then(result => {
                    should.equal(result.length, 1);
                    should.deepEqual(result[0], { ID:10, TEXT: "text_10" });
                    done();
                })
                .catch(done);
        });
    });

    describe('drop objects - clean schema', function() {
        it('should drop test_01 table', done => {
            dal.querySql('DROP TABLE test_01', [], done);
        });

        it('should drop test_02 table', done => {
            dal.querySql('DROP TABLE test_02', done);
        });

        it('should drop test_03 table', done => {
            dal.querySql('DROP TABLE test_03', done);
        });

        it('should drop test_04 table', done => {
            dal.querySql('DROP TABLE test_04', done);
        });

        it('should drop test_01_sid sequence', done => {
            dal.querySql('DROP sequence test_01_sid', done);
        });

        it('should drop procedures', done => {
            const
                procs = [
                    'test_proc_01',
                    'test_proc_02',
                    'test_proc_03',
                    'test_proc_04',
                    'set_ctx_node_dal'
                ],
                sqls = procs.map(p => ['DROP PROCEDURE ' + p, []]);
            dal.executeTransaction(sqls, done);
        });
    });

    // runs after all tests in this block
    after(() => {
        /*eslint-disable*/
        console.log('\n\n');
        /*eslint-enable*/
        dal.getDbPool()._logStats();
    });
});

function randomString(len, charSet) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    for (let i = 0; i < len; i++) {
        const randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}

function disableConsoleLogErrors() {
    global.MyError = Error;
}

function enableConsoleLogErrors() {
    global.MyError = MyErrorOrgin;
}
