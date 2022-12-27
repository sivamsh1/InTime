const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const { getDb } = require('../db');
const jwt = require("jsonwebtoken")
const { authentication, authentcation2 } = require("../Authentication")
const multer = require("multer")
const databaseHelpers = require('../helpers/database-helpers');
const { ObjectId } = require('mongodb');
const paypal = require('paypal-rest-sdk');

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': 'AUFHI7HTEu0_5eU0l5A8liBeOvo2VdZk8bpxEimqZBctwFb1_B3DOfrKEwStiS1E3FGCZofjlU0PDaXk',
  'client_secret': 'EKSfRdbLkmXABaadk1pO6zRq3YHsZcaOok0-AcF0LuBYQ33cGIzOs8A5SQe3ixJ8jSBCs391AXwtklnc'
});



// Home page
router.route('/')
  .get(async (req, res, next) => {
    if (req.cookies.userjwt) {
      cookie = true;
    } else {
      cookie = false;
    }
    const category = await getDb().collection('category').find().toArray()
    res.render("user/index", { user: true, category, cookie })
  })


// Login Page
router.route('/login')
  .get(authentcation2, (req, res, next) => {
    res.render('user/Login', { user: true })
  })


  .post(async (req, res, next) => {
    let { email, password } = req.body;
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
  });


// Signup
router.route('/signup')
  .get((req, res, next) => {
    res.render('user/signup', { user: true })
  })


  .post(async (req, res, next) => {
    let { name, email, number, password } = req.body
    const dbEmail = await getDb().collection('users').findOne({ email })
    if (dbEmail == null) {
      //Data Insertion
      let isValid = true;
      password = await bcrypt.hash(password, 8)
      await getDb().collection('users').insertOne({ name, email, password, number, isValid })
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

  })

// User Logout
router.get('/logout', (req, res) => {
  res.cookie('userjwt', 'loggedout', {
    maxAge: 1,
    httpOnly: true
  })
  res.redirect('/login')
})


//Product page
router.route('/allProducts')
  .get(async (req, res) => {
    const Product = await getDb().collection('products').find().toArray()
    const category = await getDb().collection('category').find().toArray()

    res.render('user/allProducts', { user: true, Product, category })
  })




//Cart route
router.route('/cart')
  .get(async (req, res) => {
    const category = await getDb().collection('category').find().toArray()
    if (req.cookies.userjwt) {
      const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;
      let cartExist = await getDb().collection('cart').findOne({ userId: ObjectId(userId) })
      if (cartExist) {
        const cartItems = await getDb().collection('cart').aggregate([
          {
            $match: { userId: ObjectId(userId) }
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
        
      // Total Amount
        const total = await getDb().collection('cart').aggregate([
          {
            $match: { userId: ObjectId(userId) }
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
          },{
            $group:{
              _id:null,
              total:{$sum:{$multiply:["$quantity","$product.price"]}}
            }
          }
          

        ]).toArray()
       let totalAmount= total.length==0? 00 : total[0].total

    
     

        res.render('user/cart', { user: true, category,cartItems,totalAmount })
      } else {
        res.render('user/cart', { user: true, category })
      }
    } else {
      res.send('cart Not exist')
    }
  })

  .post((req, res) => {
  })


//Product detail route
router.route('/productdetails/:id')
  .get(async (req, res) => {
    const userid = req.params.id
    const category = await getDb().collection('category').find().toArray()
    const product = await getDb().collection('products').findOne({ _id: ObjectId(userid) })
    res.render('user/productDetail', { user: true, category, product })
  })



//Checkout route
router.route('/checkout')
  .get(async (req, res) => {
    
    const category = await getDb().collection('category').find().toArray()
    const product = await getDb().collection('products').findOne() 
    
    const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;
    
        const total = await getDb().collection('cart').aggregate([
          {
            $match: { userId: ObjectId(userId) }
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
          },{
            $group:{
              _id:null,
              total:{$sum:{$multiply:["$quantity","$product.price"]}}
            }
          }
                

        ]).toArray()

        let totalAmount= total.length==0? 00 : total[0].total
           

    res.render('user/checkout', { user: true, category, product,totalAmount,userId })
  })




//Wishlist route
router.route('/wishlist')
  .get(async (req, res) => {
    const category = await getDb().collection('category').find().toArray()
    const product = await getDb().collection('products').findOne()

    res.render('user/wishlist', { user: true, category, product })
  })





//Addto cart Axios route
router.post('/addtocart/:id', async (req, res) => {


  const productId = req.params.id
  if (req.cookies.userjwt) {
    const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;
    let cart = await getDb().collection('cart').findOne({ userId: ObjectId(userId) })
    let proObj = {
      item: ObjectId(productId),
      quantity: 1,
    }
    if (cart) {

      let proExist = cart.products.findIndex(product => product.item == productId)
      if (proExist != -1) {
        await getDb().collection('cart').updateOne({ userId:ObjectId(userId), 'products.item': ObjectId(productId) },
         {
          $inc: {'products.$.quantity' : 1 }
        }
        )

        res.json({
          status:200,
          message: "success"
        })

      } else {
        await getDb().collection('cart').updateOne({ userId: ObjectId(userId) }, { $push: { products: proObj } })
        res.json({
          status:200,
          message: "success"
        })

      }


    } else {
      let cartobj = {
        userId: ObjectId(userId),
        products: [proObj]
      }
      await getDb().collection('cart').insertOne(cartobj);
      res.json =({
        message: "success"
      })

    }
  } else {
    res.json({
      status:200,
      message: "failed"
    })
  }
})


// Axios changeProductQuantity of item from cart
router.post('/changeProductQuantity',async(req,res)=>{
  const {cartId,productId,count,quantity} = req.body
  console.log(count,quantity);
  if(count==-1 && quantity==1){
    await getDb().collection('cart').updateOne({_id:ObjectId(cartId)},
    {   
      $pull:{products:{item:ObjectId(productId)}}
    })
    res.json({
      status: 200,
      message: "deleted",
      count:count
    })


  }else{
  await getDb().collection('cart').updateOne({_id:ObjectId(cartId), 'products.item': ObjectId(productId) }, {
    $inc: {'products.$.quantity': count }
  })
  res.json({
    status: 200,
    message: "success",
    count:count
  })
}
})


router.post('/removeItem',async(req,res)=>{
  const{cartId,productId} = req.body
  await getDb().collection('cart').updateOne({_id:ObjectId(cartId)},
    {
      $pull:{products:{item:ObjectId(productId)}}
    })
    res.json({
      status:200,
      message:"success"
    })
})


//Confirm Order

router.get('/successpage',(req,res)=>{
    res.render('user/confirm');
})





router.get('/confirmedOrders',async(req,res)=>{

  const orders=  await getDb().collection('orders').find().toArray()
   console.log(orders);
    res.render('user/confirmedOrderList',{user:true,orders});
})


//////////////////////////////////////////////////////////////////////////////////////////
// checkout Form  route
router.post('/checkoutsubmit', async (req,res)=>{
  const{coupen,name,address,email,phone,pin,userId}=req.body;
   const order = req.body
   console.log(order);

  //Taking the product array same as in the cart 
  const products = await getDb().collection('cart').aggregate([
    {
      $match: { userId: ObjectId(userId) }
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
        item:1,quantity:1,_id:0
      }
    } 
    

  ]).toArray()
  let status =  order.Paymentmethod==="COD"?'placed':'Pending'
  // creating order Object    
  let orderObj={
      deliveryDetails:{
        phone:order.phone,
        address:order.address,
        pincode:order.pin,

      },
      userId:ObjectId(userId),
      PaymentMethod:order.Paymentmethod,
      products:products,
      status:status,
      totalAmount:order.totalAmount,
      date: new Date()

  }
  //Ading items to order collection
  await getDb().collection('orders').insertOne(orderObj)
//removing Items From cart
 await getDb().collection('cart').deleteOne({userId:ObjectId(userId)})
  
//Checking the payment methods

 if(order.Paymentmethod=="COD"){
res.redirect('/successpage')
}else if(order.Paymentmethod=="Paypal"){
  //Paypal Integration
  const create_payment_json = {
    "intent": "sale",
    "payer": {
        "payment_method": "paypal"
    },
    "redirect_urls": {
        "return_url": "http://localhost:5000/success",
        "cancel_url": "http://localhost:3000/cancel"
    },
    "transactions": [{
        "item_list": {
            "items": [{
                "name": "Redhock Bar Soap",
                "sku": "001",
                "price": "25.00",
                "currency": "USD",
                "quantity": 1
            }]
        },
        "amount": {
            "currency": "USD",
            "total": "25.00"
        },
        "description": "Washing Bar soap"
    }]
  }

  
paypal.payment.create(create_payment_json, function (error, payment) {
  if (error) {
      throw error;
  } else {
      for(let i = 0;i < payment.links.length;i++){
        if(payment.links[i].rel === 'approval_url'){
          res.redirect(payment.links[i].href);
        }
      }  
  }
});}


});
///////////////////////////////////////////////////////////////////

//Paypal Success

router.get('/success', (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
        "amount": {
            "currency": "USD",
            "total": "25.00"
        }
    }]
  };

// Obtains the transaction details from paypal
  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
      //When error occurs when due to non-existent transaction, throw an error else log the transaction details in the console then send a Success string reposponse to the user.
    if (error) {
        console.log(error.response);
        throw error;
    } else {
        console.log(JSON.stringify(payment));
        res.redirect('/successpage');
    }
});
});



//////////////////////////////////////////////////////////////////////

//View order list
router.get('/vieworders/:id',async(req,res)=>{
 const orderId = req.params.id 
 const orders= await getDb().collection('orders').findOne({_id:ObjectId(orderId)})
 console.log(orders.products);

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
   
const category = await getDb().collection('category').find().toArray()
res.render('user/orderProducts',{user:true,orderProducts,category})

})



//cancell order list
router.get('/cancellorders/:id',async(req,res)=>{
  const orderId = req.params.id
  const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;
  await getDb().collection('orders').updateOne({_id:ObjectId(orderId)},{$set:{status:"cancelled"}})
  res.redirect('/confirmedOrders')
})










module.exports = router;      