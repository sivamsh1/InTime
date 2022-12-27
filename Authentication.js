const jwt = require("jsonwebtoken")

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
  }


}
