const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { getDb } = require('./db');



module.exports = {  
 authentication: async(req,res,next)=>{
    try{
if(req.cookies.userjwt){
 const loggedIn = await jwt.verify(req.cookies.userjwt,process.env.JWT_SECRET);
 console.log(loggedIn);
    if(loggedIn){
        next();
    }else{
        res.redirect("/login")
    }

}else{
    res.redirect('/login')
}}catch (err){
    console.log(err);
   }
  },

  authentcation2: async(req,res,next)=>{
    try{
if(req.cookies.userjwt){
 const loggedIn = await jwt.verify(req.cookies.userjwt,process.env.JWT_SECRET);
    if(loggedIn){
        res.redirect("/")
    }
}else{  
    next();
}}catch (err){
    console.log(err);
   }
  },

authentication3: async (req,res,next)=>{
    if(req.cookies.userjwt){
        const loggedIn = await jwt.verify(req.cookies.userjwt,process.env.JWT_SECRET);
        console.log(loggedIn);
           if(loggedIn){
               next();
           }else{
            res.redirect('/');
           }
       
       }else{  
        res.redirect("/");
       }
},

blockedAuthentication: async(req,res,next)=>{
if(req.cookies.userjwt){
    
 const loggedIn = await jwt.verify(req.cookies.userjwt,process.env.JWT_SECRET);
    if(loggedIn){
       const userId= loggedIn.userId;
       let user = await getDb().collection('users').findOne({_id:ObjectId(userId) })
       const isValid = user.isValid
       console.log(isValid);
       if(isValid){
        next();
       }else{
        res.cookie('userjwt', 'loggedout', {
            maxAge: 1,
            httpOnly: true
          })
        res.redirect('/login')
       }   
    }else{
        next();
    } 

}else{
    next();
}
}

}
