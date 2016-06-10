/* eslint-disable */

var http = require('http'),
    conf       = require('./../config').oracle,
    dalFactory = require('../../lib/dalFactory'),
    memMaxUsage = {
        rss:       0,
        heapTotal: 0,
        heapUsed:  0
    };

dalFactory('oracledb', conf, function(err, dal) {
    if(err) {
        console.trace(err);
        return false;
    }

    http.createServer(function (req, res) {

        dal.selectOneValueSql('SELECT SYSDATE FROM DUAL', [], function(err, result) {
            if(err) {
                console.trace(err);
                return false;
            }

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(result + '\n');
        });

    }).listen(7000, "127.0.0.1");
});

setInterval(function() {
    memUsage();
}, 2000);

process.on('SIGINT', function() {
    console.log('\n');
    memUsage();
    console.log('\nfinally max value:');
    console.log(memMaxUsage);
    process.exit(0);
});

console.log('Server running at http://127.0.0.1:7000/');

function memUsage() {
    var mem = process.memoryUsage();
    console.log(mem);

    ['rss', 'heapTotal', 'heapUsed'].forEach(function(v) {
        if(memMaxUsage[v] < mem[v]) {
            memMaxUsage[v] = mem[v];
        }
    });
}
