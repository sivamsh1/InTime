var express = require('express');
var router = express.Router();
const multer = require('multer')
const path = require('path')
const adminControllers = require('../controllers/adminControllers')
const authControllers = require('../controllers/authController')


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

//Admin Home
router.get('/',adminControllers.adminHomeRendering)

//Admin Login Page
router.route('/login')
      .get(adminControllers.adminLoginRendering)

      .post(authControllers.adminloginAuthentication)

//Admin User
router.route('/Users')
      .get(adminControllers.adminUserRendering)

// Block Route
router.route("/userBlock/:id")
      .get(adminControllers.userBlock)

// Unblock Route
router.route("/userUnBlock/:id")
      .get(adminControllers.userUnblock)

//Product page
router.route('/product')
      .get(adminControllers.allProducts)

      .post(adminControllers.productChecking)


//Category Routes

router.route('/category')
      .get(adminControllers.categoryRendering)

      .post(adminControllers.categorychecking)

      .patch(adminControllers.categoryEditing)




// User Logout
router.get('/logout',adminControllers.adminLogout)

// Delete category

router.route('/cdelete/:id')
      .get(adminControllers.categoryDelete)



//Add product

router.route('/addproduct')
      .get(adminControllers.renderaddProduct)
      .post( upload.fields([
            { name: 'image1', maxCount: 1 },
            { name: 'image2', maxCount: 1 },
            { name: 'image3', maxCount: 1 },
            //multer code
          ]),adminControllers.addProduct)


router.route('/deleteproduct/:id')
      .get(adminControllers.deleteProduct)

router.route('/editproduct/:id')
      .get(adminControllers.renderEditProduct)

router.post('/editproduct/:id', upload.fields([
      { name: 'image1', maxCount: 1 },
      { name: 'image2', maxCount: 1 },
      { name: 'image3', maxCount: 1 },
      //multer code
    ]),adminControllers.editProduct)



// Admin Orders


router.route('/orders')
      .get(adminControllers.renderOrders)



//cancell order list
router.get('/cancellorders/:id', adminControllers.cancellOrder)



//View order list
router.get('/vieworders/:id',adminControllers.renderViewOrders)

//Return Orders


// Admin Report


router.route('/report')
      .get(adminControllers.renderReport)



router.get('/editCategory/:id',adminControllers.renderEditCategory)

router.post('/editCategory', adminControllers.editCategory)



// Admin Brands  

router.route('/brand')
      .get(adminControllers.renderBrand)
      .post(adminControllers.addBrand)

//Brand Delete Route 

router.route('/Branddelete/:id')
      .get(adminControllers.deleteBrand)


//Edit Brands

router.route('/editBrand/:id')
      .get(adminControllers.renderEditBrand)

//editBrand
router.post('/editBrand', adminControllers.editBrand)

//Listing Products
router.get('/listed/:id', adminControllers.listingProducts);
//unlisting Products

router.get('/unlisted/:id', adminControllers.unlistingProducts);

//Chane Order Status

router.post('/change-order-status/:id',adminControllers.changeOrderStatus)



//render Offer Page
router.route('/offers')
      .get(adminControllers.renderOffer)

//Add product offer

router.post('/addProductOffer', adminControllers.addProductOffer)


//Add category Offer
router.post('/addCategoryOffer',adminControllers.addCategoryOffer)


// delete product  offer
router.get('/deleteProductOffer/:id',adminControllers.deleteProductOffer)

// Delete Category offer

router.get('/deleteCategoryOffer/:id',adminControllers.deleteCategoryOffer)

//Render Coupon

router.route('/coupon')
      .get(adminControllers.renderCoupon)

      //add Coupon
      .post(adminControllers.addCoupon)

//Delete Coupon

router.get('/deletecoupon/:id', adminControllers.deleteCoupon)

//edit coupon

router.post('/editCoupon/:id',adminControllers.editCoupon)






module.exports = router;