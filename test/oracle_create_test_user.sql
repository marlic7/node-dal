 CREATE USER test_node_dal IDENTIFIED BY password_please_change_me;
 ALTER USER test_node_dal DEFAULT TABLESPACE users;
 ALTER USER test_node_dal QUOTA 500M ON users;
 GRANT CREATE SESSION TO test_node_dal;
 GRANT CREATE TABLE TO test_node_dal;
 GRANT CREATE VIEW TO test_node_dal;
 GRANT CREATE SEQUENCE TO test_node_dal;
 GRANT CREATE PROCEDURE TO test_node_dal;
 GRANT EXECUTE ON dbms_lock TO test_node_dal;
 GRANT CREATE ANY CONTEXT TO user;
 
 quit;