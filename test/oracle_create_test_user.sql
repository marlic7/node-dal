 create user test_node_dal identified by password_please_change_me;
 alter user test_node_dal default tablespace users;
 alter user test_node_dal quota 500M on users;
 grant CREATE SESSION to test_node_dal;
 grant create table to test_node_dal;
 grant create view to test_node_dal;
 grant create sequence to test_node_dal;
 grant create procedure to test_node_dal;
 grant execute on dbms_lock to test_node_dal;
 quit;