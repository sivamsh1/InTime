const express = require('express');
const router = express.Router();
const userControllers = require('../controllers/userController')
const authControllers = require('../controllers/authController');
const { route } = require('./admin');
const { getDb } = require('../models/db');

const errorHandler = fn =>(req,res,next)=>{
  Promise.resolve(fn(req,res,next)).catch(next)
}

// Home page
router.get('/', authControllers.blockedAuthentication, errorHandler(userControllers. renderHomepage))


// Login Page
router.route('/login')
  .get(errorHandler(authControllers.loginRedirect),errorHandler(userControllers.userLogin) )
  .post(errorHandler(authControllers.verifyUserLogin));


// Signup
router.route('/signup')
  .get(errorHandler( userControllers.renderSignupPage))


  .post( errorHandler( authControllers.userSignup))

// User Logout
router.get('/logout',errorHandler( userControllers.userLogout))


//Product page
router.route('/allProducts')
  .get( errorHandler( authControllers.blockedAuthentication), errorHandler(userControllers.renderProductPage) )

//Cart route
router.route('/cart',)
  .get( errorHandler(authControllers.blockedAuthentication),errorHandler( userControllers.renderCartPage))

//Product detail route
router.route('/productdetails/:id')
  .get( errorHandler( authControllers.blockedAuthentication), errorHandler(userControllers.renderPrductDetailPage))



//Checkout route              
router.route('/checkout')
  .get( errorHandler( authControllers.isLoggedin), errorHandler( authControllers.blockedAuthentication),errorHandler( userControllers.renderCheckoutPage))


//Wishlist route
router.route('/wishlist')
  .get( errorHandler(authControllers.isLoggedin), errorHandler( authControllers.blockedAuthentication),errorHandler( userControllers.renderWishlist))


//Addto cart Axios route
router.post('/addtocart/:id', errorHandler( authControllers.isLoggedin),errorHandler( authControllers.blockedAuthentication), errorHandler( userControllers.addToCart))

 
// Axios changeProductQuantity of item from cart
router.post('/changeProductQuantity', errorHandler( authControllers.blockedAuthentication),errorHandler( userControllers.changeProductQuantity))


router.post('/removeItem',errorHandler(authControllers.blockedAuthentication),errorHandler( userControllers.removeItemFromCart))


//Confirm Order

router.get('/successpage',errorHandler(authControllers.isLoggedin),errorHandler(authControllers.blockedAuthentication),errorHandler( userControllers.renderSuccesPage))



//render Confirm page

router.get('/confirmedOrders',errorHandler(authControllers.isLoggedin),errorHandler(authControllers.blockedAuthentication),errorHandler( userControllers.renderConfirmPage))

// checkout Form  route
router.post('/checkoutsubmit',errorHandler(authControllers.blockedAuthentication),errorHandler( userControllers.checkoutSubmit));

//Paypal Success

router.get('/success',errorHandler(authControllers.isLoggedin),errorHandler( authControllers.blockedAuthentication),errorHandler(userControllers.paypalSucces));



//////////////////////////////////////////////////////////////////////

//View order list
router.get('/vieworders/:id',errorHandler(authControllers.isLoggedin),errorHandler(authControllers.blockedAuthentication),errorHandler( userControllers.renderViewOrders))



//cancell order list
router.get('/cancellorders/:id',errorHandler(authControllers.blockedAuthentication),errorHandler( userControllers.cancellOrder))


//Return order list
router.get('/returnorders/:id',errorHandler(authControllers.blockedAuthentication),errorHandler( userControllers.retunOrders))



//category Page
router.route('/category/:category')
  .get(errorHandler(authControllers.blockedAuthentication),errorHandler(userControllers.renderCategoryPage))



// User Profile
router.route('/userProfile')
  .get(errorHandler(authControllers.isLoggedin),errorHandler(authControllers.blockedAuthentication),errorHandler(userControllers.renderUserProfile))
  .post(errorHandler(authControllers.blockedAuthentication),errorHandler(authControllers.userProfileAuthentication))
  .patch(errorHandler(authControllers.blockedAuthentication),errorHandler(userControllers.editUserProfile))


router.post('/addCoupon',errorHandler( authControllers.blockedAuthentication),errorHandler(userControllers.couponAdding))


router.get('/otpLogin',errorHandler(authControllers.renderOtpLogin))

router.post('/numberVerification',errorHandler(userControllers.otpNumberVerification))

router.get('/sendOtp',errorHandler(userControllers.renderSendOtpPage))

router.post('/otpVerification',errorHandler(userControllers.otpVerification))

router.post('/addAddress',errorHandler(authControllers.isLoggedin),errorHandler(userControllers.addAddress))

router.post('/numberVetify',errorHandler(authControllers.numberVerify))

router.get('/forgotPassword',errorHandler(userControllers.renderForgotPassword))

router.post('/emailVerify',errorHandler(userControllers.emailVerify) )


router.post('/search',errorHandler(userControllers.searchProduct))

router.get('/resendOTP/:number',errorHandler( userControllers.resendOTP) )





module.exports = router;      