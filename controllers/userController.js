const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const { getDb } = require('../db');
const jwt = require("jsonwebtoken")
const multer = require("multer")
const { ObjectId } = require('mongodb');
const paypal = require('paypal-rest-sdk');
const { checkout } = require('../routes/users');
const { config } = require('dotenv');
paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': 'AUFHI7HTEu0_5eU0l5A8liBeOvo2VdZk8bpxEimqZBctwFb1_B3DOfrKEwStiS1E3FGCZofjlU0PDaXk',
  'client_secret': 'EKSfRdbLkmXABaadk1pO6zRq3YHsZcaOok0-AcF0LuBYQ33cGIzOs8A5SQe3ixJ8jSBCs391AXwtklnc'
});

    

module.exports = ({
  renderHomepage: async (req, res, next) => {
    if (req.cookies.userjwt) {
      cookie = true;
    } else {
      cookie = false;
    }
    const category = await getDb().collection('category').find().toArray()

    const Product = await getDb().collection('products').find().toArray()
    let listedProducts = Product.filter((pro) => {
      return pro.listed == true;
    })

    res.render("user/index", { user: true, category, cookie,listedProducts })
  },

  userLogin: (req, res, next) => {
    res.render('user/Login', { user: true })
  },

  renderSignupPage: (req, res, next) => {
    res.render('user/signup', { user: true })
  },


  userLogout: (req, res) => {
    res.cookie('userjwt', 'loggedout', {
      maxAge: 1,
      httpOnly: true
    })
    res.redirect('/login')
  },

  renderProductPage: async (req, res) => {
    const category = await getDb().collection('category').find().toArray()  
    const Product = await getDb().collection('products').find().toArray()
    let listedProducts = Product.filter((pro) => {
      return pro.listed == true;
    })

    console.log(listedProducts);

    res.render('user/allProducts', { user: true, listedProducts, category })
  },

  renderCartPage: async (req, res) => {
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
          },
          {
            $project: {
              item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
            }
          }

        ]).toArray()

    // console.log(cartItems)
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
          }, {
            $project: {
              item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ["$quantity", "$product.offerPrice"] } }
            }
          }


        ]).toArray()


        let totalAmount = total.length == 0 ? 00 : total[0].total



     let cartItemsWithSubTotal = cartItems.map((elements)=>{
      elements.subTotal =  elements.quantity * elements.product.offerPrice
      return elements
     })

        res.render('user/cart', { user: true, category, cartItemsWithSubTotal, totalAmount,})
      } else {
        res.render('user/cart', { user: true, category })
      }
    } else {
      res.send('cart Not exist')
    }
  },

  renderPrductDetailPage: async (req, res) => {
    const userid = req.params.id
    const category = await getDb().collection('category').find().toArray()
    const product = await getDb().collection('products').findOne({ _id: ObjectId(userid) })
    res.render('user/productDetail', { user: true, category, product })
  },

  renderCheckoutPage: async (req, res) => {
 
    const category = await getDb().collection('category').find().toArray()
    const product = await getDb().collection('products').findOne()
    const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;
    const user = await getDb().collection('users').findOne({ _id: ObjectId(userId) })


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
      }, {
        $project: {
          item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
        }
      }, {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ["$quantity", "$product.price"] } }
        }
      }


    ]).toArray()

    let totalAmount = total.length == 0 ? 00 : total[0].total

    let Address = user.address
    

    res.render('user/checkout', { user: true, user, category, product, totalAmount, userId,Address })
  },

  renderWishlist: async (req, res) => {
    const category = await getDb().collection('category').find().toArray()
    const product = await getDb().collection('products').findOne()

    res.render('user/wishlist', { user: true, category, product })
  },

  addToCart: async (req, res) => {

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
          await getDb().collection('cart').updateOne({ userId: ObjectId(userId), 'products.item': ObjectId(productId) },
            {
              $inc: { 'products.$.quantity': 1 }
            }
          )

          res.json({
            status: 200,
            message: "success"
          })

        } else {
          await getDb().collection('cart').updateOne({ userId: ObjectId(userId) }, { $push: { products: proObj } })
          res.json({
            status: 200,
            message: "success"
          })

        }


      } else {
        let cartobj = {
          userId: ObjectId(userId),
          products: [proObj]
        }
        await getDb().collection('cart').insertOne(cartobj);
        res.json = ({
          message: "success"
        })

      }
    } else {
      res.json({
        status: 200,
        message: "failed"
      })
    }
  },

  changeProductQuantity: async (req, res) => {
    let { cartId, productId, count, quantity ,subTotal} = req.body
    subTotal = parseInt(subTotal)
    count = parseInt(count)
    quantity = parseInt(quantity)
     
    console.log(count, quantity,subTotal);
    if (count == -1 && quantity == 1) {
      await getDb().collection('cart').updateOne({ _id: ObjectId(cartId) },
        {
          $pull: { products: { item: ObjectId(productId) } }
        })
      res.json({
        status: 200,
        message: "deleted",
        count: count
      })


    } else {
      await getDb().collection('cart').updateOne({ _id: ObjectId(cartId), 'products.item': ObjectId(productId) }, {
        $inc: { 'products.$.quantity': count }
      })
    
       
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
        }, {
          $project: {
            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ["$quantity", "$product.offerPrice"] } },
        
          }
        }


      ]).toArray()
 
       console.log(total);

      let totalAmount = total.length == 0 ? 00 : total[0].total



  console.log(count, quantity);



 let qty = count + quantity 

 const Product = await getDb().collection('products').findOne({ _id: ObjectId(productId) })
 const price = Product.price
 if(count==1){

  subTotal = subTotal +price
 }else{
  subTotal = subTotal-price
 }
  
      res.json({
        status: 200,
        message: "success",
        count: count,
        totalAmount:totalAmount,
        quantity:quantity,
        qty:qty,
        subTotal:subTotal
      })
    }
  },

  removeItemFromCart: async (req, res) => {
    const { cartId, productId } = req.body
    await getDb().collection('cart').updateOne({ _id: ObjectId(cartId) },
      {
        $pull: { products: { item: ObjectId(productId) } }
      })
    res.json({
      status: 200,
      message: "success"
    })
  },

  renderSuccesPage: (req, res) => {
    res.render('user/confirm');
  },

  checkoutSubmit: async (req, res) => {
    const {  name, address, phone, pin,  } = req.body;
    const order = req.body
    
     let AddressId = order.addressId
      const PaymentMethod =  order.Paymentmethod
     
      const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;

     if (AddressId && PaymentMethod){

   
    const User = await getDb().collection('users').aggregate([
      {
        '$match': {
          '_id': new ObjectId(userId)
        }
      }, {
        '$unwind': {
          'path': '$address'
        }
      }, {
        '$project': {
          'address': 1, 
          '_id': 0
        }
      }, {
        '$match': {
          'address.id': new ObjectId(AddressId)
        }
      }
    ]).toArray()
    
    const Address = User[0].address


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
      }, {
        $project: {
          item: 1, quantity: 1, _id: 0
        }
      }


    ]).toArray()

    console.log(products);

    let totalAmount = order.totalAmount
    totalAmount = parseInt(totalAmount)
    // let status =  order.Paymentmethod==="COD"?'placed':'Pending'
    let status = 'Placed'
    // creating order Object    
    let orderObj = {
      deliveryDetails: {
        phone: Address.phone,
        address: Address.Address,
        pincode: Address.pin,
      },
      userId: ObjectId(userId),
      PaymentMethod: order.Paymentmethod,
      products: products,
      status: status,
      totalAmount: totalAmount,
      date: new Date().toDateString(),
      detailedDate: new Date()

    }

    //Ading items to order collection
    await getDb().collection('orders').insertOne(orderObj)
    //Ading address to users list

    const userlist = await getDb().collection('users').updateOne({ _id: ObjectId(userId) }, { $set: { Address: { name: name, address: address, phone: phone, pincode: pin } } })

    //removing Items From cart
    await getDb().collection('cart').deleteOne({ userId: ObjectId(userId) })

    //Checking the payment methods

    if (order.Paymentmethod == "COD") {
      res.redirect('/successpage')
    } else if (order.Paymentmethod == "Paypal") {
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
              "name": "InTime Watches",
              "sku": "001",
              "price": totalAmount,
              "currency": "RS",
              "quantity": 1
            }]
          },
          "amount": {
            "currency": "USD",
            "total": "25.00"
          },
          "description": "Watch"
        }]
      }


      paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
          throw error;
        } else {
          for (let i = 0; i < payment.links.length; i++) {
            if (payment.links[i].rel === 'approval_url') {
              res.redirect(payment.links[i].href);
            }
          }
        }
      });
    }else if(order.Paymentmethod == "stripe"){

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripePublicKey = process.env.STRIPE_PUBLIC_KEY
///////////////////////////////


const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

let stripeTotalamount = orderObj.totalAmount

let  items =  [
  { id: 1, quantity: 1,priceInCent: stripeTotalamount,name: "InTime Product" },
]

try {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: items.map(item => {
      return {
        price_data: {
          currency: "inr",
          product_data: {
            name:item.name,
          },
          unit_amount:item.priceInCents,
        },
        quantity: item.quantity,
      }
    }),
    success_url: `http://localhost:5000/successpage`,
    cancel_url: `http://localhost:5000`,

  })
  res.redirect(session.url)
} catch (e) {
  res.status(500).json({ error: e.message })
}

    


///////////////////////////////////////////////////////////
      
    }


 }else{
  res.redirect('/checkOut')
 } },

  paypalSucces: (req, res) => {
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
  },
 
  renderViewOrders: async (req, res) => {
    const orderId = req.params.id
    const orders = await getDb().collection('orders').findOne({ _id: ObjectId(orderId) })
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
      }, {
        $project: {
          item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
        }
      }


    ]).toArray()                                             

    const category = await getDb().collection('category').find().sort({"date":1}).toArray()
    res.render('user/orderProducts', { user: true, orderProducts, category })

  },

  cancellOrder: async (req, res) => {
    const orderId = req.params.id
    const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;
    await getDb().collection('orders').updateOne({ _id: ObjectId(orderId) }, { $set: { status: "cancelled" } })
    res.redirect('/confirmedOrders')
  },
  
  retunOrders: async(req,res)=>{
    const orderId = req.params.id
     const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;
    
     await getDb().collection('orders').updateOne({ _id: ObjectId(orderId) }, { $set: { status: "returned" } })
      const order = await getDb().collection('orders').findOne({_id: ObjectId(orderId)})
     const totalAmount = order.totalAmount;
     const user = await getDb().collection('users').findOne({_id: ObjectId(userId)})
     let walletAmount = user.wallet;
     walletAmount = walletAmount+totalAmount
     const updation = await getDb().collection('users').updateOne({_id:ObjectId(userId)},{$set:{wallet:walletAmount}})
     console.log(updation);
     res.redirect('/confirmedOrders')

    },  

  renderConfirmPage: async (req, res) => {

    const orders = await getDb().collection('orders').find().sort({ "detailedDate": -1 }).toArray()
    res.render('user/confirmedOrderList', { user: true, orders });
  },

  renderCategoryPage: async (req, res) => {
    const categoryname = req.params.category
    const Product = await getDb().collection('products').find({ category: categoryname }).toArray()
    const category = await getDb().collection('category').find().toArray()
    const offerPrice = Product.offerPrice
    console.log(Product);
    res.render('user/category', { user: true, Product, category,offerPrice})
  },

  renderUserProfile: async (req, res) => {
    const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;
    const currentUser = await getDb().collection('users').findOne({ _id: ObjectId(userId) })
    res.render('user/userProfile', { currentUser })
  },
  editUserProfile: async (req, res) => {
    let { currentPassword, newPassword } = req.body;
    const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;
    const user = await getDb().collection('users').findOne({ _id: ObjectId(userId) })
    const dbPassword = user.password;

    const isPasswordCorrect = await bcrypt.compare(currentPassword, dbPassword)
    if (isPasswordCorrect) {

      let password = await bcrypt.hash(newPassword, 8)
      let updation = await getDb().collection('users').updateOne({ _id: ObjectId(userId) }, { $set: { password: password } })
      res.json({
        status: 200,
        message: 'success',
      })

    } else {
      res.json({
        status: 404,
        message: "failled",
        error: "Incorrect Password"

      })
    }


  },

  couponAdding: async (req, res) => {
    let { coupon } = req.body
    coupon = coupon.toUpperCase()
    console.log(coupon);
    const existCoupon = await getDb().collection('coupons').findOne({ name: coupon })
    if(existCoupon){

    let validDate = existCoupon.expiryDate > new Date().toISOString()




    if (existCoupon || validDate) {



      const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;

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
        }, {
          $project: {
            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ["$quantity", "$product.price"] } }
          }
        }


      ]).toArray()


      let totalAmount = total.length == 0 ? 00 : total[0].total



      let offer = existCoupon.discount
      offerAmount = totalAmount * (offer / 100)
      let validAmount = existCoupon.MaxAmount >= offerAmount
      let minAmount = totalAmount >= existCoupon.minAmount
   
   
if (minAmount){

      if (validAmount) {


        const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;

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
          }, {
            $project: {
              item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ["$quantity", "$product.price"] } }
            }
          }


        ]).toArray()


        let totalAmount = total.length == 0 ? 00 : total[0].total



        let offer = existCoupon.discount
        offerAmount = totalAmount * (offer / 100)
        let Grandtotal = totalAmount - offerAmount

        // let cartExist = await getDb().collection('cart').findOne({ userId: ObjectId(userId) })  


        res.json({
          status: 200,
          message: 'success',
          total: Grandtotal
        })

      } else {

        const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;

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
          }, {
            $project: {
              item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ["$quantity", "$product.price"] } }
            }
          }


        ]).toArray()


        let totalAmount = total.length == 0 ? 00 : total[0].total



        let offer = existCoupon.discount
        offerAmount = totalAmount * (offer / 100)
        let Grandtotal = totalAmount - existCoupon.MaxAmount

        // let cartExist = await getDb().collection('cart').findOne({ userId: ObjectId(userId) })  


        res.json({
          status: 200,
          message: 'success',
          total: Grandtotal
        })


      }


    }else{
      res.json({
        status: 404,
        message: "failed",
        error: `Coupon is only valid for above ${ existCoupon.minAmount}  Purchases `
      })

    }      


    } else {
      res.json({
        status: 404,
        message: "failed",
        error: "Coupon is not vaild"
      })
    }

    }else{
      res.json({
        status: 404,
        message: "failed",
        error: "Coupon is not vaild"
      })
    }

  },
  otpNumberVerification : async (req,res)=>{
    let {number} = req.body

    let isExistNumber = await getDb().collection('users').findOne({number:number })
   
    if(isExistNumber){

      const accountSid = "AC0e70c9e8e3caa07ed6329cccf0acf716";
      const authToken = "fb457e6b81e7ddb2ddc86780f2b119c4";
      const client = require("twilio")(accountSid, authToken);
      

// Function to generate a random OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

// Function to send the OTP via SMS
async function sendOTP(toNumber) {
  const otp = generateOTP();
  console.log(otp);

    const accountSid = "AC0e70c9e8e3caa07ed6329cccf0acf716";
    const authToken = "bd77f71d6db860983ce0fa9042529538";
    const client = require("twilio")(accountSid, authToken);
    
    client.messages
      .create({ body: `Your OTP is ${otp}`, from: "+13148974734", to:`+91${number}`})
      .then(message => console.log(message.sid));

}

// Usage:
const toNumber = '+919744707392';
sendOTP(toNumber);
console.log("OTP Sent Successfully");


    
    }else{
      res.json({
        status:404,
        message:"failed",
        error:"Please Enter Valid Phone Number"
      })
    }

  },
  renderSendOtpPage:  async (req,res)=>{
    res.render('user/sendOtp',{user:true})
},
otpVerification : async (req,res)=>{
let {enteredOtp,phone,SendedOtp} = req.body 
enteredOtp = parseInt(enteredOtp)
SendedOtp = parseInt(SendedOtp)


if(SendedOtp === enteredOtp){

  const user = await getDb().collection('users').findOne({number:phone })

  const userId = user._id 
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
    status:200,
    message:"success"
  })
}else{
  res.json({
    status:404,
    message:"failed",
    error:"OTP is incorrect"
  })
}


},addAddress: async (req,res)=>{
    
  const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;

let {name,address,phone,pin} = req.body

 let Address = {
  name:name,
  Address:address,
  phone:phone,
  pin:pin,
  id:ObjectId()
 }
  console.log(Address);

   let updation = await getDb().collection('users').updateOne({ _id: ObjectId(userId) },{ 
    $push:{address:Address}
   })
console.log(updation);
 
res.redirect('/checkOut')

},


})








