require("../../test/lib/my-error");

const should     = require('should'),
    async      = require('async'),
    conf       = require('../../test/config').oracle,
    dalFactory = require('../../lib/dalFactory');

describe('test to invoke release callback', function() {
    var dal;

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

    describe('main group 1', function () {

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id3 NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id4 NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id5 NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id6 NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id7 NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('select sysdate from dual', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });
    });

    describe('main group 2', function () {



        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('select sysdate from dual', [], done);
        });


        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

    });

    describe('main group 3', function () {

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))', [], done);
        });

        it('should fail to create test_01 table', function (done) {
            dal.querySql('select sysdate from dual', [], done);
        });


    });

});
