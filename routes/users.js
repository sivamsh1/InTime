const express = require('express');
const router = express.Router();
const userControllers = require('../controllers/userController')
const authControllers = require('../controllers/authController');
const { route } = require('./admin');
const { getDb } = require('../db');




// Home page
router.get('/', authControllers.blockedAuthentication, userControllers.renderHomepage)


// Login Page
router.route('/login')
  .get(authControllers.loginRedirect, userControllers.userLogin)
  .post(authControllers.verifyUserLogin);


// Signup
router.route('/signup')
  .get(userControllers.renderSignupPage)


  .post(authControllers.userSignup)

// User Logout
router.get('/logout', userControllers.userLogout)


//Product page
router.route('/allProducts')
  .get(authControllers.blockedAuthentication,userControllers.renderProductPage)

//Cart route
router.route('/cart',)
  .get(authControllers.isLoggedin,authControllers.blockedAuthentication,userControllers.renderCartPage)

//Product detail route
router.route('/productdetails/:id')
  .get(authControllers.blockedAuthentication,userControllers.renderPrductDetailPage)



//Checkout route              
router.route('/checkout')
  .get(authControllers.isLoggedin,authControllers.blockedAuthentication,userControllers.renderCheckoutPage)


//Wishlist route
router.route('/wishlist')
  .get(authControllers.isLoggedin,authControllers.blockedAuthentication,userControllers.renderWishlist)


//Addto cart Axios route
router.post('/addtocart/:id',authControllers.isLoggedin,authControllers.blockedAuthentication, userControllers.addToCart)


// Axios changeProductQuantity of item from cart
router.post('/changeProductQuantity',authControllers.blockedAuthentication, userControllers.changeProductQuantity)


router.post('/removeItem',authControllers.blockedAuthentication, userControllers.removeItemFromCart)


//Confirm Order

router.get('/successpage',authControllers.isLoggedin,authControllers.blockedAuthentication, userControllers.renderSuccesPage)



//render Confirm page

router.get('/confirmedOrders',authControllers.isLoggedin,authControllers.blockedAuthentication, userControllers.renderConfirmPage)

// checkout Form  route
router.post('/checkoutsubmit',authControllers.blockedAuthentication, userControllers.checkoutSubmit);

//Paypal Success

router.get('/success',authControllers.isLoggedin, authControllers.blockedAuthentication,userControllers.paypalSucces);



//////////////////////////////////////////////////////////////////////

//View order list
router.get('/vieworders/:id',authControllers.isLoggedin,authControllers.blockedAuthentication, userControllers.renderViewOrders)



//cancell order list
router.get('/cancellorders/:id',authControllers.blockedAuthentication, userControllers.cancellOrder)


//Return order list
router.get('/returnorders/:id',authControllers.blockedAuthentication, userControllers.retunOrders)



//category Page
router.route('/category/:category')
  .get(authControllers.blockedAuthentication,userControllers.renderCategoryPage)



// User Profile
router.route('/userProfile')
  .get(authControllers.isLoggedin,authControllers.blockedAuthentication,userControllers.renderUserProfile)
  .post(authControllers.blockedAuthentication,authControllers.userProfileAuthentication)
  .patch(authControllers.blockedAuthentication,userControllers.editUserProfile)


router.post('/addCoupon', authControllers.blockedAuthentication,userControllers.couponAdding)


router.get('/otpLogin',authControllers.renderOtpLogin)

router.post('/numberVerification',userControllers.otpNumberVerification)

router.get('/sendOtp',userControllers.renderSendOtpPage)

router.post('/otpVerification',userControllers.otpVerification)

router.post('/addAddress',authControllers.isLoggedin,userControllers.addAddress)

router.post('/numberVetify',authControllers.numberVerify)


module.exports = router;      