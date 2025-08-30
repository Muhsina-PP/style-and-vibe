const express = require("express")
const router = express.Router()
const adminController = require("../controller/admin/adminController")
const customerController = require("../controller/admin/customerController")
const categoryController = require("../controller/admin/categoryController")
const brandController = require("../controller/admin/brandController")
const productController = require("../controller/admin/productController")
const bannerController = require("../controller/admin/bannerController")
const orderController = require("../controller/admin/orderController")
const { adminAuth} = require("../middleware/auth")
const multer = require("multer") 
const uploads = require("../helpers/multer")
// const uploads = multer ({storage : storage})


router.get("/pageError", adminController.pageError)

// login - logout
router.get("/login", adminController.loadLogin)
router.post("/login", adminController.login)
router.get("/", adminAuth, adminController.loadDashboard)
router.get("/logout", adminController.logout)

// customer management
router.get("/users", adminAuth, customerController.customerInfo)
router.get("/blockCustomer", adminAuth, customerController.customerBlocked)
router.get("/unblockCustomer", adminAuth, customerController.customerUnblocked)

// category management
router.get("/category", adminAuth, categoryController.categoryInfo)
router.post("/addCategory", adminAuth, categoryController.addCategory)
router.post("/addCategoryOffer", adminAuth, categoryController.addCategoryOffer)
router.post("/removeCategoryOffer", adminAuth, categoryController.removeCategoryOffer)
router.get("/listCategory", adminAuth, categoryController.getListCategory)
router.get("/unlistCategory", adminAuth, categoryController.getunListCategory)
router.get("/editCategory", adminAuth, categoryController.getEditCategory)
router.post("/editCategory/:id", adminAuth, categoryController.editCategory)
// router.get("/category",adminAuth, categoryController.searchCategory)
router.delete('/deleteCategory/:id', adminAuth, categoryController.deleteCategory);


// brand management
router.get("/brands", adminAuth, brandController.getBrandPage)
router.post("/addBrand", adminAuth, uploads.single("image"), brandController.addBrand)
router.get("/blockBrand", adminAuth, brandController.blockBrand)
router.get("/unblockBrand", adminAuth, brandController.unblockBrand)
router.get("/deleteBrand/:id", adminAuth, brandController.deleteBrand)

// product management
router.get("/addProducts", adminAuth, productController.getProductAddPage)
router.post("/addProducts", adminAuth, uploads.array("images",4), productController.addProducts)
router.get("/products", adminAuth,productController.getAllProducts)
router.post("/addProductOffer", adminAuth, productController.addProductOffer)
router.post("/removeProductOffer",adminAuth, productController.removeProductOffer)
router.get("/blockProduct", adminAuth, productController.blockProduct)
router.get("/unblockProduct", adminAuth, productController.unblockProduct)
router.get("/editProduct", adminAuth, productController.getEditProduct)
router.post("/editProduct/:id", adminAuth, uploads.array("images", 4), productController.editProduct)
router.post("/deleteImage", adminAuth, productController.deleteSingleImage)
router.get('/deleteProduct/:id', adminAuth, productController.deleteProduct);

//Banner management
router.get("/banner", adminAuth, bannerController.getBannerPage)
router.get("/addBanner", adminAuth, bannerController.getAddBannerPAge)
router.post("/addBanner", adminAuth, uploads.single("images"), bannerController.addBanner)
router.get("/deleteBanner" ,adminAuth, bannerController.deleteBanner)

// Order management
router.get('/orderDetails', adminAuth, orderController.getOrders);
router.get('/single-order-page/:orderId', adminAuth, orderController.getSingleOrderPage);
router.post('/update-order-status/:orderId', adminAuth, orderController.updateOrderStatus);
router.get('/orderDetails/:orderId', adminAuth, orderController.getSingleOrderPage)
// router.post('/order/:orderId/handle-return', adminAuth, orderController.handleReturnRequest);
router.post('/order/:orderId/handle-return', adminAuth, orderController.handleReturnRequest);



module.exports = router;