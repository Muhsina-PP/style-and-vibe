const express = require("express")
const router = express.Router()
const userController = require("../controller/user/userController")
const profileController = require("../controller/user/profileController")
const productController = require("../controller/user/productController")
const wishlistController = require("../controller/user/wishlistController")
const cartController = require("../controller/user/cartController")
const {userAuth} = require("../middleware/auth")
const passport = require("passport")
const multer=require('../helpers/multer');
const profileUpload = require('../helpers/profileUpload');


// Error management
router.get("/pageNotFound", userController.pageNotFound)

// Home page management
router.get("/", userController.loadHomepage)
router.get("/shop", userController.loadShoppingPage)
router.get("/filter", userAuth, userController.filterProduct)
router.get("/filterPrice", userAuth, userController.filterByPrice)
router.post("/search", userAuth, userController.searchProducts)

// Signup management
router.get("/signup", userController.loadSignup)
router.post("/signup", userController.signup)
router.post("/verify-otp", userController.verifyOtp)
router.post("/resend-otp", userController.resendOtp)
router.get('/auth/google', passport.authenticate('google', {scope : ['profile' , 'email']}))
// router.get('/auth/google/callback' , passport.authenticate('google', {failureRedirect :'/signup'}), (req,res)=>{
//   res.redirect("/")
// })
router.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/signup?error=blocked',
  }),
  (req, res) => {
    req.session.user = req.user._id;
    console.log("User authenticated, redirecting to home");
    res.redirect('/');
  }
);


// Login management
router.get("/login", userController.loadLogin)
router.post("/login", userController.login)
// Logout
router.get("/logout", userController.logout)

// profile management
router.get("/forgot-password", profileController.getForgotPassPage)
router.post("/forgot-email-valid", profileController.forgotEmailValid)
router.post("/verify-passForgot-otp", profileController.verfiyForgotPassOtp)
router.get("/reset-password", profileController.getResetPassPage)
router.post("/reset-password", profileController.resetPassword)
router.get("/userProfile", userAuth, profileController.userProfile)
router.post("/resend-forgot-otp", profileController.resendOtp)
router.post("/reset-password", profileController.postNewPassword)
router.get("/change-email", userAuth,profileController.changeEmail)
router.post("/change-email", userAuth,profileController.changeEmailValid)
router.post("/verify-email-otp", userAuth, profileController.verifyEmailOtp)
router.post("/update-email", userAuth, profileController.updateEmail)
router.get("/edit-profile", profileController.getEditProfile)
router.get("/change-password", userAuth, profileController.changePassword)
router.post("/change-password", userAuth, profileController.changePasswordValid)
router.post("/verify-changepassword-otp", userAuth, profileController.verifyChangePasswordOtp)
router.post('/upload-profile-image', userAuth,profileUpload.single('profileImage'), profileController .uploadProfileImage);
router.post('/update-profile',userAuth, profileController.updateProfile);


// Address management
router.get("/addAddress", userAuth, profileController.addAddress)
router.post("/addAddress", userAuth, profileController.postAddAddress)
router.get("/editAddress/:id", userAuth, profileController.getEditAddress)
router.post("/editAddress/:id", userAuth, profileController.postEditAddress);
router.get('/deleteAddress/:id', userAuth, profileController.deleteAddress);

// product management
router.get("/productDetails", userAuth,productController.productDetails)
router.get('/category/:id',userAuth, productController.loadCategoryPage);

// Wishlist management
router.get("/wishlist", userAuth, wishlistController.getWishlist)
router.post("/addToWishlist", userAuth, wishlistController.addToWishlist)
router.post('/removeFromWishlist', wishlistController.removeFromWishlist);

// Cart management
router.get('/cart', userAuth, cartController.getCartPage);
router.post('/addToCart', userAuth, cartController.addToCart);
// router.post('/update-cart-quantity', userAuth, cartController.updateCartQuantity);
router.get('/check-product-in-cart', cartController.checkProductInCart);
router.post('/remove-from-cart/:itemId', userAuth, cartController.removeFromCart)


// Checkout management
router.get("/orderOfCart", userAuth,cartController.getCheckoutPage)


module.exports = router;