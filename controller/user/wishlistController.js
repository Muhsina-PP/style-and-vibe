// Import required models
const User = require('../../models/userSchema'); 
const Product = require('../../models/productSchema'); 
const Wishlist = require('../../models/wishlistSchema');
const { default: mongoose } = require('mongoose');

// Get Wishlist Items
const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect('/login');
    }
    
    const user = await User.findById(userId);
    
      const products = await Wishlist.findOne({userId}).populate({path : 'products.productId', populate : {path : 'category'}})
      console.log("Products : ",products.products);

    res.render("wishlist", {
      user,
      wishlist: products.products
    });
  } catch (error) {
    console.log("Error in wishlist:", error);
    res.redirect('/pageNotFound');
  }
};

// Add to Wishlist
const addToWishlist = async (req, res) => {
  try {
    const productId = req.body.productId;
    const userId = req.session.user;
        
    if (!userId) {
      console.error('User not logged in.');
      return res.status(401).json({
        success: false,
        message: "Please login to add items to wishlist"
      });
    }
    
    const wishlist = await Wishlist.findOne({userId});
    console.log("Wishlist",wishlist)
    if(!wishlist){
      const newWishlist = new Wishlist({userId})
      newWishlist.products.push({productId})
      await newWishlist.save();
      return res.status(200).json({
        success: true,
        message: "Product added to wishlist"
      });
    }

    
    const existingProduct = wishlist.products.find((product)=>
        product.productId.toString() === new mongoose.Types.ObjectId(`${productId}`).toString()   
    )
    if(existingProduct){
      return res.status(409).json({
            success: false,
            message: "Product is already in wishlist"
          });
    }
    
    wishlist.products.push({productId})
    await wishlist.save();
    return res.status(200).json({
      success: true,
      message: "Product added to wishlist"
    });

    
  } catch (error) {
    console.error("Error adding to wishlist:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const productId = req.body.productId;
    const userId = req.session.user;
    
    if (!userId) {
      console.error('User not logged in.');
      return res.status(401).json({
        success: false,
        message: "Please login to remove items from wishlist"
      });
    }
    
    const wishlist = await Wishlist.findOne({ userId: userId });
    
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found"
      });
    }
    
    const updateResult = await Wishlist.updateOne(
      { userId: userId },
      { $pull: { products: { productId: productId } } }
    );
    
    console.log("Wishlist update result:", updateResult);
    
    if (updateResult.modifiedCount === 0) {
      console.log("No modifications were made to the wishlist");
    }
    
    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist"
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist
};