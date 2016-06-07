/**
 First create user testy on XE DB and give him perms:

 create user testy identified by testy123;
 alter user testy default tablespace users;
 alter user testy quota 500M on users;
 grant CREATE SESSION to testy;
 grant create table to testy;
 grant create view to testy;
 grant create sequence to testy;
 grant create procedure to testy;
 grant execute on dbms_lock to testy;

*/
module.exports = {
    oracle: {
        connection: {
            user:           "testy",
            password:       "testy123",
            connectString:  "localhost/XE",
            poolMax:        10,
            poolMin:        1,
            poolIncrement:  1,
            poolTimeout:    60
        },
        getConnMaxProbes:   50,  // times
        getConnWaitMinTime: 100, // miliseconds
        getConnWaitMaxTime: 200, // miliseconds
        nlsSessionParameters: {
            time_zone:       '00:00', // fix for bad date cast by oracledb when read
            nls_date_format: 'yyyy-mm-dd'
        }
    }
};
