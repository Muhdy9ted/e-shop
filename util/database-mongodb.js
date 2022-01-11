const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

let _db;

const mongoConnect = (callback) => {
    MongoClient.connect('mongodb+srv://moohdy:moohdy9ted%3F@cluster0.npd8x.mongodb.net/shop?retryWrites=true&w=majority').then(client => {
        console.log('CONNECTED')
        _db = client.db('shop');
        callback();
    }).catch(err => { 
        console.log(err);
        throw err;
    });
};

const getDb = () => {
    if(_db){
        return _db
    }

    throw 'No database found';
}

exports.mongoConnect = mongoConnect;
exports.getDb = getDb;