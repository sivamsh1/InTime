const express = require('express');
const router = express.Router();
const multer = require('multer')
const path = require('path')
const adminControllers = require('../controllers/adminControllers')
const authControllers = require('../controllers/authController');
const { getDb } = require('../models/db');


upload = multer({
      storage: multer.diskStorage({}),
      fileFilter: (req, file, cb) => {
            let ext = path.extname(file.originalname)
            if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png" && ext !== ".webp") {
                  cb(new Error("File type is not supported"), false)
                  return
            }
            cb(null, true)
      }
})


const errorHandler = fn=>(req,res,next) =>{
      Promise.resolve(fn(req,res,next)).catch(next);
}

//Admin Home   
router.get('/', errorHandler(authControllers.adminAuthentication) , errorHandler(adminControllers.adminHomeRendering))

//Admin Login Page
router.route('/login')
      .get(errorHandler(adminControllers.adminLoginRendering))

      .post(errorHandler(authControllers.adminloginAuthentication))

//Admin User
router.route('/Users')
      .get( errorHandler(authControllers.adminAuthentication) ,errorHandler(adminControllers.adminUserRendering))

// Block Route
router.route("/userBlock/:id")       
      .get(errorHandler(adminControllers.userBlock))
 
// Unblock Route
router.route("/userUnBlock/:id")
      .get(errorHandler(adminControllers.userUnblock))
 
//Product page
router.route('/product')
      .get(errorHandler(adminControllers.allProducts))

      .post(errorHandler(adminControllers.productChecking))


//Category Routes

router.route('/category')
      .get( errorHandler(authControllers.adminAuthentication) ,errorHandler(adminControllers.categoryRendering))

      .post(errorHandler(adminControllers.categorychecking))

      .patch(errorHandler(adminControllers.categoryEditing))




// User Logout
router.get('/logout', errorHandler(adminControllers.adminLogout))

// Delete category

router.route('/cdelete/:id')
      .get(errorHandler(adminControllers.categoryDelete))



//Add product

router.route('/addproduct')
      .get(errorHandler(adminControllers.renderaddProduct))
      .post(upload.fields([
            { name: 'image1', maxCount: 1 },
            { name: 'image2', maxCount: 1 },
            { name: 'image3', maxCount: 1 },
            //multer code
      ]),errorHandler( adminControllers.addProduct))


router.route('/deleteproduct/:id')
      .get(errorHandler(adminControllers.deleteProduct))

router.route('/editproduct/:id')
      .get( errorHandler(authControllers.adminAuthentication) ,errorHandler(adminControllers.renderEditProduct))

router.post('/editproduct/:id', upload.fields([
      { name: 'image1', maxCount: 1 },
      { name: 'image2', maxCount: 1 },
      { name: 'image3', maxCount: 1 },
      //multer code
]), errorHandler(adminControllers.editProduct))



// Admin Orders

router.route('/orders')
      .get( errorHandler(authControllers.adminAuthentication) ,errorHandler(adminControllers.renderOrders))



//cancell order list
router.get('/cancellorders/:id', errorHandler(adminControllers.cancellOrder))



//View order list
router.get('/vieworders/:id', errorHandler(authControllers.adminAuthentication) , errorHandler(adminControllers.renderViewOrders))

//Return Orders


// Admin Report


router.route('/report')
      .get( errorHandler(authControllers.adminAuthentication) ,errorHandler(adminControllers.renderReport))



router.get('/editCategory/:id', errorHandler(adminControllers.renderEditCategory))

router.post('/editCategory',errorHandler( adminControllers.editCategory))    

  
// Admin Brands  

router.route('/brand')
      .get( errorHandler(authControllers.adminAuthentication) ,errorHandler(adminControllers.renderBrand))
      .post(errorHandler(adminControllers.addBrand))

//Brand Delete Route 

router.route('/Branddelete/:id')
      .get(errorHandler(adminControllers.deleteBrand))


//Edit Brands

router.route('/editBrand/:id')
      .get(errorHandler(adminControllers.renderEditBrand))

//editBrand
router.post('/editBrand',errorHandler( adminControllers.editBrand))

//Listing Products
router.get('/listed/:id', errorHandler(adminControllers.listingProducts));
//unlisting Products

router.get('/unlisted/:id',errorHandler( adminControllers.unlistingProducts));

//Chane Order Status

router.post('/change-order-status/:id', errorHandler(adminControllers.changeOrderStatus))



//render Offer Page
router.route('/offers')
      .get( errorHandler(authControllers.adminAuthentication) ,errorHandler(adminControllers.renderOffer))

//Add product offer

router.post('/addProductOffer', errorHandler(adminControllers.addProductOffer))


//Add category Offer
router.post('/addCategoryOffer', errorHandler(adminControllers.addCategoryOffer))


// delete product  offer
router.get('/deleteProductOffer/:id', errorHandler(adminControllers.deleteProductOffer))

// Delete Category offer

router.get('/deleteCategoryOffer/:id', errorHandler(adminControllers.deleteCategoryOffer))

//Render Coupon

router.route('/coupon')
      .get( errorHandler(authControllers.adminAuthentication) ,errorHandler(adminControllers.renderCoupon))

      //add Coupon
      .post(errorHandler(adminControllers.addCoupon))

//Delete Coupon

router.get('/deletecoupon/:id', errorHandler(adminControllers.deleteCoupon))

//edit coupon

router.post('/editCoupon/:id', errorHandler(adminControllers.editCoupon))

//List Category
router.get('/listedCategory/:id', errorHandler(adminControllers.listCategory))

//unList Category
router.get('/unlistCategory/:id', errorHandler(adminControllers.unlistCategory))


//List Brand
router.get('/listedBrand/:id',errorHandler( adminControllers.listBrand))

//unList Brand
router.get('/unlistBrand/:id',errorHandler( adminControllers.unlistBrand))


//Sales Report
router.get('/sales-report', errorHandler(authControllers.adminAuthentication) ,errorHandler(adminControllers.salesReport))


// Banner Management 
router.get('/banner', errorHandler(authControllers.adminAuthentication) ,errorHandler(adminControllers.bannerMannagement))
//Add banner
router.post('/addBanner',upload.fields([
      { name: 'image1', maxCount: 1 },
     
      //multer code
]),errorHandler(adminControllers.addBanner))


//Edit banner
router.post('/editBanner',upload.fields([  { name: 'image1', maxCount: 1 },]),errorHandler(adminControllers.editBanner))

// unlist banner

router.get('/banerListed/:id',errorHandler(adminControllers.bannerListed))

//List Banner
router.get('/bannerUnListed/:id',errorHandler(adminControllers.bannerUnListed))








module.exports = router;



   