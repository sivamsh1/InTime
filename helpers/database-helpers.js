const { getDb } = require('../db');

module.exports = {
    findAll : async (collection)=>{
          getDb().collection('category').find().toArray()       
    }
        
    
    }