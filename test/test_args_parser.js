const should    = require('should'),
    argsParser  = require('../lib/argsParser2'),
    fn          = function(spec) { return function() { return argsParser.parse(arguments, spec) }},
    fake_fn     = function() {};

describe('parse and verify function arguments', function () {
    let s1 = [
            { 'name': 'p1', 'type': 'string'          },
            { 'name': 'p2', 'type': ['object', Array] },
            { 'name': 'p3', 'type': 'object',          'optional': true },
            { 'name': 'p4', 'type': 'function'        }
        ];
    it('should match standard params for spec 1', function () {
        should.deepEqual(fn(s1)('abc', [], {}, fake_fn), { p1: "abc", p2: [], p3: {}, p4: fake_fn });
        should.deepEqual(fn(s1)('abc', [], fake_fn), { p1: "abc", p2: [], p3: null, p4: fake_fn });
        should.deepEqual(fn(s1)('abc', {}, fake_fn), { p1: "abc", p2: {}, p3: null, p4: fake_fn });
    });
    
    it('should match one object params for spec 1', function () {
        should.deepEqual(fn(s1)({p1: 'abc', p2: [], p3: {}, p4: fake_fn}), { p1: "abc", p2: [], p3: {}, p4: fake_fn });
        should.deepEqual(fn(s1)({p1: 'abc', p2: [], p4: fake_fn}), { p1: "abc", p2: [], p3: null, p4: fake_fn });
        should.deepEqual(fn(s1)({p1: 'abc', p2: {}, p4: fake_fn}), { p1: "abc", p2: {}, p3: null, p4: fake_fn });
    });

    it('should throw parameter mismatch for spec 1', function () {
        (function() { fn(s1)('abc', {}) }).should.throw('Not all mandatory arguments are passed');
    });
});

//argsParser.parse(args, proto);
