# Node.js Database Abstraction Layer (node-dal)

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
* Oracle (oracledb driver)

This library is not:
* ORM
* Promise based

## Documentation

### initialization

```js
var dalFactory = require('node-dal'),
    oracledb   = require('oracledb'), // this line is not required but library must be installed in your project!
    conf       = require('./config');

dalFactory('oracledb', conf.oracle, function(err, dal) {
    if(err) {
        throw err;
    }

    /** @typedef {OracleDB} global.dal * /
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
        getConnMaxProbes   :  50, // times
        getConnWaitMinTime : 100, // miliseconds
        getConnWaitMaxTime : 200  // miliseconds
    },
    other: { ... }
};
```

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

<a name="API" />
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

<a name="selectOneRow" />
**selectOneRow(tbl:string, [fields:Array|null], where:Array, [opt:object|null], cb:function)**

see params details: [`fields`](#params-fields) [`where`](#params-where) [`opt`](#params-opt)

Fetch only one record (row) from table or view.
Request have to return max one record otherwise error will be thrown.

Example:

```js
dal.selectOneRow('test_01', null, ['id = ?', 10], function(err, result) {
    if(err) {
        cb(new MyError(err));
        return;
    }
    cb(null, result);
});
```
[`API`](#API)

---

<a name="selectOneRowSql" />
**selectOneRowSql(sql:string, bind:object|Array, [opt:object|null], cb:function)**

see params details: [`opt`](#params-opt)

Pobiera pojedynczy rekord z tabeli/widoku
(zapytanie SQL musi zwrócić maksymalnie jeden rekord, inaczej będzie błąd)

```js
dal.selectOneRowSql("SELECT To_Char(sysdate, 'yyyy-mm-dd') dat FROM dual", [], function(err, result) {
    if(err) {
        cb(new MyError(err));
        return;
    }
    cb(null, result);
});
```
[`API`](#API)

---

<a name="selectOneValue" />
**selectOneValue(tbl:string, field:string, where:Array|object, cb:function)**

see params details: [`where`](#params-where)

Pobiera pojedynczą wartość z konkretnego pla tabeli/widoku
(zapytanie SQL musi zwrócić maksymalnie jeden rekord, inaczej będzie błąd)

```js
dal.selectOneValue('test_01', 'text',  ['id = ?', 10], function(err, result) {
    if(err) {
        cb(new MyError(err));
        return;
    }
    cb(null, result);
});
```
[`API`](#API)

---

<a name="selectOneValueSql" />
**selectOneValueSql(sql:string, bind:object|Array, [opt:object|null], cb:function)**

see params details: [`opt`](#params-opt)

Pobiera pojedynczą wartość z konkretnego pla tabeli/widoku
(zapytanie SQL musi zwrócić maksymalnie jeden rekord, inaczej będzie błąd)

```js
dal.selectOneValueSql('SELECT text FROM test_01 WHERE id=:0', [10], function(err, result) {
    if(err) {
        cb(new MyError(err));
        return;
    }
    cb(null, result);
});
```
[`API`](#API)

---

<a name="selectClobValueSql" />
**selectClobValueSql(sql:string, bind:object|Array, [opt:object|null], cb:function)**

see params details: [`opt`](#params-opt)

Only for Oracle driver.

```js
dal.selectClobValueSql('SELECT text_clob FROM test_01 WHERE id=:0', [10], function(err, result) {
    if(err) {
        cb(new MyError(err));
        return;
    }
    cb(null, result);
});
```
[`API`](#API)

---

<a name="selectAllRows" />
**selectAllRows(tbl:string, [fields:Array|null], [where:Array|object|null], [order:Array|string|null], [opt:object|null], cb:function)**

see params details: [`fields`](#params-fields) [`where`](#params-where) [`order`](#params-order) [`opt`](#params-opt)

```js
dal.selectAllRows('test_01', null, null, null, {outFormat: 'array', limit:10, page:5}, function(err, result) {
    if(err) {
        cb(new MyError(err));
        return;
    }
    
    cb(null, result);
});
```
[`API`](#API)

---

<a name="selectAllRowsSql" />
**selectAllRowsSql(sql:string, bind:object|Array, [opt:object|null], cb:function)**

see params details: [`opt`](#params-opt)

```js
dal.selectAllRows('SELECT * FROM test WHERE col_a = :0 AND col_b = :1', [1, 'T'], function(err, results) {
    if(err) {
        cb(new MyError(err));
        return;
    }
    
    cb(null, results);
});
```
[`API`](#API)

---

<a name="querySql" />
**querySql(sql:string, [bind:object|Array], [opt:object|null], cb:function)**

see params details: [`opt`](#params-opt)

Wywołanie na bazie poleceń typu: UPDATE, INSERT, DELETE, DROP, ALTER itp...

```js
dal.querySql('DROP TABLE test_01', [], done);
```
[`API`](#API)

---

<a name="runProcedure" />
**runProcedure(procName:string, bind:object|Array, cb:function)**

Uruchamia procedurę PL/SQL

```js
var bindvars = {
    i:  'Chris',  // bind type is determined from the data type
    io: { val: 'Jones', dir : dal.BIND_INOUT },
    o:  { type: dal.NUMBER, dir : dal.BIND_OUT },
}
dal.runProcedure('procedure01', bindvars, function(err, results) {
    if(err) {
        cb(new MyError(err));
        return;
    }
    
    cb(null, results);
});
```
[`API`](#API)

---

<a name="insert" />
**insert(tbl:string, data:object, cb:function)**

see params details: [`data`](#params-data)

```js
dal.insert('test_01', {id: 999, text: 'simple'}, function(err, result) {
    if(err) {
        cb(new MyError(err));
        return;
    }
    
    cb(null, results);
});
```
[`API`](#API)

---

<a name="insertReturningId" />
**insertReturningId(tbl:string, data:object, seqence:string, cb:function)**

see params details: [`data`](#params-data)

Wykonuje polecenie insert pobierając wcześniej ID z sekwencji i zwraca to ID (wersja no SQL)

```js
dal.insertReturningId('test_01', {id: null, text: 'test11'}, 'test_01_sid', function(err, result) {
    if(err) {
        cb(new MyError(err));
        return;
    }
    
    cb(null, results);
});
```
[`API`](#API)

---

<a name="insertReturningIdSql" />
**insertReturningIdSql(sql:string, bind:object|Array, seqence:string, cb:function)**

Wykonuje polecenie insert pobierając wcześniej ID z sekwencji i zwraca to ID (wersja SQL)

```js
dal.insertReturningIdSql('INSERT INTO test_01 (id, text) VALUES (:0, :1)', [null,'test10'], 'test_01_sid', function(err, result) {
    if(err) {
        cb(new MyError(err));
        return;
    }
    
    cb(null, results);
});
```
[`API`](#API)

---

<a name="update" />
**update(tbl:string, data:object, where:Array|object, cb:function)**

see params details: [`where`](#params-where) [`data`](#params-data)

Wykonuje UPDATE na zadanej tabelce wg zadanych warunków (wersja no SQL)

```js
dal.update('test_01', {text: 'test11-modified'}, ['id = ?', 11], function(err, result) {
    if(err) {
        cb(new MyError(err));
        return;
    }
    
    cb(null, results);
});
```
[`API`](#API)

---

<a name="del" />
**del(tbl:string, where:Array|object, cb:function)**

see params details: [`where`](#params-where)

Usunięcie rekordu/rekordów

```js
dal.del('test_01', ['id = ?', 999], function(err, result) {
    if(err) {
        cb(new MyError(err));
        return;
    }
    
    cb(null, results);
});
```
[`API`](#API)

---

<a name="executeTransaction" />
**executeTransaction(sqlBindArray:Array, cb:function)**

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

<a name="getDbConnection" />
**getDbConnection(cb:function, [probes:number], [waitTime:number])**

```js
dal.getDbConnection(function(err, connection){
    if (err) {
        cb(new MyError(err));
        return;
    }

    connection.execute(sql, bind, {outFormat: dal.OBJECT}, function(err, result) {
        if (err) {
            cb(new MyError(err, {sql: sql, bind: bind}));
            return;
        }

        /* Release the connection back to the connection pool */
        connection.release(function(err) {
            if (err) {
                cb(new MyError(err));
                return;
            }
            
            cb(null, result);
        });
    });
});
``` 
[`API`](#API)

---

<a name="getDbPool" />
**getDbPool()**

Get orgin connection pool (one from driver or generic pool if driver hasn't pool').

```js
var dbPool = dal.getDbPool();
```
[`API`](#API)

---

<a name="getDriver" />
**getDriver()**

Get raw db driver object.

```js
var driver = dal.getDriver();
```
[`API`](#API)


---
## Method parameters
---


<a name="params-fields" />
####fields

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

<a name="params-where" />
####where

as a array:
```js
[
   ['field LIKE ?', '%ola%'], // operator AND is default
   ['field2 IS NULL', null, 'OR'],
   {
       type: 'AND',
       nested: [
           ['field3 = ?', 5],
           ['field5 BETWEEN ? AND ?, [3, 4], 'OR']
       ]
   }
]
```
as a object (only AND clouse and equity (=) operator):
```js
{ 
    field1: 100, 
    field2: 'abc' 
}
```
[`API`](#API)

---

<a name="params-data" />
####data

```js
var data = {
    field1: {type: 'sequence', name: 'seq_name'},
    field2: "value1",
    field3: {type: 'function', name: 'fn_name'},
    field4: "value2",
    field5: {name: 'SYSDATE'}
}
```
[`API`](#API)

---

<a name="params-order" />
####order

```js
var order_v1 = ['field1', ['field2', 'DESC']]
var order_v2 = ['field1', 'field2 DESC']
```
[`API`](#API)


<a name="params-opt" />
####opt


```js
var opt = {
    outFormat: 'array', // wyniki są zwracane w tablicy zamiast jako obiekt z kluczami zgodnymi z nazwą pól
    limit: 10,          // aktywuje stronicowanie i określa rozmiar strony, dodaje też do wyników pole n__ (lub ostatnie w tablicy) z numerem wiersza
    page: 5             // numer strony,
    totalCount: true    // dodaje do wyników pole c__ (lub przed ostatnie w tablicy) z sumą rekordów zapytania
}
```
[`API`](#API)

