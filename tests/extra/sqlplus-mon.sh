#!/bin/ksh

# sample usage: ./sqlplus-mon.sh sessions.sql 0.5

sqlplus -s "/ as sysdba" |& # Open a pipe to SQL*Plus

cat <& p &

print -p -- "exec dbms_application_info.set_client_info(client_info => '${USER}@${HOSTNAME}');"
print -p -- "exec dbms_application_info.set_module(module_name => '$(basename $0)', action_name => '$1');"

print -p -- "@$1"

while (true); do

sleep $2
print -p -- '/'

done
