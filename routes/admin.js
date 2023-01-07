var express = require('express');
var router = express.Router();
const bcrypt = require("bcrypt");
const { getDb } = require('../db');
const { ObjectId } = require('mongodb');
const jwt = require("jsonwebtoken")
const multer = require('multer')
const path = require('path')
const cloudinary = require('../utils/cloudinary')
const productHelpers = require('../helpers/product-helpers');
const { order } = require('paypal-rest-sdk');

const storage = multer.diskStorage({
      destination: './public/uploads/',
      filename: function (req, file, cb) {
            cb(null, file.fieldname + '-' + Date.now() +
                  path.extname(file.originalname))
      }
});

const upload = multer({
      storage: storage
});



router.get('/', async (req, res, next) => {

      const TotalUsers = await getDb().collection('users').find().count()
      const TotalProducts = await getDb().collection('products').find().count()
      const TodaySales = await getDb().collection('orders').find({ date: new Date().toDateString() }).count()
      let TotalRevenue = await getDb().collection('orders').aggregate([{
            "$group": {
                  "_id": null,
                  "totalAmount": { "$sum": "$totalAmount" }
            }
      }]).toArray()
      TotalRevenue = TotalRevenue[0].totalAmount


      const totalCOD = await getDb().collection('orders').find({ PaymentMethod: "COD" }).count()
      const totalPAYPAL = await getDb().collection('orders').find({ PaymentMethod: "Paypal" }).count()
      const totalRAZORPAY = await getDb().collection('orders').find({ PaymentMethod: "Razorpay" }).count()
      const orderStatus = [totalCOD, totalPAYPAL, totalRAZORPAY]
      console.log(orderStatus);


      const totalCancelled = await getDb().collection('orders').find({ status: "cancelled" }).count()
      const totalDeliered = await getDb().collection('orders').find({ status: "delivered" }).count()
      const totalPlaced = await getDb().collection('orders').find({ status: "Placed" }).count()
      const statusArray = [totalCancelled, totalDeliered, totalPlaced]
      console.log(statusArray);


      res.render("admin/adminDashboard", { admin: true, TotalUsers, TotalProducts, TodaySales, TotalRevenue, orderStatus, statusArray })
})


router.route('/login')
      .get((req, res, next) => {
            res.render("admin/adminlogin", { admin: true })
      })

      .post(async (req, res, next) => {
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
      })


router.route('/Users')
      .get(async (req, res, next) => {
            const users = await getDb().collection('users').find().toArray();
            res.render("admin/adminUsers", { admin: true, users });
      })

// Block Route
router.route("/userBlock/:id")
      .get(async (req, res, next) => {
            const userId = req.params.id;
            const user = await getDb().collection('users').updateOne({ _id: ObjectId(userId) }, { $set: { isValid: false } });
            res.redirect("/admin/Users");
      })

// Unblock Route
router.route("/userUnBlock/:id")
      .get(async (req, res, next) => {
            const userId = req.params.id;
            const user = await getDb().collection('users').updateOne({ _id: ObjectId(userId) }, { $set: { isValid: true } });
            res.redirect("/admin/Users");
      })

//Product page
router.route('/product')
      .get(async (req, res) => {
            const Product = await getDb().collection('products').find().toArray();
            res.render('admin/adminProduct', { admin: true, Product })
      })

      .post(async (req, res) => {
            const { name, category, price, brand, image } = req.body
            const isExistProduct = await getDb().collection('products').findOne({ name })
            if (isExistProduct) {
                  res.json({
                        status: 200,
                        message: "failed",
                        errorr: "Product Already Exist"
                  })

            } else {
                  await getDb().collection('products').updateOne({ name: name }, { $set: { name, category, price, brand, image } })
                  res.json({
                        status: 200,
                        message: "success",
                        errorr: null,
                  })


            }

      })


//Category Routes

router.route('/category')
      .get(async (req, res) => {
            const categoryDatas = await getDb().collection('category').find().toArray()
            console.log(categoryDatas);
            res.render('admin/adminCategory', { admin: true, categoryDatas })
      })

      .post(async (req, res) => {
            console.log(req.body);
            let { name, description } = req.body

            const isCollectionExist = await getDb().collection('category').findOne({ name: name })
            console.log(isCollectionExist);

            if (isCollectionExist) {
                  res.json({
                        status: 200,
                        message: "failed",
                        error: "Category Already Exist"

                  })
            } else {
                  //Data Insertion
                  const Insertion = await getDb().collection('category').insertOne({ name: name, description: description })
                  console.log(Insertion);
                  res.json({
                        status: 200,
                        message: "success",
                        errorr: null,
                  })
            }
      })

      .patch(async (req, res) => {
            console.log("okkkkkkkk");
            let { name, categoryId, description } = req.body;
            console.log(name, categoryId, description);
            // const user = await getDb().collection('category').updateOne({_id:ObjectId(userId)},{$set:{isValid:false}});


      })




// User Logout
router.get('/logout', (req, res) => {
      res.cookie('userjwt', 'loggedout', {
            maxAge: 1,
            httpOnly: true
      })
      res.redirect('/login')

})

// Delete category

router.route('/cdelete/:id')
      .get(async (req, res) => {
            const userId = req.params.id;
            await getDb().collection('category').deleteOne({ _id: ObjectId(userId) })
            res.redirect('/admin/category')
      })



//Add product

router.route('/addproduct')
      .get(async (req, res) => {
            const categoryDatas = await getDb().collection('category').find().toArray()
            res.render('admin/adminAddProduct', { admin: true, categoryDatas })
      })
      .post(upload.array('image', 1), async (req, res) => {

            try {
                  let { name, category, price, brand } = req.body
                  price = Number(price);

                  console.log(name, category, price, brand);
                  const { url: images } = await cloudinary.uploader.upload(req.files[0].path)
                  const categoryData = await getDb().collection('category').findOne({name:category})
                    if(categoryData.categoryOffer != 0 ){
                         let offer = categoryData.categoryOffer
                          let offerPrice = price * (offer/100) 
                          offerPrice= (price - offerPrice)
                        const insertion = await getDb().collection('products').insertOne({ name, category, price, brand, images, listed: true, offerPrice:offerPrice,productOffer:0,categoryOffer:offer,currentOffer:offer })

                    }else{
                  const insertion = await getDb().collection('products').insertOne({ name, category, price, brand, images, listed: true, offerPrice: price,productOffer:0,categoryOffer:0 ,currentoffer:0})
                    }


                  res.redirect('/admin/product')
            } catch (err) {
                  console.log(err);
            }
      })


router.route('/deleteproduct/:id')
      .get(async (req, res) => {
            const productId = req.params.id;
            await getDb().collection('products').deleteOne({ _id: ObjectId(productId) })
            res.redirect('/admin/product')

      })

router.route('/editproduct/:id')
      .get(async (req, res) => {
            const ProductId = req.params.id
            const Product = await getDb().collection('products').findOne({ _id: ObjectId(ProductId) })
            const categoryDatas = await getDb().collection('category').find().toArray()

            res.render('admin/editProduct', { admin: true, Product, categoryDatas })
      })

router.post('/editproduct/:id', upload.array('image', 1), async (req, res) => {
      const productId = req.params.id;
      const { name, category, price, brand, image } = req.body
      const product = await getDb().collection('products').findOne({ _id: ObjectId(productId) })
      console.log(req.files);
      if (name == product.name && category == product.category && price == product.price && brand == product.brand && image == product.images) {
            console.log("if condition");
            const Product = await getDb().collection('products').findOne({ _id: ObjectId(productId) })
            const categoryDatas = await getDb().collection('category').find().toArray()
            const errorr = "This details already exist"
            res.render('editProduct', { admin: true, Product, categoryDatas, errorr })
      } else {

            await getDb().collection('products').updateOne({ _id: ObjectId(productId) }, { $set: { name, category, price, brand, image } })
            res.redirect('/admin/product')

      }
})



// Admin Orders


router.route('/orders')
      .get(async (req, res) => {
            const categoryDatas = await getDb().collection('category').find().toArray()
            const orders = await getDb().collection('orders').find().toArray()
            res.render('admin/adminorders', { admin: true, categoryDatas, orders })
      })



//cancell order list
router.get('/cancellorders/:id', async (req, res) => {
      const orderId = req.params.id
      const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;
      await getDb().collection('orders').updateOne({ _id: ObjectId(orderId) }, { $set: { status: "cancelled" } })
      res.redirect('/admin/orders')
})



//View order list
router.get('/vieworders/:id', async (req, res) => {
      const orderId = req.params.id
      const orders = await getDb().collection('orders').findOne({ _id: ObjectId(orderId) })

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
                  $unwind: '$product'
            }



      ]).toArray()



      console.log(orderProducts);

      res.render('admin/adminorderProducts', { admin: true, orderProducts })
})





// Admin Report


router.route('/report')
      .get(async (req, res) => {
            const categoryDatas = await getDb().collection('category').find().toArray()
            const orders = await getDb().collection('orders').find().toArray()
            let userId = orders.userId

            let deliveredOrders = orders.filter((elements) => {
                  if (elements.status == 'delivered') {
                        return elements; a
                  }
            })

            res.render('admin/salesReport', { admin: true, categoryDatas, deliveredOrders })
      })



router.get('/editCategory/:id', async (req, res) => {

      const categoryId = req.params.id
      const category = await getDb().collection('category').findOne({ _id: ObjectId(categoryId) })
      console.log(category);
      res.render('admin/editCategory', { admin: true, category })
})

router.post('/editCategory', async (req, res) => {
      let { name, categoryId, description } = req.body
      const category = await getDb().collection('category').findOne({ _id: ObjectId(categoryId) })
      if (name == category.name && description == category.description) {
            res.json({
                  status: 404,
                  message: "failed",
                  error: "Details already Exist"
            })
      } else {

            const updation = await getDb().collection('category').updateOne({ _id: ObjectId(categoryId) }, { $set: { name: name, description: description } });
            console.log(updation);
            res.json({
                  status: 200,
                  message: 'success',

            })

      }
})



// Admin Brands  

router.route('/brand')
      .get(async (req, res) => {
            const BrandDatas = await getDb().collection('brand').find().toArray()
            console.log(BrandDatas);
            res.render('admin/brands', { admin: true, BrandDatas })
      })
      .post(async (req, res) => {
            let { name, description } = req.body
            const Brand = await getDb().collection('brand').findOne({ name: name })
            if (Brand) {
                  res.json({
                        status: 404,
                        message: "failed",
                        error: "Brand Already Exist"
                  })
            } else {
                  const Insertion = await getDb().collection('brand').insertOne({ name: name, description: description })
                  res.json({
                        status: 200,
                        message: "success",
                  })
            }
      })

//Brand Delete Route 

router.route('/Branddelete/:id')
      .get(async (req, res) => {
            const BrandId = req.params.id;
            await getDb().collection('brand').deleteOne({ _id: ObjectId(BrandId) })
            res.redirect('/admin/brand')
      })


//Edit Brands

router.route('/editBrand/:id')
      .get(async (req, res) => {
            const BrandId = req.params.id
            const Brand = await getDb().collection('brand').findOne({ _id: ObjectId(BrandId) })
            console.log(Brand);
            res.render('admin/editBrand', { admin: true, Brand })
      })


router.post('/editBrand', async (req, res) => {
      console.log(req.body);
      let { name, categoryId, description } = req.body
      const Brand = await getDb().collection('brand').findOne({ _id: ObjectId(categoryId) })
      console.log(Brand, name, description);
      if (Brand.name == name && Brand.description == description) {
            console.log("if Part");
            res.json({
                  status: 404,
                  message: "failled",
                  error: "Brand Already Exist"
            })
      } else {
            console.log("Else Part");
            const Brand = await getDb().collection('brand').updateOne({ _id: ObjectId(categoryId) }, { $set: { name: name, description: description } });
            console.log(Brand);
            res.json({
                  status: 200,
                  message: "success",
            })

      }
})

router.get('/listed/:id', async (req, res) => {
      const productId = req.params.id;
      console.log(productId);
      const Products = await getDb().collection('products').updateOne({ _id: ObjectId(productId) }, { $set: { listed: true } }, { upsert: true });
      res.redirect('/admin/product')
});



router.get('/unlisted/:id', async (req, res) => {
      const productId = req.params.id;
      const Products = await getDb().collection('products').updateOne({ _id: ObjectId(productId) }, { $set: { listed: false } }, { upsert: true });
      res.redirect('/admin/product')
});



router.post('/change-order-status/:id', async (req, res) => {
      console.log(req.body);
      const orderId = req.params.id;
      let { orderStatus } = req.body;
      console.log(orderStatus);
      if (orderStatus == 'delivered') {
            const updation = await getDb().collection('orders').updateOne({ _id: ObjectId(orderId) }, { $set: { status: orderStatus, deliverydate: new Date().toDateString() } })

      } else {
            const updation = await getDb().collection('orders').updateOne({ _id: ObjectId(orderId) }, { $set: { status: orderStatus, deliverydate: 'pending' } })
      }
      res.redirect('/admin/orders')

})


router.post('/change-order-status/:id', async (req, res) => {
      console.log(req.body);
      const orderId = req.params.id;
      let { orderStatus } = req.body;
      console.log(orderStatus);

      const updation = await getDb().collection('orders').updateOne({ _id: ObjectId(orderId) }, { $set: { status: orderStatus } })
      console.log(updation);
      res.redirect('/admin/orders')

})





router.route('/offers')
      .get(async (req, res) => {

            const Products = await getDb().collection('products').find().toArray();
            const Category = await getDb().collection('category').find().toArray();
            const offerProducts = Products.filter((pro) => {
                  if (pro.productOffer) {
                        return pro;
                  }
            })

            const offerCategories = Category.filter((cat) => {
                  if (cat.categoryOffer) {
                        return cat
                  }
            })

            res.render("admin/offers", { admin: true, Products, offerProducts, Category, offerCategories })
      })



router.post('/addProductOffer', async (req, res) => {
      let { product, discount } = req.body;
      let intDiscount = parseInt(discount)
      const updation = await getDb().collection('products').updateOne({ _id: ObjectId(product) }, { $set: { productOffer: intDiscount } }, { upsert: true })
      const updateCurrentoffer = await getDb().collection('products').updateOne({ _id: ObjectId(product) }, [{ '$set': { currentOffer: { "$max": ['$categoryOffer', '$productOffer'] } } }])
    
      const Product = await getDb().collection('products').findOne({ _id: ObjectId(product) })
       
      const offer = Product.currentOffer 
      const price = Product.price

      let offerPrice = price * ( offer/100)
      offerPrice = price - offerPrice
       
      const changingOfferPrice = await getDb().collection('products').updateOne({ _id: ObjectId(product) }, { $set: { offerPrice : offerPrice} }, { upsert: true })

      res.json({
            status: 200,
            message: 'success'
      })

})



router.post('/addCategoryOffer', async (req, res) => {

      let { category, discount } = req.body;
      let Category = await getDb().collection('category').findOne({ _id: ObjectId(category) })
      Category = Category.name
      let intDiscount = parseInt(discount);
      const updation = await getDb().collection('category').updateOne({ _id: ObjectId(category) }, { $set: { categoryOffer: intDiscount } }, { upsert: true })
      const products = await getDb().collection('products').updateMany({ category: Category }, { $set: { categoryOffer: intDiscount } }, { upsert: true })
      const updateCoffer = await getDb().collection('products').updateMany({ category: Category }, [{ '$set': { currentOffer: { "$max": ['$categoryOffer', '$productOffer'] } } }])

      const sameCategoryArray = await getDb().collection('products').find({ category: Category }).toArray()
       sameCategoryArray.forEach( async element => {
            let offer = element.currentOffer 
             let price = element.price
             let offerPrice = price * (offer/100)
             offerPrice = price - offerPrice
             let id = element._id
             const updation = await getDb().collection('products').updateOne({ _id:id }, { $set: { offerPrice: offerPrice} }, { upsert: true })
             console.log(updation);
       });


      const dbProducts = await getDb().collection('products').find({ category: Category, }).toArray()
      res.redirect('/admin/offers')

})

router.get('/deleteProductOffer/:id', async (req, res) => {
      const productId = req.params.id;
      const Product = await getDb().collection('products').updateOne({ _id: ObjectId(productId) }, { $set: { productOffer: 0 } })
      const updateCurrentoffer = await getDb().collection('products').updateOne({ _id: ObjectId(productId) }, [{ '$set': { currentOffer: { "$max": ['$categoryOffer', '$productOffer'] } } }])
    
      const product = await getDb().collection('products').findOne({ _id: ObjectId(productId) })
       
      const offer = product.currentOffer 
      const price = product.price

      let offerPrice = price * ( offer/100)
      offerPrice = price - offerPrice
       
      const changingOfferPrice = await getDb().collection('products').updateOne({ _id: ObjectId(productId) }, { $set: { offerPrice : offerPrice} }, { upsert: true })



      console.log(Product);
      res.redirect('/admin/offers')

})



router.get('/deleteCategoryOffer/:id', async (req, res) => {
      const categoryId = req.params.id;

      const category = await getDb().collection('category').updateOne({ _id: ObjectId(categoryId) }, { $set: { categoryOffer: 0 } })
      let Category = await getDb().collection('category').findOne({ _id: ObjectId(categoryId) })
      Category = Category.name
      const products = await getDb().collection('products').updateMany({ category: Category }, { $set: { categoryOffer: 0 } }, { upsert: true })

      const updateCoffer = await getDb().collection('products').updateMany({ category: Category }, [{ '$set': { currentOffer: { "$max": ['$categoryOffer', '$productOffer'] } } }])

      const sameCategoryArray = await getDb().collection('products').find({ category: Category }).toArray()
      sameCategoryArray.forEach( async element => {
           let offer = element.currentOffer 
            let price = element.price
            let offerPrice = price * (offer/100)
            offerPrice = price - offerPrice
            let id = element._id
            const updation = await getDb().collection('products').updateOne({ _id:id }, { $set: { offerPrice: offerPrice} }, { upsert: true })
            console.log(updation);
      });


      res.redirect('/admin/offers')

})




router.route('/coupon')
      .get(async (req, res) => {

            const coupons = await getDb().collection('coupons').find().toArray();
            console.log(coupons);

            res.render("admin/coupon", { admin: true, coupons })
      })

      .post(async (req, res) => {
            let { name, discount, expiryDate, MaxAmount } = req.body
            discount = parseInt(discount)
            MaxAmount = parseInt(MaxAmount)
            const Insertion = await getDb().collection('coupons').insertOne({ name: name, discount: discount, expiryDate: expiryDate, MaxAmount: MaxAmount })
            res.json({
                  status: 200,
                  message: "success"
            })
      })



router.get('/deletecoupon/:id', async (req, res) => {
      const couponId = req.params.id
      console.log(couponId);

      const coupons = await getDb().collection('coupons').deleteOne({ _id: ObjectId(couponId) })

      res.redirect('/admin/coupon')
})



router.post('/editCoupon/:id', async (req, res) => {
      const couponId = req.params.id
      let { name, discount, expiryDate, MaxAmount } = req.body
      MaxAmount = parseInt(MaxAmount)

      const updation = await getDb().collection('coupons').updateOne({ _id: ObjectId(couponId) }, { $set: { name: name, discount: discount, expiryDate: expiryDate, MaxAmount: MaxAmount } });
      res.redirect('/admin/coupon')

})










module.exports = router;