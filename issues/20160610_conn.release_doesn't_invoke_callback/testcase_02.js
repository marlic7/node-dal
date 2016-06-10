const
    dalFactory = require('../../lib/dalFactory'),
    fakeSQL = 'CREATE TABLE test_01 (id NUMBER NOT NULL, text VARCHAR2(20), CONSTRAINT test_01_pk PRIMARY KEY (id))',
    connCfg = {
        connection: {
            user:           "testy",
            password:       "testy123",
            connectString:  "localhost/XE",
            poolMax:        10,
            poolMin:        1,
            poolIncrement:  1,
            poolTimeout:    60,
            _enableStats  : true
        },
        getConnMaxProbes:   50,  // times
        getConnWaitMinTime: 100, // miliseconds
        getConnWaitMaxTime: 200, // miliseconds
        nlsSessionParameters: {
            time_zone:       '00:00', // fix for bad date cast by oracledb when read
            nls_date_format: 'yyyy-mm-dd'
        }
    };

dalFactory('oracledb', connCfg, function(err, dal) {
    if (err) {
        console.log('1: ', err.message);
        return;
    }

    dal.querySql(fakeSQL, function(err) {
        if (err) {
            console.log('2: ', err.message);
        }
    })
});
