"use strict";

const argsParser = require('fn-params-parser');

// defaults proto
const protoSqlBindCb = [
    { name: 'sql',          type: 'string'          },
    { name: 'bind',         type: ['object', Array], default: [] },
    { name: 'opt',          type: 'object',          optional: true },
    { name: 'cb',           type: 'function',        optional: true }
];

const lib = {
    /**
     * @param args '[opt:object],  [cb:function]'
     * @returns {*}
     */
    getDbConnection: function(args) {
        const proto = [
            { name: 'opt',          type: 'object',          default: {}     },
            { name: 'cb',           type: 'function',        optional: true  }
        ];
        return argsParser(args, proto);
    },

    /**
     * @param args 'sqlBindArray:Array, [opt:object], [cb:function]'
     * @returns {*}
     */
    executeTransaction: function(args) {
        const proto = [
            { name: 'sqlBindArray', type: Array      },
            { name: 'opt',          type: 'object',          optional: true },
            { name: 'cb',           type: 'function',        optional: true }
        ];
        return argsParser(args, proto);
    },

    /**
     * @param args 'sql:string, bind:object|Array, [opt:object|null], [cb:function]'
     * @returns {*}
     */
    selectOneRowSql: function(args) {
        return argsParser(args, protoSqlBindCb);
    },

    /**
     * @param args 'tbl:string, [fields:Array|null], where:Array|object, [opt:object|null], [cb:function]'
     * @returns {*}
     */
    selectOneRow: function(args) {
        const proto = [
            { name: 'tbl',          type: 'string'   },
            { name: 'fields',       type: [Array, null],    optional: true },
            { name: 'where',        type: [Array, 'object'] },
            { name: 'opt',          type: 'object',         optional: true },
            { name: 'cb',           type: 'function',       optional: true }
        ];
        return argsParser(args, proto);
    },

    /**
     * @param args 'sql:string, bind:object|array, [opt:object|null], [cb:function]'
     * @returns {*}
     */
    selectOneValueSql: function(args) {
        return argsParser(args, protoSqlBindCb);
    },

    /**
     * @param args 'sql:string, bind:object|Array, [opt:object|null], [cb:function]'
     * @returns {*}
     */
    selectClobValueSql: function(args) {
        return argsParser(args, protoSqlBindCb);
    },

    /**
     * @param args 'sql:string, bind:object|Array, [opt:object|null], [cb:function]'
     * @returns {*}
     */
    selectOneClobValueSql: function(args) {
        return argsParser(args, protoSqlBindCb);
    },

    /**
     * @param args 'tbl:string, field:string, where:Array|object, [opt:object|null], [cb:function]'
     * @returns {*}
     */
    selectOneValue: function(args) {
        const proto = [
            { name: 'tbl',          type: 'string'   },
            { name: 'field',        type: 'string'   },
            { name: 'where',        type: [Array, 'object'] },
            { name: 'opt',          type: 'object',          optional: true },
            { name: 'cb',           type: 'function',        optional: true }
        ];
        return argsParser(args, proto);
    },

    /**
     * @param args 'sql:string, bind:object|Array, [opt:object|null], [cb:function]'
     * @returns {*}
     */
    selectAllRowsSql: function(args) {
        return argsParser(args, protoSqlBindCb);
    },

    /**
     * @param args 'tbl:string, [fields:Array|null], [where:Array|object|null], [order:Array|string|null], [opt:object|null], [cb:function]'
     * @returns {*}
     */
    selectAllRows: function(args) {
        const proto = [
            { name: 'tbl',          type: 'string'                                },
            { name: 'fields',       type: [Array, null],           optional: true },
            { name: 'where',        type: [Array, 'object', null], optional: true },
            { name: 'order',        type: [Array, 'string', null], optional: true },
            { name: 'opt',          type: ['object', null],        optional: true },
            { name: 'cb',           type: 'function',              optional: true }
        ];
        return argsParser(args, proto);
    },

    /**
     * @param args 'procName:string, bind:object|Array, [opt:object], [cb:function]'
     * @returns {*}
     */
    runProcedure: function(args) {
        const proto = [
            { name: 'procName',     type: 'string'          },
            { name: 'bind',         type: ['object', Array], default: []},
            { name: 'opt',          type: 'object',          optional: true },
            { name: 'cb',           type: 'function',        optional: true }
        ];
        return argsParser(args, proto);
    },

    /**
     * @param args 'sql:string, [bind:object|Array], [opt:object|null], [cb:function]'
     * @returns {*}
     */
    querySql: function(args) {
        const proto = [
            { name: 'sql',          type: 'string'          },
            { name: 'bind',         type: ['object', Array], default: [] },
            { name: 'opt',          type: 'object',          optional: true },
            { name: 'cb',           type: 'function',        optional: true }
        ];
        return argsParser(args, proto);
    },

    /**
     * @param args 'tbl:string, data:object, [opt:object|null], [cb:function]'
     * @returns {*}
     */
    insert: function(args) {
        const proto = [
            { name: 'tbl',          type: 'string'   },
            { name: 'data',         type: 'object'   },
            { name: 'opt',          type: 'object',          optional: true },
            { name: 'cb',           type: 'function',        optional: true }
        ];
        return argsParser(args, proto);
    },

    /**
     * @param args 'tbl:string, where:Array|object, [opt:object|null], [cb:function]'
     * @returns {*}
     */
    del: function(args) {
        const proto = [
            { name: 'tbl',          type: 'string'          },
            { name: 'where',        type: [Array, 'object'] },
            { name: 'opt',          type: 'object',          optional: true },
            { name: 'cb',           type: 'function',        optional: true }
        ];
        return argsParser(args, proto);
    },

    /**
     * @param args 'tbl:string, data:object, sequence:string, [opt:object|null], [cb:function]'
     * @returns {*}
     */
    insertReturningId: function(args) {
        const proto = [
            { name: 'tbl',          type: 'string'   },
            { name: 'data',         type: 'object'   },
            { name: 'sequence',     type: 'string'   },
            { name: 'opt',          type: 'object',          optional: true },
            { name: 'cb',           type: 'function',        optional: true }
        ];
        return argsParser(args, proto);
    },

    /**
     * @param args 'sql:string, bind:object|Array, sequence:string, [opt:object|null], [cb:function]'
     * @returns {*}
     */
    insertReturningIdSql: function(args) {
        const proto = [
            { name: 'sql',          type: 'string'          },
            { name: 'bind',         type: ['object', Array], default: [] },
            { name: 'sequence',     type: 'string'          },
            { name: 'opt',          type: 'object',          optional: true },
            { name: 'cb',           type: 'function',        optional: true }
        ];
        return argsParser(args, proto);
    },

    /**
     * @param args 'tbl:string, data:object, where:Array|object, [opt:object|null], [cb:function]'
     * @returns {*}
     */
    update: function(args) {
        const proto = [
            { name: 'tbl',          type: 'string'          },
            { name: 'data',         type: 'object'          },
            { name: 'where',        type: [Array, 'object'] },
            { name: 'opt',          type: 'object',          optional: true },
            { name: 'cb',           type: 'function',        optional: true }
        ];
        return argsParser(args, proto);
    }
};

module.exports = lib;
