const
    oracledb = require('oracledb'),
    fakeSQL = 'CREATE TABLE this_is_to_long_name_for_oracle_table (a date)',
    connCfg = {
        user:           "testy",
        password:       "testy123",
        connectString:  "localhost/XE",
        poolMax:        10,
        poolMin:        1,
        poolIncrement:  1,
        poolTimeout:    60,
        _enableStats  : true
    };

debugger;

oracledb.createPool(connCfg, function(err, pool) {
    if (err) {
        console.log('1: ', err.message);
        return;
    }

    debugger;

    pool.getConnection(function(err, connection) {
        if (err) {
            console.log('2: ', err.message);
            return;
        }
        debugger;
        connection.execute(fakeSQL, [], { isAutoCommit: true, autoCommit: true }, function (err) {
            debugger;
            if (err) {
                console.log('3: ', err.message.trim());
                connection.release(function () {
                    debugger;
                    console.log('@in release callback on query fails');
                });
                return;
            }
            connection.release(function () {
                console.log('@in release callback on query success');
            });
        });

    });
});
