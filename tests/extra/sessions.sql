SET LINESIZE 32000;
SET PAGESIZE 40000;
SET LONG 50000;
column sid format 999999999;
column serial# format 999999999;
column username format a20;
column schemaname format a20;
column osuser format a20;
column terminal format a20;
column program format a30;
column sql_id format a20;

select sid, serial#, username, schemaname, osuser, terminal, program, sql_id from v$session WHERE status='ACTIVE' AND schemaname <> 'SYS';

