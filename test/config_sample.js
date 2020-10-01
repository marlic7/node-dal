/**
 First create user in Oracle DB and give him perms eg.:

    sqlplus sys@orcl as sysdba @oracle_create_test_user.sql

 next copy config_sample.js to config.js and provide proper password, connectString, dbVer and others if needed
*/
module.exports = {
    oracle: {
        connection: {
            user:           "test_node_dal",
            password:       "password",
            connectString:  "localhost/orcl",
            poolMax:        10,
            poolMin:        1,
            poolIncrement:  1,
            poolTimeout:    60,
            _enableStats  : true
        },
        nlsSessionParameters: {
            //time_zone:       '00:00', // fix for bad date cast by oracledb when read - better set it in env (TZ='00:00')!
            //nls_date_format: 'yyyy-mm-dd' // better set it in env (NLS_DATE_FORMAT='yyyy-mm-dd')!
        },
        dbVer: '12',
        outFormat: 'out_format_object', // array/object/out_format_array/out_format_object
    }
};
