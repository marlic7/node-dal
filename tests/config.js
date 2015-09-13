module.exports = {
    oracle: {
        connection: {
            user: "testy",
            password: "testy123",
            connectString: "localhost/XE",
            poolMax: 10,
            poolMin: 1,
            poolIncrement: 1,
            poolTimeout: 60
        },
        getConnMaxProbes   :  50, // times
        getConnWaitMinTime : 100, // miliseconds
        getConnWaitMaxTime : 200  // miliseconds
    }
};