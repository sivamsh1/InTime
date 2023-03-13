const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const { getDb } = require('../models/db');
const { ObjectId } = require('mongodb');
const jwt = require("jsonwebtoken")
const multer = require('multer')
const path = require('path')
const cloudinary = require('../utils/cloudinary')
const { order } = require('paypal-rest-sdk');

module.exports = ({
    verifyUserLogin: async (req, res, next) => {   
      console.log("verify login")
      
      let { email, password } = req.body;
      console.log(email,password) 
        const user = await getDb().collection('users').findOne({ email })
        if (user) {
          const userId = user._id;
          const dbPassword = user.password
          const isPasswordCorrect = await bcrypt.compare(password, dbPassword)
          if (isPasswordCorrect) {
            //Token creation
            const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
              expiresIn: "1d",
            });
            //storing in cookies
            res.cookie("userjwt", token, {
              httpOnly: true,
              sameSite: "lax",
              secure: false,
              maxAge: 24 * 60 * 60 * 1000,
            });
    
            res.json({
              status: 200,
              message: "success",
              errorr: null,
            })
    
          } else {
            res.json({
              status: 200,
              message: "failed",
              errorr: "Invalid Password"
    
            })
          }
        } else {
          res.json({
            status: 200,
            message: "failed",
            errorr: "Invalid Credentials"
          })
        }
      },
      userSignup: async (req, res, next) => {


        let { name, email, number, password } = req.body
        number = parseInt(number);
        const dbEmail = await getDb().collection('users').findOne({ email })
        if (dbEmail == null) {
          //Data Insertion
          let isValid = true;
          let address = []
          password = await bcrypt.hash(password, 8)
          await getDb().collection('users').insertOne({ name, email, password, number, isValid,address })
          const user = await getDb().collection('users').findOne({ email })
          const userId = user._id;
    
          //Token creation
          const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
            expiresIn: "1d",
          });
          //storing in cookies
          res.cookie("userjwt", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            maxAge: 24 * 60 * 60 * 1000,
          });
    
          res.json({
            status: 200,
            message: "success",
            errorr: null,
          })
        } else {
          res.json({
            status: 200,
            message: "failed",
            errorr: "Email Already Exist"
    
          })
        }
    
      },
      userProfileAuthentication:async(req,res)=>{
        console.log(req.body);
        let {name,email,number,Address}= req.body
        const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;
        const currentUser = await getDb().collection('users').findOne({_id:ObjectId(userId)})  
      console.log(currentUser.Address[0]);
      Address = Address.trim();
        if(name==currentUser.name && email==currentUser.email && number==currentUser.number && currentUser.Address[0] == Address ){
          console.log('if Part');
         res.json({
          status:200,
          message:'failed',
          error:'Details Already Exist'
         })
        }else{
          console.log('ElsePart');
          await getDb().collection('users').updateOne({_id:ObjectId(userId)},{$set:{name:name,email:email,number:number}})
       res.json({
        status:200,
         message:'success'
       })
       }},

       adminloginAuthentication : async (req, res, next) => {
        const { email, password } = req.body
        const isUserValid = await getDb().collection('admin').findOne({ email })
        if (isUserValid) {
              const dbPassword = isUserValid.password;
              const isPasswordCorrect = (password == dbPassword)
              console.log(isPasswordCorrect);
              if (isPasswordCorrect) {
                    res.json({
                          status: 200,
                          message: "success"
                    })
              } else {
                    res.json({
                          status: 200,
                          message: "failed",
                          errorr: "Invalid Credentials"

                    })

              }
        } else {
              res.json({
                    status: 200,
                    message: "failed",
                    errorr: "Invalid Credentials"
              })
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
  },
  
  loginRedirect: async(req,res,next)=>{
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
  }, isLoggedin: async(req,res,next)=>{
    try{
if(req.cookies.userjwt){
 const loggedIn = await jwt.verify(req.cookies.userjwt,process.env.JWT_SECRET);     
    if(loggedIn){
        next();
    }else{
      res.redirect('/')
    }
}else{
    res.redirect('/')
}}catch (err){
    console.log(err);
   }
  },
  renderOtpLogin: async (req,res,next)=>{
  res.render('user/otpLogin',{user:true})
  },
  numberVerify : async(req,res)=>{

    let {number} = req.body;
    number = parseInt(number);

    let isExistNumber = await getDb().collection('users').findOne({number:number })
   
    if(isExistNumber){

// Function to generate a random OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}
const otp = generateOTP();

// Function to send the OTP via SMS
async function sendOTP(toNumber) {
  console.log(otp);

       const accountSid = process.env.TWILLIO_accountSid;
       const authToken = process.env.TWILLIO_authToken;
    const client = require("twilio")(accountSid, authToken);
    
    client.messages
      .create({ body: `Your OTP is ${otp}`, from: "+12765660833", to:`+91${toNumber}`})
      .then(message => console.log(message.sid));

}

// Usage:
const toNumber = number;
sendOTP(toNumber);
console.log("OTP Sent Successfully");


res.render('user/sendOtp',{user:true,otp,number})
       
    }else{
      let errorss = "Please Enter Valid Number "
      res.render('user/otpLogin',{user:true,errorss})
    }
  }

})