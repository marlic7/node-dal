/**
 First create user in Oracle DB and give him perms:

 create user USERNAME identified by password;
 alter user USERNAME default tablespace users;
 alter user USERNAME quota 500M on users;
 grant CREATE SESSION to USERNAME;
 grant create table to USERNAME;
 grant create view to USERNAME;
 grant create sequence to USERNAME;
 grant create procedure to USERNAME;
 grant execute on dbms_lock to USERNAME;

 next copy config_sample.js config.js and provide proper user/password
*/
module.exports = {
    oracle: {
        connection: {
            user:           "username",
            password:       "password",
            connectString:  "localhost/XE",
            poolMax:        10,
            poolMin:        1,
            poolIncrement:  1,
            poolTimeout:    60,
            _enableStats  : true
        },
        nlsSessionParameters: {
            //time_zone:       '00:00', // fix for bad date cast by oracledb when read - better set it in env (TZ='00:00')!
            //nls_date_format: 'yyyy-mm-dd' // better set it in env (NLS_DATE_FORMAT='yyyy-mm-dd')!
        }
    }
};
