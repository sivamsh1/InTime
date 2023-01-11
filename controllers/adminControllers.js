var express = require('express');
var router = express.Router();
const bcrypt = require("bcrypt");
const { getDb } = require('../db');
const { ObjectId } = require('mongodb');
const jwt = require("jsonwebtoken")
const multer = require('multer')
const path = require('path')
const cloudinary = require('../utils/cloudinary')
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



module.exports = ({
  adminHomeRendering :  async (req, res, next) => {

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
    const totalDelivered = await getDb().collection('orders').find({ status: "delivered" }).count()
    const totalPlaced = await getDb().collection('orders').find({ status: "Placed" }).count()
    const totalShipped = await getDb().collection('orders').find({ status: "shipped" }).count()
    const statusArray = [totalCancelled, totalDelivered, totalPlaced,totalShipped]
    console.log(statusArray);


    res.render("admin/adminDashboard", { admin: true, TotalUsers, TotalProducts, TodaySales, TotalRevenue, orderStatus, statusArray })
},
adminLoginRendering : (req, res, next) => {
    res.render("admin/adminlogin", { admin: true })
},
adminUserRendering: async (req, res, next) => {
    const users = await getDb().collection('users').find().toArray();
    res.render("admin/adminUsers", { admin: true, users });
},
userBlock:async (req, res, next) => {
    const userId = req.params.id;
    const user = await getDb().collection('users').updateOne({ _id: ObjectId(userId) }, { $set: { isValid: false } });
    res.redirect("/admin/Users");
},
userUnblock:async (req, res, next) => {
    const userId = req.params.id;
    const user = await getDb().collection('users').updateOne({ _id: ObjectId(userId) }, { $set: { isValid: true } });
    res.redirect("/admin/Users");
},
allProducts:async (req, res) => {
    const Product = await getDb().collection('products').find().toArray();
    res.render('admin/adminProduct', { admin: true, Product })
},
productChecking:async (req, res) => {
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
},
categoryRendering : async (req, res) => {
    const categoryDatas = await getDb().collection('category').find().toArray()
    console.log(categoryDatas);
    res.render('admin/adminCategory', { admin: true, categoryDatas })
},
categorychecking:async (req, res) => {
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
},
categoryEditing:async (req, res) => {
    console.log("okkkkkkkk");
    let { name, categoryId, description } = req.body;
    console.log(name, categoryId, description);
    // const user = await getDb().collection('category').updateOne({_id:ObjectId(userId)},{$set:{isValid:false}});


},
adminLogout  :  (req, res) => {
    res.cookie('userjwt', 'loggedout', {
          maxAge: 1,
          httpOnly: true
    })
    res.redirect('/login')

},
categoryDelete: async (req, res) => {
    const userId = req.params.id;
    await getDb().collection('category').deleteOne({ _id: ObjectId(userId) })
    res.redirect('/admin/category')
},
renderaddProduct  : async (req, res) => {
    const categoryDatas = await getDb().collection('category').find().toArray()
    res.render('admin/adminAddProduct', { admin: true, categoryDatas })
},
addProduct: async (req, res) => {

    try {
          
          
      //     const { url: images } = await cloudinary.uploader.upload(req.files[0].path)
      console.log(req.files);
      const cloudinaryImageUploadMethod = (file) => {
        console.log("qwertyui");
        return new Promise((resolve) => {
          cloudinary.uploader.upload(file, (err, res) => {
            console.log(err, " asdfgh");
            if (err) return res.status(500).send("Upload Image Error")
            resolve(res.secure_url)
          })
        })
      }
    
      const files = req.files
      let arr1 = Object.values(files)
      let arr2 = arr1.flat()
      const urls = await Promise.all(
        arr2.map(async (file) => {
          const { path } = file
          const result = await cloudinaryImageUploadMethod(path)
          return result
        })
      )
      console.log(urls);
    




          let { name, category, price, brand } = req.body
          price = parseInt(price);
          const images = urls
          
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
},
deleteProduct  : async (req, res) => {
    const productId = req.params.id;
    await getDb().collection('products').deleteOne({ _id: ObjectId(productId) })
    res.redirect('/admin/product')

},
renderEditProduct : async (req, res) => {
    const ProductId = req.params.id
    const Product = await getDb().collection('products').findOne({ _id: ObjectId(ProductId) })
    const categoryDatas = await getDb().collection('category').find().toArray()

    res.render('admin/editProduct', { admin: true, Product, categoryDatas })
},
editProduct: async (req, res) => {
    const productId = req.params.id;
    let { name, category, price, brand, image1,image2,image3,dbimage1,dbimage2,dbimage3 } = req.body
    console.log(req.body);

  
       
      //     const { url: images } = await cloudinary.uploader.upload(req.files[0].path)
      console.log(req.files);
      const cloudinaryImageUploadMethod = (file) => {
        console.log("qwertyui");
        return new Promise((resolve) => {
          cloudinary.uploader.upload(file, (err, res) => {
            console.log(err, " asdfgh");
            if (err) return res.status(500).send("Upload Image Error")
            resolve(res.secure_url)
          })
        })
      }
    
      const files = req.files
      let arr1 = Object.values(files)
      let arr2 = arr1.flat()
      const urls = await Promise.all(
        arr2.map(async (file) => {
          const { path } = file
          const result = await cloudinaryImageUploadMethod(path)
          return result
        })
      )

      let images = urls
       let addedImage = images[0] 

      const isEmptyArray = images.length == 0
      
      if(  isEmptyArray){
            images = [ dbimage1,dbimage2,dbimage3 ]
      } else{
          images = [ addedImage,dbimage2,dbimage3 ]
      }
      
    
      
  
    

     price = parseInt(price)
    const product = await getDb().collection('products').findOne({ _id: ObjectId(productId) })   
          await getDb().collection('products').updateOne({ _id: ObjectId(productId) }, { $set: { name, category, price, brand, images } })
          res.redirect('/admin/product')

    

},
renderOrders : async (req, res) => {
    const categoryDatas = await getDb().collection('category').find().toArray()
    const orders = await getDb().collection('orders').find().toArray()
    res.render('admin/adminorders', { admin: true, categoryDatas, orders })
},
cancellOrder : async (req, res) => {
    const orderId = req.params.id
    const userId = await jwt.verify(req.cookies.userjwt, process.env.JWT_SECRET).userId;
    await getDb().collection('orders').updateOne({ _id: ObjectId(orderId) }, { $set: { status: "cancelled" } })
    res.redirect('/admin/orders')
},
renderViewOrders: async (req, res) => {
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
},
renderReport : async (req, res) => {
    const categoryDatas = await getDb().collection('category').find().toArray()
    const orders = await getDb().collection('orders').find().sort({"totalAmount":-1}).toArray()
    let userId = orders.userId

    let deliveredOrders = orders.filter((elements) => {
          if (elements.status == 'delivered') {
                return elements; a
          }
    })
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

     let TotalAmount =  await getDb().collection('orders').aggregate([{
      $match :{status: 'delivered' }
     },
     {
      "$group":{
            _id:null,
            totalAmount:{$sum:"$totalAmount"} 
      }
     },
]).toArray() 
  
 const  grandTotal = TotalAmount[0].totalAmount

    res.render('admin/salesReport', { admin: true, categoryDatas, deliveredOrders,grandTotal})
},
renderEditCategory:async (req, res) => {

    const categoryId = req.params.id
    const category = await getDb().collection('category').findOne({ _id: ObjectId(categoryId) })
    console.log(category);
    res.render('admin/editCategory', { admin: true, category })
},
editCategory : async (req, res) => {
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
},
renderBrand : async (req, res) => {
    const BrandDatas = await getDb().collection('brand').find().toArray()
    console.log(BrandDatas);
    res.render('admin/brands', { admin: true, BrandDatas })
},
addBrand:async (req, res) => {
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
},
deleteBrand : async (req, res) => {
    const BrandId = req.params.id;
    await getDb().collection('brand').deleteOne({ _id: ObjectId(BrandId) })
    res.redirect('/admin/brand')
},
renderEditBrand : async (req, res) => {
    const BrandId = req.params.id
    const Brand = await getDb().collection('brand').findOne({ _id: ObjectId(BrandId) })
    console.log(Brand);
    res.render('admin/editBrand', { admin: true, Brand })
},
editBrand : async (req, res) => {
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
},
listingProducts : async (req, res) => {
    const productId = req.params.id;
    console.log(productId);
    const Products = await getDb().collection('products').updateOne({ _id: ObjectId(productId) }, { $set: { listed: true } }, { upsert: true });
    res.redirect('/admin/product')
},
unlistingProducts: async (req, res) => {
    const productId = req.params.id;
    const Products = await getDb().collection('products').updateOne({ _id: ObjectId(productId) }, { $set: { listed: false } }, { upsert: true });
    res.redirect('/admin/product')
},
changeOrderStatus :  async (req, res) => {
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

},
renderOffer  : async (req, res) => {

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
},
addProductOffer:async (req, res) => {
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

},
addCategoryOffer :  async (req, res) => {

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

},
deleteProductOffer: async (req, res) => {
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

},
deleteCategoryOffer  :  async (req, res) => {
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

},
renderCoupon : async (req, res) => {

    const coupons = await getDb().collection('coupons').find().toArray();
    console.log(coupons);

    res.render("admin/coupon", { admin: true, coupons })
},
addCoupon:async (req, res) => {
    let { name, discount, expiryDate, MaxAmount } = req.body
    discount = parseInt(discount)
    MaxAmount = parseInt(MaxAmount)
    name = name.toUpperCase()

    const isExistCoupon = await getDb().collection('coupons').findOne({ name : name })
    console.log(isExistCoupon);
 if(isExistCoupon){
                      res.json({
                        status:404,
                        message:"failed",
                        error: "Coupon Already Exist"
                      })
 }else{

    const Insertion = await getDb().collection('coupons').insertOne({ name: name, discount: discount, expiryDate: expiryDate, MaxAmount: MaxAmount })
    res.json({
          status: 200,
          message: "success"
    })
}
},
deleteCoupon:async (req, res) => {
    const couponId = req.params.id
    console.log(couponId);

    const coupons = await getDb().collection('coupons').deleteOne({ _id: ObjectId(couponId) })

    res.redirect('/admin/coupon')
},
editCoupon: async (req, res) => {
    const couponId = req.params.id
    let { name, discount, expiryDate, MaxAmount } = req.body
    console.log(req.body);
    MaxAmount = parseInt(MaxAmount)
  name = name.toUpperCase()
    const updation = await getDb().collection('coupons').updateOne({ _id: ObjectId(couponId) }, { $set: { name: name, discount: discount, expiryDate: expiryDate, MaxAmount: MaxAmount } });
    res.redirect('/admin/coupon')

}


})