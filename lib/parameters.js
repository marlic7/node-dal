var argsParser = require('./argsParser');

// defaults proto
var protoSqlBindCb = [
    { 'name': 'sql',          'type': 'string'          },
    { 'name': 'bind',         'type': ['object', Array] },
    { 'name': 'opt',          'type': 'object',          'optional': true },
    { 'name': 'cb',           'type': 'function'        }
];

var lib = {
    /**
     * @param args 'cb:function, [probes:number], [waitTime:number]'
     * @returns {*}
     */
    getDbConnection: function(args) {
        var proto = [
            { 'name': 'cb',           'type': 'function' },
            { 'name': 'probes',       'type': 'number', 'optional': true },
            { 'name': 'waitTime',     'type': 'number', 'optional': true }
        ];
        return argsParser.parse(args, proto);
    },

    /**
     * @param args 'sqlBindArray:Array, cb:function'
     * @returns {*}
     */
    executeTransaction: function(args) {
        var proto = [
            { 'name': 'sqlBindArray', 'type': Array      },
            { 'name': 'cb',           'type': 'function' }
        ];
        return argsParser.parse(args, proto);
    },

    /**
     * @param args 'sql:string, bind:object|Array, [opt:object|null], cb:function'
     * @returns {*}
     */
    selectOneRowSql: function(args) {
        return argsParser.parse(args, protoSqlBindCb);
    },

    /**
     * @param args 'tbl:string, [fields:Array|null], where:Array, [opt:object|null], cb:function'
     * @returns {*}
     */
    selectOneRow: function(args) {
        var proto = [
            { 'name': 'tbl',          'type': 'string'   },
            { 'name': 'fields',       'type': [Array, null],    'optional': true },
            { 'name': 'where',        'type': Array      },
            { 'name': 'opt',          'type': 'object',         'optional': true },
            { 'name': 'cb',           'type': 'function' }
        ];
        return argsParser.parse(args, proto);
    },

    /**
     * @param args 'sql:string, bind:object|Array, [opt:object|null], cb:function'
     * @returns {*}
     */
    selectOneValueSql: function(args) {
        return argsParser.parse(args, protoSqlBindCb);
    },

    /**
     * @param args 'sql:string, bind:object|Array, [opt:object|null], cb:function'
     * @returns {*}
     */
    selectClobValueSql: function(args) {
        return argsParser.parse(args, protoSqlBindCb);
    },

    /**
     * @param args 'tbl:string, field:string, where:Array|object, cb:function'
     * @returns {*}
     */
    selectOneValue: function(args) {
        var proto = [
            { 'name': 'tbl',          'type': 'string'   },
            { 'name': 'field',        'type': 'string'   },
            { 'name': 'where',        'type': [Array, 'object'] },
            { 'name': 'cb',           'type': 'function' }
        ];
        return argsParser.parse(args, proto);
    },

    /**
     * @param args 'sql:string, bind:object|Array, [opt:object|null], cb:function'
     * @returns {*}
     */
    selectAllRowsSql: function(args) {
        return argsParser.parse(args, protoSqlBindCb);
    },

    /**
     * @param args 'tbl:string, [fields:Array|null], [where:Array|object|null], [order:Array|string|null], [opt:object|null], cb:function'
     * @returns {*}
     */
    selectAllRows: function(args) {
        var proto = [
            { 'name': 'tbl',          'type': 'string'           },
            { 'name': 'fields',       'type': [Array, null],           'optional': true },
            { 'name': 'where',        'type': [Array, 'object', null], 'optional': true },
            { 'name': 'order',        'type': [Array, 'string', null], 'optional': true },
            { 'name': 'opt',          'type': ['object', null],        'optional': true },
            { 'name': 'cb',           'type': 'function'         }
        ];
        return argsParser.parse(args, proto);
    },

    /**
     * @param args 'procName:string, bind:object|Array, [opt:object], cb:function'
     * @returns {*}
     */
    runProcedure: function(args) {
        var proto = [
            { 'name': 'procName',     'type': 'string'          },
            { 'name': 'bind',         'type': ['object', Array] },
            { 'name': 'opt',          'type': 'object',        'optional': true },
            { 'name': 'cb',           'type': 'function'        }
        ];
        return argsParser.parse(args, proto);
    },

    /**
     * @param args 'sql:string, [bind:object|Array], [opt:object|null], cb:function'
     * @returns {*}
     */
    querySql: function(args) {
        var proto = [
            { 'name': 'sql',          'type': 'string'          },
            { 'name': 'bind',         'type': ['object', Array], 'optional': true },
            { 'name': 'opt',          'type': 'object',          'optional': true },
            { 'name': 'cb',           'type': 'function'        }
        ];
        return argsParser.parse(args, proto);
    },

    /**
     * @param args 'tbl:string, data:object, cb:function'
     * @returns {*}
     */
    insert: function(args) {
        var proto = [
            { 'name': 'tbl',          'type': 'string'   },
            { 'name': 'data',         'type': 'object'   },
            { 'name': 'cb',           'type': 'function' }
        ];
        return argsParser.parse(args, proto);
    },

    /**
     * @param args 'tbl:string, where:Array|object, cb:function'
     * @returns {*}
     */
    del: function(args) {
        var proto = [
            { 'name': 'tbl',          'type': 'string'          },
            { 'name': 'where',        'type': [Array, 'object'] },
            { 'name': 'cb',           'type': 'function'        }
        ];
        return argsParser.parse(args, proto);
    },

    /**
     * @param args 'tbl:string, data:object, seqence:string, cb:function'
     * @returns {*}
     */
    insertReturningId: function(args) {
        var proto = [
            { 'name': 'tbl',          'type': 'string'   },
            { 'name': 'data',         'type': 'object'   },
            { 'name': 'seqence',      'type': 'string'   },
            { 'name': 'cb',           'type': 'function' }
        ];
        return argsParser.parse(args, proto);
    },

    /**
     * @param args 'sql:string, bind:object|Array, seqence:string, cb:function'
     * @returns {*}
     */
    insertReturningIdSql: function(args) {
        var proto = [
            { 'name': 'sql',          'type': 'string'          },
            { 'name': 'bind',         'type': ['object', Array] },
            { 'name': 'seqence',      'type': 'string'          },
            { 'name': 'cb',           'type': 'function'        }
        ];
        return argsParser.parse(args, proto);
    },

    /**
     * @param args 'tbl:string, data:object, where:Array|object, cb:function'
     * @returns {*}
     */
    update: function(args) {
        var proto = [
            { 'name': 'tbl',          'type': 'string'          },
            { 'name': 'data',         'type': 'object'          },
            { 'name': 'where',        'type': [Array, 'object'] },
            { 'name': 'cb',           'type': 'function'        }
        ];
        return argsParser.parse(args, proto);
    },

    // only for test params procesing
    testParams: function(args) {
        var proto = [
            { 'name': 'sqlBindArray', 'type': Array      },
            { 'name': 'cb',           'type': 'function' }
        ];
        return argsParser.parse(args, proto);
    }
};

module.exports = lib;