const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")

// const productDetails = async(req,res) =>{
//   try {
    
//     const userId = req.session.user;
//     const userData = await User.findById(userId)

//     const productId = req.query.id;
//     const product = await Product.findById(productId).populate('category')
//     const findCategory = product.category;
//     const categoryOffer = findCategory?.categoryOffer || 0;
//     const productOffer = product.productOffer || 0;
//     const totalOffer = categoryOffer + productOffer;
//     const avgRating = product.rating || 0;
//     const numberOfReviews = product.numberOfReviews || 0;


//     res.render ("product-details",{
//       user : userData,
//       product : product,
//       quantity : product.quantity,
//       totalOffer : totalOffer,
//       category : findCategory,
//       avgRating ,
//       numberOfReviews,
//       relatedProducts
//     })


//   } catch (error) {
//     console.error("Error fetching product detials page  : ",error)
//     res.redirect("/user/pageNotFound")
//   }
// }
const productDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);

    const productId = req.query.id;
    const product = await Product.findById(productId).populate('category');
    const findCategory = product.category;
    const categoryOffer = findCategory?.categoryOffer || 0;
    const productOffer = product.productOffer || 0;
    const totalOffer = categoryOffer + productOffer;
    const avgRating = product.rating || 0;
    const numberOfReviews = product.numberOfReviews || 0;

    //  relatedProducts 
    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      category: product.category
    }).limit(4);

    res.render("product-details", {
      user: userData,
      product,
      quantity: product.quantity,
      totalOffer,
      category: findCategory,
      avgRating,
      numberOfReviews,
      relatedProducts 
    });

  } catch (error) {
    console.error("Error fetching product details page:", error);
    res.redirect("/user/pageNotFound");
  }
};


const loadCategoryPage = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findById(categoryId);
    const products = await Product.find({ category: categoryId });

    res.render('category-products', { category, products });

  } catch (error) {
    console.error("Error loading category page:", error);
    res.redirect('/pageError');
  }
};




module.exports = {
  productDetails,
  loadCategoryPage
}