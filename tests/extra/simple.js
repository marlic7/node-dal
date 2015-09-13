var dalFactory = require('../../lib/dalFactory'),
    conf       = require('./../config');

dalFactory('oracledb', conf, function(err, dal) {
    if(err) {
        throw err;
    }
    var sqlA = [
        ['INSERT INTO ...', [1, 'abc']],
        ['DELETE ...', [4]]
    ];

    console.log('1 valid invoke');
    dal.testParams(sqlA, function() {
        console.log('dal.getCfg(): ', dal.getCfg()); // check config object
    });

    console.log('2 valid invoke');
    dal.testParams({sqlBindArray: sqlA, cb: function() {} });

    console.log('3 invalid invoke (missing cb)');
    try {
        dal.testParams(sqlA);
    } catch (e) {
        console.log(e.stack);
    }

    console.log('4 invalid invoke (invalid cb type)');
    try {
        dal.testParams(sqlA, 'fake');
    } catch (e) {
        console.log(e.stack);
    }
});

