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
      query: req.query 
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

// const loadShoppingPage = async(req, res) => {
//   try {
//     const user = req.session.user;
//     let userData = null;
    
    
//     const search = req.query.search || ''
//     let query 
//     if(search){
//       const brandIds = await Brand.find({
//         brandName : {$regex : search.trim(), $options : 'i'},
//         isBlocked : false
//       })
//       const categoryIds = await Category.find({
//         name : {$regex : search.trim(), $options : 'i'},
//         isListed : true
//       })

//       query = {$or : [
//         { productName : {$regex : search.trim(), $options : 'i'}},
//         { category : { $in : categoryIds}},
//         { brand : {$in : brandIds}}
//       ]}
//     }

//     if (user) {
//       userData = await User.findOne({ _id: user });
//     }

//     const categories = await Category.find({isListed: true});
//     const categoryIds = categories.map((category) => category._id.toString());

//     const page = parseInt(req.query.page) || 1;
//     const limit = 9;
//     const skip = (page - 1) * limit;
//     const sort = req.query.sort || 'createdAt'; //  sort by creation date

//     let sortOption = {};
    
//     // Apply sorting logic based on the `sort` query parameter
//     if (sort === 'priceAsc') {
//       sortOption = { salesPrice: 1 }; // Price: Low to High
//     } else if (sort === 'priceDesc') {
//       sortOption = { salesPrice: -1 }; // Price: High to Low
//     } else if (sort === 'nameAsc') {
//       sortOption = { productName: 1 }; // Name: A to Z
//     } else if (sort === 'nameDesc') {
//       sortOption = { productName: -1 }; // Name: Z to A
//     } else {
//       sortOption = { createdAt: -1 }; // Default: Sort by creation date
//     }

//     // Fetch products with the applied sorting
//     const products = await Product.find(query)
//     .sort(sortOption) // Apply the sorting option here
//     .skip(skip)
//     .limit(limit);

//     const totalProducts = await Product.countDocuments({
//       isBlocked: false,
//       category: { $in: categoryIds },
//       quantity: { $gt: 0 }
//     });

//     const totalPages = Math.ceil(totalProducts / limit);
//     const brands = await Brand.find({isBlocked: false});
//     const categoriesWithIds = categories.map((category) => ({
//       _id: category.id,
//       name: category.name
//     }));

//     res.render("shop", {
//       search,
//       user: userData,
//       products: products,
//       category: categoriesWithIds,
//       brand: brands,
//       totalProducts: totalProducts,
//       currentPage: page,
//       totalPages: totalPages,
//       sort: sort // Send the sort parameter to keep the selected sort in the dropdown
//     });
//   } catch (error) {
//     res.redirect("/pageNotFound");
//   }
// }


// const filterProduct = async (req,res) =>{
//   try {
    
//     const user = req.session.user;
//     const category = req.query.category;
//     const brand = req.query.brand;
//     const findCategory = category ? await Category.findOne({_id :category}) : null;
//     const findBrand = brand ? await Brand.findOne({_id :brand}) : null;

//     const brands = await Brand.find({}).lean();
//     const query = {
//       isBlocked : false,
//       quantity : {$gt:0}
//     }

//     if (findCategory){
//       query.category = findCategory._id;
//     }
//     if(findBrand){
//       query.brand = findBrand.brandName;
//     }

//     let findProducts = await Product.find(query).lean();
//     findProducts.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
//     const categories = await Category.find({isListed :true})

//     let itemsPerPage = 6;
//     let currentPage = parseInt(req.query.page) || 1;
//     let startIndex= (currentPage-1) * itemsPerPage;
//     let endIndex = startIndex + itemsPerPage;
//     let totalPages = Math.ceil(findProducts.length / itemsPerPage)
//     const currentProduct = findProducts.slice(startIndex, endIndex)

//     let userData = null;
//     if(user){
//       userData = await User.findOne({_id:user})
//       if(userData){
//         const searchEntry = {
//           category : findCategory ? findCategory._id : null,
//           brand : findBrand ? findBrand.brandName : null,
//           searcheOn : new Date(),
//       }
//       userData.searchHistory.push(searchEntry)
//       await userData.save()
//     }
//   }
//   req.session.filteredProducts = currentProduct;
//   res.render("shop",{
//     user : userData,
//     products : currentProduct,
//     category : categories,
//     brand : brands,
//     totalPages,
//     currentPage,
//     selectedCategory : category || null,
//     selectedBrand : brand || null,
//     sort: req.query.sort || '',
    
//   })
//   } catch (error) {
//     return res.status(500).json({message:"Server Error",error:error.message});
//   }
// }


// const filterByPrice = async(req,res) =>{
//   try {
    
//     const user = req.session.user;
//     const userData = await User.findOne({_id :user})
//     const brands = await Brand.find({}).lean()
//     const categories = await Category.find({isListed : true}).lean()

//     let findProducts = await Product.find({
//       salesPrice : {$gt : req.query.gt, $lt :req.query.lt},
//       isBlocked : false,
//       quantity : {$gt :0}
//     }).lean();

//     findProducts.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))

//     let itemsPerPage = 6;
//     let currentPage = parseInt(req.query.page) || 1;
//     let startIndex= (currentPage-1) * itemsPerPage;
//     let endIndex = startIndex + itemsPerPage;
//     let totalPages = Math.ceil(findProducts.length / itemsPerPage)
//     const currentProduct = findProducts.slice(startIndex, endIndex)

//     req.session.filteredProducts = findProducts;
//     res.render("shop",{
//       user : userData,
//       products : currentProduct,
//       category : categories,
//       brand : brands,
//       totalPages,
//       currentPage,
//       sort: req.query.sort || '',
      
//     })

//   } catch (error) {
//     console.error("Error while filtering by price : ",error)
//     res.redirect("/pageNotFound")
//   }
// }

// const searchProducts = async(req,res) =>{
//   try {
    
//     const user = req.session.user;
//     const userData = await User.findOne({_id :user})
//     let search = req.body.query;
//     const brands = await Brand.find({}).lean()
//     const categories = await Category.find({isListed : true}).lean()
//     const categoryIds = categories.map((category)=>category._id.toString())

//     let searchResult = []
//     if(req.session.filteredProducts && req.session.filteredProducts.length>0){
//         searchResult = req.session.filteredProducts.filter(product =>
//           product.productName.toLowerCase().includes(search.toLowerCase())
//         )
//     }else{
//       searchResult = await Product.find({
//         productName : {$regex : ".*"+search+".*", $options : "i"},
//         isBlocked : false,
//         quantity : {$gt :0},
//         category : {$in : categoryIds}
//       })
//     }

//     searchResult.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
//     let itemsPerPage = 6;
//     let currentPage = parseInt(req.query.page) || 1;
//     let startIndex= (currentPage-1) * itemsPerPage;
//     let endIndex = startIndex + itemsPerPage;
//     let totalPages = Math.ceil(searchResult.length / itemsPerPage)
//     const currentProduct = searchResult.slice(startIndex, endIndex)

//     res.render("shop",{
//       user : userData,
//       products : currentProduct,
//       category : categories,
//       brand : brands,
//       totalPages,
//       currentPage,
//       count : searchResult.length,
//       sort: req.query.sort || ''
//     })

//   } catch (error) {
//     console.error("Error while searching products : ",error)
//     res.redirect("/user/pageNotFound")
//   }
// }

// const loadShoppingPage = async (req, res) => {
//   try {
//     const user = req.session.user;
//     let userData = null;

//     if (user) {
//       userData = await User.findById(user);
//     }

//     // Get query params
//     const {
//       search = '',
//       sort = 'createdAt',
//       category,
//       brand,
//       gt,
//       lt,
//       page = 1
//     } = req.query;

//     const currentPage = parseInt(page) || 1;
//     const limit = 9;
//     const skip = (currentPage - 1) * limit;

//     // Build query
//     const query = {
//       isBlocked: false,
//       quantity: { $gt: 0 }
//     };

//     // 🔍 Search (productName, category, brand)
//     if (search) {
//       const brandIds = await Brand.find({
//         brandName: { $regex: search.trim(), $options: 'i' },
//         isBlocked: false
//       });

//       const categoryIds = await Category.find({
//         name: { $regex: search.trim(), $options: 'i' },
//         isListed: true
//       });

//       query.$or = [
//         { productName: { $regex: search.trim(), $options: 'i' } },
//         { category: { $in: categoryIds.map(c => c._id) } },
//         { brand: { $in: brandIds.map(b => b.brandName) } }
//       ];
//     }

//     // 🏷️ Filter by category
//     if (category) {
//       const findCategory = await Category.findById(category);
//       if (findCategory) {
//         query.category = findCategory._id;
//       }
//     }

//     // 🏢 Filter by brand
//     if (brand) {
//       const findBrand = await Brand.findById(brand);
//       if (findBrand) {
//         query.brand = findBrand.brandName;
//       }
//     }

//     // 💰 Filter by price range
//     if (gt && lt) {
//       query.salesPrice = {
//         $gt: parseInt(gt),
//         $lt: parseInt(lt)
//       };
//     }

//     // 🧠 Track search history
//     if (userData && (category || brand)) {
//       const searchEntry = {
//         category: category || null,
//         brand: brand || null,
//         searcheOn: new Date()
//       };
//       userData.searchHistory.push(searchEntry);
//       await userData.save();
//     }

//     // 📦 Fetch products with filters
//     const sortOption = getSortOption(sort);
//     const products = await Product.find(query)
//       .sort(sortOption)
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     const totalProducts = await Product.countDocuments(query);
//     const totalPages = Math.ceil(totalProducts / limit);

//     // 📁 Fetch category & brand list
//     const brands = await Brand.find({ isBlocked: false }).lean();
//     const categories = await Category.find({ isListed: true }).lean();

//     res.render("shop", {
//       user: userData,
//       search,
//       products,
//       category: categories,
//       brand: brands,
//       selectedCategory: category || null,
//       selectedBrand: brand || null,
//       totalProducts,
//       currentPage,
//       totalPages,
//       sort
//     });

//   } catch (error) {
//     console.error("Error loading shopping page:", error);
//     res.redirect("/pageNotFound");
//   }
// };

// Helper function to get sort option
// function getSortOption(sort) {
//   switch (sort) {
//     case 'priceAsc':
//       return { salesPrice: 1 };
//     case 'priceDesc':
//       return { salesPrice: -1 };
//     case 'nameAsc':
//       return { productName: 1 };
//     case 'nameDesc':
//       return { productName: -1 };
//     default:
//       return { createdAt: -1 };
//   }
// }

const loadShoppingPage = async (req, res) => {
  try {
    const user = req.session.user;
    let userData = null;

    if (user) {
      userData = await User.findById(user);
    }

    const {
      search = '',
      sort = '',
      category,
      brand,
      gt,
      lt,
      page = 1
    } = req.query;

    // Pagination 
    const currentPage = parseInt(page) || 1;
    const limit = 4; 
    const skip = (currentPage - 1) * limit;

    // Query to only show available products
    const query = {
      isBlocked: false,
      quantity: { $gt: 0 }
    };

    // SEARCH FUNCTIONALITY
    if (search && search.trim()) {
      const searchTerm = search.trim();
      console.log('Searching for:', searchTerm); 
      
      const [matchingBrands, matchingCategories] = await Promise.all([
        Brand.find({
          brandName: { $regex: searchTerm, $options: 'i' },
          isBlocked: false
        }).select('brandName').lean(),
        
        Category.find({
          name: { $regex: searchTerm, $options: 'i' },
          isListed: true
        }).select('_id name').lean()
      ]);

      // Build search query using $or operator
      const searchConditions = [
        // Search in product name
        { productName: { $regex: searchTerm, $options: 'i' } },
        // Search in product description (if you have this field)
        { productDescription: { $regex: searchTerm, $options: 'i' } }
      ];

      // Add brand matches
      if (matchingBrands.length > 0) {
        searchConditions.push({
          brand: { $in: matchingBrands.map(b => b.brandName) }
        });
      }

      // Add category matches
      if (matchingCategories.length > 0) {
        searchConditions.push({
          category: { $in: matchingCategories.map(c => c._id) }
        });
      }

      // Apply search conditions
      query.$or = searchConditions;
    }

    // 🏷️ CATEGORY FILTER
    let selectedCategoryName = null;
    if (category) {
      try {
        const findCategory = await Category.findById(category);
        if (findCategory && findCategory.isListed) {
          query.category = findCategory._id;
          selectedCategoryName = findCategory.name;
        }
      } catch (err) {
        console.log('Invalid category ID:', category);
      }
    }

    // 🏢 BRAND FILTER
    let selectedBrandName = null;
    if (brand) {
      try {
        const findBrand = await Brand.findById(brand);
        if (findBrand && !findBrand.isBlocked) {
          query.brand = findBrand.brandName;
          selectedBrandName = findBrand.brandName;
        }
      } catch (err) {
        console.log('Invalid brand ID:', brand);
      }
    }

    // 💰 PRICE RANGE FILTER
    let priceRange = null;
    if (gt !== undefined && lt !== undefined) {
      const minPrice = parseInt(gt) || 0;
      const maxPrice = parseInt(lt) || 0;
      
      if (maxPrice > minPrice) {
        query.salesPrice = {
          $gte: minPrice,
          $lte: maxPrice
        };
        
        // Set price range description for display
        if (minPrice === 0 && maxPrice === 500) {
          priceRange = "Under ₹500";
        } else if (minPrice === 500 && maxPrice === 1000) {
          priceRange = "₹500 - ₹1000";
        } else if (minPrice === 1000 && maxPrice === 1500) {
          priceRange = "₹1000 - ₹1500";
        } else if (minPrice === 1500) {
          priceRange = "Above ₹1500";
        } else {
          priceRange = `₹${minPrice} - ₹${maxPrice}`;
        }
      }
    }

    // 🎯 TRACK USER SEARCH HISTORY (if logged in)
    if (userData && (category || brand || search)) {
      try {
        const searchEntry = {
          searchTerm: search || null,
          category: category || null,
          brand: brand || null,
          searchedOn: new Date()
        };
        
        // Keep only last 10 searches
        if (userData.searchHistory && userData.searchHistory.length >= 10) {
          userData.searchHistory = userData.searchHistory.slice(-9);
        }
        
        if (!userData.searchHistory) {
          userData.searchHistory = [];
        }
        
        userData.searchHistory.push(searchEntry);
        await userData.save();
      } catch (err) {
        console.log('Error saving search history:', err);
      }
    }

    // 📊 SORTING
    const sortOption = getSortOption(sort);
    console.log('Sort option applied:', sortOption); // Debug log

    // 📦 FETCH PRODUCTS WITH ALL FILTERS APPLIED
    console.log('Final query:', JSON.stringify(query, null, 2)); // Debug log
    
    const [products, totalProducts] = await Promise.all([
      Product.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      
      Product.countDocuments(query)
    ]);

    console.log(`Found ${totalProducts} products matching criteria`); // Debug log

    // Calculate pagination
    const totalPages = Math.ceil(totalProducts / limit);

    // 📁 FETCH ALL CATEGORIES AND BRANDS FOR FILTER OPTIONS
    const [categories, brands] = await Promise.all([
      Category.find({ isListed: true }).lean(),
      Brand.find({ isBlocked: false }).lean()
    ]);

    // 📄 RENDER THE PAGE
    res.render("shop", {
      user: userData,
      products,
      category: categories,
      brand: brands,
      
      // Current filter values
      search: search || '',
      sort: sort || '',
      selectedCategory: category || '',
      selectedBrand: brand || '',
      selectedCategoryName,
      selectedBrandName,
      priceRange,
      gt: gt || '',
      lt: lt || '',
      
      // Pagination
      currentPage,
      totalPages,
      totalProducts,
      
      // Additional info for frontend
      hasFilters: !!(search || category || brand || (gt && lt))
    });

  } catch (error) {
    console.error("Error loading shopping page:", error);
    res.status(500).render("pageNotFound", {
      message: "Something went wrong while loading the shop page"
    });
  }
};

// 🔧 HELPER FUNCTION: Get MongoDB sort option
function getSortOption(sort) {
  const sortOptions = {
    'priceAsc': { salesPrice: 1 },
    'priceDesc': { salesPrice: -1 },
    'nameAsc': { productName: 1 },
    'nameDesc': { productName: -1 },
    'newest': { createdAt: -1 },
    'oldest': { createdAt: 1 }
  };
  
  return sortOptions[sort] || { createdAt: -1 }; // Default to newest first
}

// 🔧 HELPER FUNCTION: Clean and validate query parameters
function cleanQueryParams(query) {
  const cleaned = {};
  
  // Clean search term
  if (query.search && typeof query.search === 'string') {
    cleaned.search = query.search.trim();
  }
  
  // Validate sort option
  const validSorts = ['priceAsc', 'priceDesc', 'nameAsc', 'nameDesc', 'newest', 'oldest'];
  if (query.sort && validSorts.includes(query.sort)) {
    cleaned.sort = query.sort;
  }
  
  // Validate MongoDB ObjectIds for category and brand
  if (query.category && /^[0-9a-fA-F]{24}$/.test(query.category)) {
    cleaned.category = query.category;
  }
  
  if (query.brand && /^[0-9a-fA-F]{24}$/.test(query.brand)) {
    cleaned.brand = query.brand;
  }
  
  // Validate price range
  if (query.gt && !isNaN(query.gt)) {
    cleaned.gt = Math.max(0, parseInt(query.gt));
  }
  
  if (query.lt && !isNaN(query.lt)) {
    cleaned.lt = Math.max(0, parseInt(query.lt));
  }
  
  // Validate page number
  if (query.page && !isNaN(query.page)) {
    cleaned.page = Math.max(1, parseInt(query.page));
  }
  
  return cleaned;
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
  // filterProduct,
  // filterByPrice,
  // searchProducts,
}