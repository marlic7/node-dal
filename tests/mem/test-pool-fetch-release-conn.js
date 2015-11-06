var http = require('http'),
    conf       = require('./../config').oracle,
    dalFactory = require('../../lib/dalFactory');


dalFactory('oracledb', conf, function(err, dal) {
    if(err) {
        console.trace(err);
        return false;
    }

    http.createServer(function (req, res) {

        dal.getDbConnection(function(err, connection) {
            if(err) {
                console.trace(err);
                return false;
            }

            connection.release(function(err) {
                if(err) {
                    console.trace(err);
                    return false;
                }

                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Hello World\n');
            });
        });

    }).listen(7000, "127.0.0.1");
});

setInterval(function() {
    console.log(process.memoryUsage());
}, 2000);

console.log('Server running at http://127.0.0.1:7000/');
