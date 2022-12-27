const mongodb = require("mongodb");
  
const db = "mongodb://127.0.0.1:27017"

const MongoClient = mongodb.MongoClient;

const mongoDbUrl = db;


let _db;

const initDb = (callback) => {
  if (_db) {
    console.log("Database is already initialized!");
    return callback(null, _db);
  }
  MongoClient.connect(mongoDbUrl)
    .then((client) => {
      _db = client.db("InTime");
      callback(null, _db);
    })
    .catch((err) => {
      callback(err);
    });         
};

const getDb = () => {
  if (!_db) {
    throw Error("Database not initialzed");
  }
  return _db;
};

module.exports = {
  initDb,
  getDb,
};
