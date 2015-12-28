# node-dal version 1.1.5 (Node.js Database Abstraction Layer)

This is yet another database abstraction layer. 

It purpose is to be:

1. Simple
2. Easy and elastic to use
3. Pool support with queue and parameterized timeout
4. Support pagination
5. Well parameterizable
6. Well tested
7. Well documented
8. Easy to extend (adapter writers very welcome)

Supported databases:
* Oracle (oracledb driver v1.5.0)

This library is not:
* ORM
* Promise based

## Documentation

### Instalation

```bash
npm install --save node-dal
npm install --save oracledb # or any other supported db driver
```

### Initialization

```js
var dalFactory = require('node-dal'),
    conf       = require('./config');

dalFactory('oracledb', conf.oracle, function(err, dal) {
    if(err) {
        throw err;
    }

    /** @typedef {OracleDB} global.dal */
    global.dal = dal;
});
```

### sample config file
```js
module.exports = {
    oracle: {
        connection: {
            user          : "dbuser",
            password      : "dbuserpasswd",
            connectString : "localhost/XE",
            poolMax       : 10,
            poolMin       : 1,
            poolIncrement : 1,
            poolTimeout   : 60
        },
        getConnMaxProbes   :  50, // max number of retries to get connection from pool after which error will be thrown
        getConnWaitMinTime : 100, // minimum miliseconds for retry to get connection from pool after rejcect
        getConnWaitMaxTime : 200, // maximum miliseconds for retry to get connection from pool after rejcect
        nlsSessionParameters: {
            time_zone:       '00:00', // fix for bad date cast by oracledb when read
            nls_date_format: 'yyyy-mm-dd'
        }
    },
    other: {}
};
```

*Note!*
If you set nlsSessionParameters key in config file, then ALTER SESSION ... will be invoke on every
connection fetch from pool (pool.getConnection). Currently oracledb hasn't session tagging support
(see [`issue 258`](https://github.com/oracle/node-oracledb/issues/258)).

### tests

```bash
npm test 
npm run testperf
```

Library was successfuly tested with:
DB: Oracle 11g XE, 11.2.0.3 EE
Node.js: v0.10.38
OS: Ubuntu 14.04, 14.10 and CentOS 6.6

## API

**IMPORTANT!!!**

All methods parameters could be pass in two ways:
* as a object with proper named keys
* as a list in proper order

for example both below aproach are equivalent:
```js
dal.querySql({sql: 'SELECT ...', bind: [15], cb: callback});
dal.querySql('SELECT ...', [15], callback);
```

<a name="API"></a>
* [`selectOneRow`](#selectOneRow)
* [`selectOneRowSql`](#selectOneRowSql)
* [`selectOneValue`](#selectOneValue)
* [`selectOneValueSql`](#selectOneValueSql)
* [`selectClobValueSql`](#selectClobValueSql)
* [`selectAllRows`](#selectAllRows)
* [`selectAllRowsSql`](#selectAllRowsSql)
* [`querySql`](#querySql)
* [`runProcedure`](#runProcedure)
* [`insert`](#insert)
* [`insertReturningId`](#insertReturningId)
* [`insertReturningIdSql`](#insertReturningIdSql)
* [`update`](#update)
* [`del`](#del)
* [`executeTransaction`](#executeTransaction)
* [`getDbConnection`](#getDbConnection)
* [`getDbPool`](#getDbPool)
* [`getDriver`](#getDriver)


---

<a name="selectOneRow"></a>
**selectOneRow**  (tbl:string, [fields:Array|null], where:Array, [opt:object|null], cb:function)

see params details: [`fields`](#params-fields) [`where`](#params-where) [`opt`](#params-opt)

Fetch only one record (row) from table or view.
Request have to return max one record otherwise error will be thrown.

Example:

```js
dal.selectOneRow('test_01', null, ['id = ?', 10], function(err, result) {
    if(err) {
        cb(new Error(err));
        return;
    }
    cb(null, result);
});
```
[`API`](#API)

---

<a name="selectOneRowSql"></a>
**selectOneRowSql** (sql:string, bind:object|Array, [opt:object|null], cb:function)

see params details: [`opt`](#params-opt)

Fetch only one record (row) from table or view.
Request have to return max one record otherwise error will be thrown.

```js
dal.selectOneRowSql("SELECT To_Char(sysdate, 'yyyy-mm-dd') dat FROM dual", [], function(err, result) {
    if(err) {
        cb(new Error(err));
        return;
    }
    cb(null, result);
});
```
[`API`](#API)

---

<a name="selectOneValue"></a>
**selectOneValue** (tbl:string, field:string, where:Array|object, cb:function)

see params details: [`where`](#params-where)

Fetch one value of specific field from table or view.
Request have to return max one record otherwise error will be thrown.

```js
dal.selectOneValue('test_01', 'text',  ['id = ?', 10], function(err, result) {
    if(err) {
        cb(new Error(err));
        return;
    }
    cb(null, result);
});
```
[`API`](#API)

---

<a name="selectOneValueSql"></a>
**selectOneValueSql**  (sql:string, bind:object|Array, [opt:object|null], cb:function)

see params details: [`opt`](#params-opt)

Fetch one value of specific field from table or view.
Request have to return max one record otherwise error will be thrown.

```js
dal.selectOneValueSql('SELECT text FROM test_01 WHERE id=:0', [10], function(err, result) {
    if(err) {
        cb(new Error(err));
        return;
    }
    cb(null, result);
});
```
[`API`](#API)

---

<a name="selectClobValueSql"></a>
**selectClobValueSql** (sql:string, bind:object|Array, [opt:object|null], cb:function)

see params details: [`opt`](#params-opt)

Only for Oracle driver.

```js
dal.selectClobValueSql('SELECT text_clob FROM test_01 WHERE id=:0', [10], function(err, result) {
    if(err) {
        cb(new Error(err));
        return;
    }
    cb(null, result);
});
```
[`API`](#API)

---

<a name="selectAllRows"></a>
**selectAllRows** (tbl:string, [fields:Array|null], [where:Array|object|null], [order:Array|string|null], [opt:object|null], cb:function)

see params details: [`fields`](#params-fields) [`where`](#params-where) [`order`](#params-order) [`opt`](#params-opt)

```js
dal.selectAllRows('test_01', null, null, null, {outFormat: 'array', limit:10, page:5}, function(err, result) {
    if(err) {
        cb(new Error(err));
        return;
    }
    
    cb(null, result);
});
```
[`API`](#API)

---

<a name="selectAllRowsSql"></a>
**selectAllRowsSql** (sql:string, bind:object|Array, [opt:object|null], cb:function)

see params details: [`opt`](#params-opt)

```js
dal.selectAllRows('SELECT * FROM test WHERE col_a = :0 AND col_b = :1', [1, 'T'], function(err, results) {
    if(err) {
        cb(new Error(err));
        return;
    }
    
    cb(null, results);
});
```
[`API`](#API)

---

<a name="querySql"></a>
**querySql** (sql:string, [bind:object|Array], [opt:object|null], cb:function)

see params details: [`opt`](#params-opt)

Invoke SQL queries like: UPDATE, INSERT, DELETE, DROP, ALTER etc...

```js
dal.querySql('DROP TABLE test_01', [], done);
```
[`API`](#API)

---

<a name="runProcedure"></a>
**runProcedure** (procName:string, bind:object|Array, [optProc:object], cb:function)

see params details: [`optProc`](#params-opt-proc)

Invoke stored procedure with parameters.

```js
var bindvars = {
    i:  'Chris',  // bind type is determined from the data type
    io: { val: 'Jones', dir : dal.BIND_INOUT },
    o:  { type: dal.NUMBER, dir : dal.BIND_OUT },
}
dal.runProcedure('procedure01', bindvars, function(err, results) {
    if(err) {
        cb(new Error(err));
        return;
    }
    
    cb(null, results);
});
```

Invoke stored procedure and grab dbmsOutput

```js
dal.runProcedure('procedure02', {}, {dbmsOutput: true}, function(err, results, output) {
    if(err) {
        cb(new Error(err));
        return;
    }

    cb(null, results, output);
});
```

[`API`](#API)

---

<a name="insert"></a>
**insert** (tbl:string, data:object, cb:function)

see params details: [`data`](#params-data)

```js
dal.insert('test_01', {id: 999, text: 'simple'}, function(err, result) {
    if(err) {
        cb(new Error(err));
        return;
    }
    
    cb(null, results);
});
```
[`API`](#API)

---

<a name="insertReturningId"></a>
**insertReturningId** (tbl:string, data:object, seqence:string, cb:function)

see params details: [`data`](#params-data)

Invoke INSERT operation with unique ID fetched from sequence and returns that ID (no SQL version).

```js
dal.insertReturningId('test_01', {id: null, text: 'test11'}, 'test_01_sid', function(err, result) {
    if(err) {
        cb(new Error(err));
        return;
    }
    
    cb(null, results);
});
```
[`API`](#API)

---

<a name="insertReturningIdSql"></a>
**insertReturningIdSql** (sql:string, bind:object|Array, seqence:string, cb:function)

Invoke INSERT operation with unique ID fetched from sequence and returns that ID (SQL version).

```js
dal.insertReturningIdSql('INSERT INTO test_01 (id, text) VALUES (:0, :1)', [null,'test10'], 'test_01_sid', function(err, result) {
    if(err) {
        cb(new Error(err));
        return;
    }
    
    cb(null, results);
});
```
[`API`](#API)

---

<a name="update"></a>
**update** (tbl:string, data:object, where:Array|object, cb:function)

see params details: [`where`](#params-where) [`data`](#params-data)

Invoke UPDATE on specified table. 
Only fields in given data parameter object (simple key:value) will be modified for rows selected by given where parameter.
 
```js
dal.update('test_01', {text: 'test11-modified'}, ['id = ?', 11], function(err, result) {
    if(err) {
        cb(new Error(err));
        return;
    }
    
    cb(null, results);
});
```
[`API`](#API)

---

<a name="del"></a>
**del**  (tbl:string, where:Array|object, cb:function)

see params details: [`where`](#params-where)

Delete record or records.

```js
dal.del('test_01', ['id = ?', 999], function(err, result) {
    if(err) {
        cb(new Error(err));
        return;
    }
    
    cb(null, results);
});
```
[`API`](#API)

---

<a name="executeTransaction"></a>
**executeTransaction**  (sqlBindArray:Array, cb:function)

Execute simple transaction. 
Either all queries from array will be succesful perform or none of them.

It could be used for multi DDL instructions but in such case transaction won't be work.

```js
var sqlBindArray = [
    ['INSERT INTO test_01 VALUES (:0, :1)', [131, 'T01']],
    ['UPDATE test_01 SET text = :0 WHERE id = :1', ['T02', 131]],
    ['UPDATE test_01 SET text = :0 WHERE id = :1', ['AAB', 124]],
    ['DELETE FROM test_01 WHERE id = :0', [131]]
];

dal.executeTransaction(sqlBindArray, function(err, results) {
    if(err) {
        done(err);
        return;
    }

    assert.equal(results.length, 4);
    done();
});
``` 
[`API`](#API)

---

<a name="getDbConnection"></a>
**getDbConnection**  (cb:function, [probes:number], [waitTime:number])

Get connection from pool to perform operation using orgin db driver methods.

```js
dal.getDbConnection(function(err, connection){
    if (err) {
        cb(new Error(err));
        return;
    }

    connection.execute(sql, bind, {outFormat: dal.OBJECT}, function(err, result) {
        if (err) {
            cb(new Error(err));
            return;
        }

        /* Release the connection back to the connection pool */
        connection.release(function(err) {
            if (err) {
                cb(new Error(err));
                return;
            }
            
            cb(null, result);
        });
    });
});
``` 
[`API`](#API)

---

<a name="getDbPool"></a>
**getDbPool()**

Get orgin connection pool (one from driver or generic pool if driver hasn't pool').

```js
var dbPool = dal.getDbPool();
```
[`API`](#API)

---

<a name="getDriver"></a>
**getDriver()**

Get orgin db driver object.

```js
var driver = dal.getDriver();
```
[`API`](#API)


---
## Method parameters
---


<a name="params-fields"></a>
#### fields

selected fields:
```js
['field1', 'field2', 'field3']
```

all fields:
```js
null
```

only one field:
```js
'fieldX'
```
[`API`](#API)

---

<a name="params-where"></a>
#### where

as a array:
```js
[
   [ 'field LIKE ?', '%ola%' ], // operator AND is default
   [ 'field2 IS NULL', null, 'OR' ],
   {
       type: 'AND',
       nested: [
           [ 'field3 = ?', 5 ],
           [ 'field5 BETWEEN ? AND ?', [3, 4], 'OR' ]
       ]
   }
]
```
as a object (only AND clouse and equity (=) operator):
```json
{
    "field1": 100,
    "field2": "abc"
}
```
[`API`](#API)

---

<a name="params-data"></a>
#### data

```js
var data = {
    field1: { type: 'sequence', name: 'seq_name' },
    field2: "value1",
    field3: { type: 'function', name: 'fn_name' },
    field4: "value2",
    field5: { name: 'SYSDATE' }
}
```
[`API`](#API)

---

<a name="params-order"></a>
#### order

```js
var order_v1 = ['field1', ['field2', 'DESC']]
var order_v2 = ['field1', 'field2 DESC']
```
[`API`](#API)


<a name="params-opt"></a>
#### opt


```js
var opt = {
    outFormat: 'array', // return results as Array instead of object (object like JSON is default behavior for this library)
    limit: 10,          // enable pagination and sets row number per page, also adds to results field "n__" (or last in array) with curent row number
    page: 5,            // page number to fetch,
    totalCount: true    // adds to resalts field "c__" (or last in array) with all query rows count (summarize all records in all pages for given query)
}
```
[`API`](#API)


<a name="params-opt-proc"></a>
#### optProc


```js
var optProc = {
    dbmsOutput: true // fetch all DBMS_OUTPUT.PUT_LINE from procedure and put that string as last callback argument
}
```
[`API`](#API)

