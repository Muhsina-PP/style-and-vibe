const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Banner = require("../../models/bannerSchema")
const Brand = require("../../models/brandSchema")
const nodemailer = require("nodemailer")
const env = require("dotenv").config();
const bcrypt = require ("bcrypt")
const { Session } = require("express-session")
const { name } = require("ejs")

const pageNotFound = async(req,res)=>{
  try{
    res.render("page-404")
  }catch(error){
    res.redirect("/pageNotFound")
  }
}

const loadHomepage = async (req, res) => {
  try {
    const user = req.session.user;
    
    const categories = await Category.find({ isListed: true });
    const today = new Date().toISOString()
    const findBanner = await Banner.find({
      startDate : {$lt : new Date(today)},
      endDate : {$gt : new Date(today)},
    })

    const productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map(category => category._id) },
      quantity: { $gt: 0 }
    });

    productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestProducts = productData.slice(0, 4);

    if (user) {
      const userData = await User.findOne({ _id: user });
      res.render("home", { user: userData, products: latestProducts, banner: findBanner || [] });
    } else {
      res.render("home", { products: latestProducts, banner: findBanner || [] });
    }
  } catch (error) {
    res.status(500).send("Server error");
    console.error("Home page not found", error);
  }
};


const loadSignup = async(req,res)=>{
  try{
    res.render("signup", {
      query: req.query // Pass query params to the view
    });
  }catch(error){
    console.log("Home page not loading", error);
    res.status(500).send("Server Error")    
  }
}

function generateOtp(){
  return Math.floor(100000 + Math.random()*900000).toString();
}

async function sendVerficationEmail(email,otp){
  
  try {
    const transporter = nodemailer.createTransport({
      service : 'gmail',
      port : 587,
      secure : false,
      requireTLS : true,
      auth : {
        user : process.env.NODEMAILER_EMAIL,
        pass : process.env.NODEMAILER_PASSWORD
      }
    })

    const info = await transporter.sendMail({
      from : process.env.NODEMAILER_EMAIL,
      to : email, 
      subject : "Verify your account",
      text : `Your OTP is ${otp}`,
      html : `<b> Your OTP : ${otp} </b>`
    })

    return info.accepted.length>0;

  } catch (error) {
    console.error("Error sending Email : ", error)
    return false;
  }
}

const signup = async (req, res) => {

  try{

    const { name, phone, email,  password, cPassword } = req.body;
    if(password !== cPassword){
      return res.render("signup", {message : "Password's do not match"})
    }

    const findUser = await User.findOne({email})
    if(findUser){
      return res.render("signup", {message : "User with this email already exists"})
    }

    const otp = generateOtp();

    const emailSent = await sendVerficationEmail(email,otp);

    if(!emailSent){
      return res.json("email-error")
    }

    req.session.userOtp = otp;
    req.session.userData = {name, phone,email, password}

    res.render("verify-otp", {email})
    console.log("OTP sent : ", otp);
    

  }catch(error){
    console.error("Signup error: ", error);
    res.redirect("/page-404")
  } 
};

const securePassword = async (password)=>{
try {
    const passwordHash = await bcrypt.hash(password,10);
    return passwordHash;
} catch (error) {
  console.log("Error securing password : ",error)
  res.status(500).send("Internal Error")
}  
}

const verifyOtp = async (req,res)=>{
    try {
      const {otp} = req.body;
      console.log("OTP : ",otp);

      if(otp === req.session.userOtp){
        const user = req.session.userData;
        const passwordHash = await securePassword(user.password);

        const saveUserData = new User ({
          name : user.name,
          email : user.email,
          phone : user.phone,
          password : passwordHash
        })

        await saveUserData.save()
        req.session.user = saveUserData._id;
        res.json({success : true, redirectUrl : "/"})

      }else{
        res.status(400).json({success : false, message : "Invalid OTP, Plz try again..."})
      }

    } catch (error) {
      console.error("Error Verifying OTP : ", error);
      res.status(500).json({success : false, message :"An Error Occured"})
    }
}

const resendOtp = async (req,res)=>{
  try {

    const {email} = req.session.userData;
     if(!email){
      return res.status(400).json({success : false, message : "Email not found in session" })
     }

     const otp = generateOtp();
     req.session.userOtp = otp;
      
     const emailSent = await sendVerficationEmail(email, otp);
     if(emailSent){
      console.log("Resent OTP : ", otp);
      res.status(200).json({success : true, message : "OTP Resent Succesfully"})
     }else{
      res.status(500).json({success : false, message : "Failed to resend OTP, plz try again.."})
     }

  } catch (error) {
    console.error("Error resending OTP : ", error);
    res.status(500).json({success :false, message : "Internal Server Error.."})
  }
}

const loadLogin = async (req,res)=>{
  try {
    if(!req.session.user){
      return res.render("login")
    }else{
      res.redirect("/")
    }
  } catch (error) {
    res.redirect("/user/page-404")
  }
}

const login = async (req,res)=>{
  try {
    const {email,password} = req.body;
    const findUser = await User.findOne({isAdmin :false, email})

    if(!findUser){
      return res.render("login", {message : "User doesn't exist"})
    }
    if(findUser.isBlocked){
      return res.render("login", {message : "User is blocked by Admin"})
    }
    const passwordMatch = await bcrypt.compare(password, findUser.password)
    if(!passwordMatch){
      return res.render("login", {message : "Incorrect password"})
    }
    console.log(findUser)

    req.session.user = findUser._id;

    res.redirect("/")

  } catch (error) {
    console.error("Login Error", error)
    res.render("login", {message : "Login failed, plz try again.."})
  }
}

const logout = async (req,res)=>{
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Session destruction error", err.message);
        return res.redirect("/pageNotFound");
      }
      res.clearCookie("connect.sid"); // Default cookie name for express-session
      return res.redirect("/login");
    });
    
  } catch (error) {
    console.log("Logout error",error);
    res.redirect("/pageNotFound")
  }
}


const loadShoppingPage = async(req, res) => {
  try {
    // const user = req.session.user;
    // const userData = await User.findOne({_id: user});

    const user = req.session.user;
    let userData = null;

    if (user) {
      userData = await User.findOne({ _id: user });
    }


    const categories = await Category.find({isListed: true});
    const categoryIds = categories.map((category) => category._id.toString());

    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    // Capture the sort query parameter
    const sort = req.query.sort || 'createdAt'; // Default sort by creation date

    let sortOption = {};
    
    // Apply sorting logic based on the `sort` query parameter
    if (sort === 'priceAsc') {
      sortOption = { salesPrice: 1 }; // Price: Low to High
    } else if (sort === 'priceDesc') {
      sortOption = { salesPrice: -1 }; // Price: High to Low
    } else if (sort === 'nameAsc') {
      sortOption = { productName: 1 }; // Name: A to Z
    } else if (sort === 'nameDesc') {
      sortOption = { productName: -1 }; // Name: Z to A
    } else {
      sortOption = { createdAt: -1 }; // Default: Sort by creation date
    }

    // Fetch products with the applied sorting
    const products = await Product.find({
      isBlocked: false,
      category: { $in: categoryIds },
      quantity: { $gt: 0 }
    })
    .sort(sortOption) // Apply the sorting option here
    .skip(skip)
    .limit(limit);

    const totalProducts = await Product.countDocuments({
      isBlocked: false,
      category: { $in: categoryIds },
      quantity: { $gt: 0 }
    });

    const totalPages = Math.ceil(totalProducts / limit);
    const brands = await Brand.find({isBlocked: false});
    const categoriesWithIds = categories.map((category) => ({
      _id: category.id,
      name: category.name
    }));

    res.render("shop", {
      user: userData,
      products: products,
      category: categoriesWithIds,
      brand: brands,
      totalProducts: totalProducts,
      currentPage: page,
      totalPages: totalPages,
      sort: sort // Send the sort parameter to keep the selected sort in the dropdown
    });
  } catch (error) {
    res.redirect("/user/pageNotFound");
  }
}


const filterProduct = async (req,res) =>{
  try {
    
    const user = req.session.user;
    const category = req.query.category;
    const brand = req.query.brand;
    const findCategory = category ? await Category.findOne({_id :category}) : null;
    const findBrand = brand ? await Brand.findOne({_id :brand}) : null;

    const brands = await Brand.find({}).lean();
    const query = {
      isBlocked : false,
      quantity : {$gt:0}
    }

    if (findCategory){
      query.category = findCategory._id;
    }
    if(findBrand){
      query.brand = findBrand.brandName;
    }

    let findProducts = await Product.find(query).lean();
    findProducts.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    const categories = await Category.find({isListed :true})

    let itemsPerPage = 6;
    let currentPage = parseInt(req.query.page) || 1;
    let startIndex= (currentPage-1) * itemsPerPage;
    let endIndex = startIndex + itemsPerPage;
    let totalPages = Math.ceil(findProducts.length / itemsPerPage)
    const currentProduct = findProducts.slice(startIndex, endIndex)

    let userData = null;
    if(user){
      userData = await User.findOne({_id:user})
      if(userData){
        const searchEntry = {
          category : findCategory ? findCategory._id : null,
          brand : findBrand ? findBrand.brandName : null,
          searcheOn : new Date(),
      }
      userData.searchHistory.push(searchEntry)
      await userData.save()
    }
  }
  req.session.filteredProducts = currentProduct;
  res.render("shop",{
    user : userData,
    products : currentProduct,
    category : categories,
    brand : brands,
    totalPages,
    currentPage,
    selectedCategory : category || null,
    selectedBrand : brand || null,
    sort: req.query.sort || ''
  })
  } catch (error) {
    res.redirect("/user/pageNotFound")
  }
}


const filterByPrice = async(req,res) =>{
  try {
    
    const user = req.session.user;
    const userData = await User.findOne({_id :user})
    const brands = await Brand.find({}).lean()
    const categories = await Category.find({isListed : true}).lean()

    let findProducts = await Product.find({
      salesPrice : {$gt : req.query.gt, $lt :req.query.lt},
      isBlocked : false,
      quantity : {$gt :0}
    }).lean();

    findProducts.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))

    let itemsPerPage = 6;
    let currentPage = parseInt(req.query.page) || 1;
    let startIndex= (currentPage-1) * itemsPerPage;
    let endIndex = startIndex + itemsPerPage;
    let totalPages = Math.ceil(findProducts.length / itemsPerPage)
    const currentProduct = findProducts.slice(startIndex, endIndex)

    req.session.filteredProducts = findProducts;
    res.render("shop",{
      user : userData,
      products : currentProduct,
      category : categories,
      brand : brands,
      totalPages,
      currentPage,
      sort: req.query.sort || '',
    })

  } catch (error) {
    console.error("Error while filtering by price : ",error)
    res.redirect("/user/pageNotFound")
  }
}

const searchProducts = async(req,res) =>{
  try {
    
    const user = req.session.user;
    const userData = await User.findOne({_id :user})
    let search = req.body.query;
    const brands = await Brand.find({}).lean()
    const categories = await Category.find({isListed : true}).lean()
    const categoryIds = categories.map((category)=>category._id.toString())

    let searchResult = []
    if(req.session.filteredProducts && req.session.filteredProducts.length>0){
        searchResult = req.session.filteredProducts.filter(product =>
          product.productName.toLowerCase().includes(search.toLowerCase())
        )
    }else{
      searchResult = await Product.find({
        productName : {$regex : ".*"+search+".*", $options : "i"},
        isBlocked : false,
        quantity : {$gt :0},
        category : {$in : categoryIds}
      })
    }

    searchResult.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    let itemsPerPage = 6;
    let currentPage = parseInt(req.query.page) || 1;
    let startIndex= (currentPage-1) * itemsPerPage;
    let endIndex = startIndex + itemsPerPage;
    let totalPages = Math.ceil(searchResult.length / itemsPerPage)
    const currentProduct = searchResult.slice(startIndex, endIndex)

    res.render("shop",{
      user : userData,
      products : currentProduct,
      category : categories,
      brand : brands,
      totalPages,
      currentPage,
      count : searchResult.length,
      sort: req.query.sort || ''
    })

  } catch (error) {
    console.error("Error while searching products : ",error)
    res.redirect("/user/pageNotFound")
  }
}


module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  logout,
  loadShoppingPage,
  filterProduct,
  filterByPrice,
  searchProducts
}