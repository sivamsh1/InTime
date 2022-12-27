var express = require('express');
var router = express.Router();
const bcrypt = require("bcrypt");
const { getDb } = require('../db');
const { ObjectId } = require('mongodb');
const jwt = require("jsonwebtoken")
const multer = require('multer')
const path = require('path')
const cloudinary=require('../utils/cloudinary')
const productHelpers = require('../helpers/product-helpers')

const storage = multer.diskStorage({
      destination: './public/uploads/',
      filename: function(req,file,cb){
      cb(null,file.fieldname+'-'+Date.now()+
      path.extname(file.originalname))}
    });
     
    const upload=multer({
      storage:storage
    });



router.get('/',(req,res,next)=>{ 
      res.render("admin/adminDashboard",{admin:true}) 
      })


router.route('/login')
      .get((req,res,next)=>{
      res.render("admin/adminlogin",{admin:true})  
      })

      .post(async(req,res,next)=>{
      const{email,password} = req.body
      const isUserValid = await getDb().collection('admin').findOne({email})
      if(isUserValid){
      const dbPassword = isUserValid.password;
      const isPasswordCorrect = (password==dbPassword)
      console.log(isPasswordCorrect);
      if( isPasswordCorrect ){
            res.json({
                  status:200,
                  message:"success"
            })
      }else{
            res.json({
                  status:200,
                  message:"failed",
                  errorr:"Invalid Credentials"

            })
             
      }}else{
            res.json({
                  status:200,
                  message:"failed",
                  errorr:"Invalid Credentials"
            })
      }         
      })


router.route('/Users')
      .get(async(req,res,next)=>{
      const users = await getDb().collection('users').find().toArray();
      res.render("admin/adminUsers",{admin:true,users}); 
       })

       // Block Route
router.route("/userBlock/:id")
      .get(async(req,res,next)=>{
      const userId = req.params.id;
      const user = await getDb().collection('users').updateOne({_id:ObjectId(userId)},{$set:{isValid:false}});
      res.redirect("/admin/Users");
       })

      // Unblock Route
router.route("/userUnBlock/:id")
      .get(async(req,res,next)=>{
      const userId = req.params.id;
      const user = await getDb().collection('users').updateOne({_id:ObjectId(userId)},{$set:{isValid:true}});
      res.redirect("/admin/Users");
       })         

      //Product page
router.route('/product')
.get(async(req,res)=>{
  const Product =  await getDb().collection('products').find().toArray();
 res.render('admin/adminProduct',{admin :true,Product})                
 })

 .post(async(req,res)=>{
      const{name,category,price,brand,image} = req.body
      const isExistProduct = await getDb().collection('products').findOne({name})
if (isExistProduct){
      res.json({
            status : 200,
            message:"failed",
            errorr:"Product Already Exist"
          })
            
            }else{
                await getDb().collection('products').updateOne({name:name},{$set:{name,category,price,brand,image}})
        res.json({
                  status : 200,
                  message:"success",
                  errorr:null,
                })
                      

            }

        }) 
   



router.route('/category')
      .get(async(req,res)=>{
        const categoryDatas =  await getDb().collection('category').find().toArray()
       console.log(categoryDatas);
            res.render('admin/adminCategory',{admin:true,categoryDatas})
      })

      .post(async(req,res)=>{
            console.log(req.body);

            let {name,description}=req.body
            const dbEmail = await getDb().collection('category').findOne({name})
            console.log("post");
            if(dbEmail==null)
            { 
              //Data Insertion
              await getDb().collection('category').insertOne({ name , description})
              const category =  await getDb().collection('category').findOne({name})
              const categoryId = category._id;
      
               //Token creation
               const token = jwt.sign({categoryId }, process.env.JWT_SECRET, {
                expiresIn:"1d",});
              //storing in cookies
                res.cookie("userjwt", token, {
                httpOnly: true,
                sameSite: "lax",
                secure: false,
                maxAge: 24 * 60 * 60 * 1000,});
      
              res.json({
                        status : 200,
                        message:"success",
                        errorr:null,
                      })
              }else{
                  res.json({
                  status : 200,
                  message : "failed",
                  errorr:"Category Exist"
      
                })}
      
              }) 
      
              // User Logout
                  router.get('/logout',(req,res)=>{
                  res.cookie('userjwt','loggedout',{
                    maxAge:1,
                    httpOnly:true
                  })
                  res.redirect('/login')

      })

      // Delete category

      router.route('/cdelete/:id')
        .get(async(req,res)=>{
              const userId = req.params.id; 
              await getDb().collection('category').deleteOne({_id: ObjectId(userId)})
            res.redirect('/admin/ategory')
        })



      //Add product

        router.route('/addproduct')
        .get(async(req,res)=>{
        const categoryDatas =  await getDb().collection('category').find().toArray()      
         res.render('admin/adminAddProduct',{admin:true,categoryDatas})
        })
        .post(upload.array('image',1),async(req,res)=>{
            try{
                  

            let {name,category,price,brand} =req.body
            price = Number(price);


             console.log(category);
                  const {url:images} = await cloudinary.uploader.upload(req.files[0].path)
                  await getDb().collection('products').insertOne({name,category,price,brand,images})
                  
                  res.redirect('/admin/product')
            }catch(err){
                  console.log(err);
            }
        })


        router.route('/deleteproduct/:id')
              .get(async(req,res)=>{
                  const productId = req.params.id; 
                  await getDb().collection('products').deleteOne({_id: ObjectId(productId)})
                res.redirect('/admin/product')
                  
              })

       router.route('/editproduct/:id')
               .get(async(req,res)=>{
                const  ProductId = req.params.id
               const Product=await getDb().collection('products').findOne({_id: ObjectId(ProductId)}) 
               const categoryDatas =  await getDb().collection('category').find().toArray()

               res.render('admin/editProduct',{admin:true,Product,categoryDatas})
            })
              
               router.post('/editproduct/:id',upload.array('image',1),async(req,res)=>{
                  const productId = req.params.id;
                  const {name,category,price,brand,image} =req.body
                  const product=await getDb().collection('products').findOne({_id: ObjectId(productId)})
                  console.log(req.files);
                  if(name==product.name && category==product.category && price==product.price && brand==product.brand && image == product.images)
                  {
                        console.log("if condition");
                        const Product=await getDb().collection('products').findOne({_id: ObjectId(productId)}) 
                        const categoryDatas =  await getDb().collection('category').find().toArray()
                        const errorr = "This details already exist"
                          res.render('editProduct',{admin:true,Product,categoryDatas,errorr})    
                  }else{
                     
                  await getDb().collection('products').updateOne({_id: ObjectId(productId)},{$set:{name,category,price,brand,image}})
                  res.redirect('/admin/product')
                         
                  }
               })



// Admin Orders


router.route('/orders')
      .get(async(req,res)=>{
       const categoryDatas =  await getDb().collection('category').find().toArray()
       const orders = await getDb().collection('orders').find().toArray()
       console.log(orders);
            res.render('admin/adminorders',{admin:true,categoryDatas,orders})
      })


      
//cancell order list
router.get('/cancellorders/:id',async(req,res)=>{
      const orderId = req.params.id
      const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;
      await getDb().collection('orders').updateOne({_id:ObjectId(orderId)},{$set:{status:"cancelled"}})
      res.redirect('/orders')
    })


    
//View order list
router.get('/vieworders/:id',async(req,res)=>{
      const orderId = req.params.id 
      const orders= await getDb().collection('orders').findOne({_id:ObjectId(orderId)})
     
      const orderProducts = await getDb().collection('orders').aggregate([
       {
         $match: { _id: ObjectId(orderId) }
       },
       {
         $unwind: '$products'
       },
       {
         $project: { 
           item: '$products.item',
           quantity: '$products.quantity'
         }
       },
       {
         $lookup: {   
           from: 'products',
           localField: "item",
           foreignField: '_id',
           as: 'product'
         }
       },{
         $project:{
           item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
         }
       }
       
     
     ]).toArray()
        
     res.render('admin/adminorderProducts',{admin:true,orderProducts})
     
     })
     
    



              

module.exports = router;