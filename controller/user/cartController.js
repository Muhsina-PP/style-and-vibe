const Cart = require("../../models/cartSchema")
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Wishlist = require('../../models/wishlistSchema')
const mongoose = require("mongoose")


const getCartPage = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) return res.redirect('/login');

    let cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'productName brand salesPrice salePrice regularPrice stock quantity productImages productImage'
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.render('cart', {
        cartItems: [],
        total: 0,
        user: req.session.user || null,
        isLoggedIn: !!req.session.user
      });
    }

    // Filter out items with null productId
    const validItems = cart.items.filter(item => item.productId);

    // Recalculate totals to ensure accuracy
    let total = 0;
    validItems.forEach(item => {
      const itemPrice = item.productId.salesPrice !== undefined ? 
        item.productId.salesPrice : 
        (item.productId.salePrice !== undefined ? item.productId.salePrice : item.price);
      
      // Update item price and total price in case product price changed
      item.price = itemPrice;
      item.totalPrice = item.quantity * itemPrice;
      
      total += item.totalPrice;
    });

    // Save any price updates
    if (validItems.length > 0) {
      await cart.save();
    }

    res.render('cart', {
      cartItems: validItems,
      total,
      user: req.session.user || null,
      isLoggedIn: !!req.session.user
    });

  } catch (err) {
    console.error("Error loading cart page:", err);
    res.redirect('/pageNotFound');
  }
};



const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect('/login');

    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).send("Product not found");

    // Check product inventory/stock
    if (product.quantity <= 0) {
      return res.json({
        success: false,
        message: "This product is out of stock."
      });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      item =>
               item.productId.toString() === new mongoose.Types.ObjectId(`${productId}`).toString()       
    );

    const qty = parseInt(quantity) || 1;
    
    const itemPrice = product.salesPrice;
    
    if (!itemPrice || isNaN(itemPrice)) {
      return res.json({
        success: false,
        message: "Invalid product price"
      });
    }

    if (existingItemIndex > -1) {
      // Check if adding more would exceed stock
      console.log("Existing index : ",existingItemIndex);
      
      if (cart.items[existingItemIndex].quantity + qty > product.quantity) {
        return res.json({
          success: false,
          message: `Only ${product.quantity} units available in stock`
        });
      }
      
        cart.items[existingItemIndex].quantity += qty;
        cart.items[existingItemIndex].price = itemPrice; // Ensure price is updated
        cart.items[existingItemIndex].totalPrice = cart.items[existingItemIndex].quantity * itemPrice;
        
      } else {
      // Check if quantity exceeds stock
      if (qty > product.quantity) {
        return res.json({
          success: false,
          message: `Only ${product.quantity} units available in stock`
        });
      }
      
      cart.items.push({
        productId: product._id,
        quantity: qty,
        price: itemPrice,
        totalPrice: itemPrice * qty
      });
    }

    await cart.save();

    // IMPORTANT: Remove from wishlist using $pull operator

    const wishlistResult = await Wishlist.updateOne(
      { userId: userId },
      { $pull: { products: { productId: productId } } }
    );

    console.log("Wishlist result : ",wishlistResult)

    return res.json({
      success: true,
      message: "Product added to cart successfully!"
    });

  } catch (err) {
    console.error("Error adding to cart:", err.message);
    
    return res.status(500).json({
      success: false,
      message: "Error adding product to cart"
    });
  }
};

// const updateCartQuantity = async (req, res) => {
//   try {
//     const userId = req.session.user;
//     if (!userId) {
//       return res.json({
//         success: false,
//         message: "Please log in to update your cart"
//       });
//     }

//     const { itemId, quantity } = req.body;
//     const qty = parseInt(quantity);

//     if (!itemId || isNaN(qty) || qty < 1) {
//       return res.json({
//         success: false,
//         message: "Invalid item ID or quantity"
//       });
//     }

//     // Find the cart
//     const cart = await Cart.findOne({ userId });
//     if (!cart) {
//       return res.json({
//         success: false,
//         message: "Cart not found"
//       });
//     }

//     // Find the item in the cart
//     const cartItem = cart.items.id(itemId);
//     if (!cartItem) {
//       return res.json({
//         success: false,
//         message: "Item not found in cart"
//       });
//     }

//     // Get the product to check quantity
//     const product = await Product.findById(cartItem.productId);
//     if (!product) {
//       return res.json({
//         success: false,
//         message: "Product not found"
//       });
//     }

//     // Get stock (support both field names)
//     const stock = product.stock !== undefined ? product.stock : 
//                  (product.quantity !== undefined ? product.quantity : 0);

//     // Check if requested quantity exceeds stock
//     if (qty > stock) {
//       return res.json({
//         success: false,
//         message: `Only ${stock} units available in stock`
//       });
//     }

//     // Update the quantity and total price
//     const price = product.salesPrice !== undefined ? product.salesPrice : 
//                  (product.salePrice !== undefined ? product.salePrice : cartItem.price);
    
//     cartItem.quantity = qty;
//     cartItem.price = price; // Ensure the price is up-to-date
//     cartItem.totalPrice = price * qty;

//     await cart.save();

//     return res.json({
//       success: true,
//       message: "Cart updated successfully",
//       newQuantity: qty,
//       newTotal: cartItem.totalPrice
//     });

//   } catch (err) {
//     console.error("Error updating cart quantity:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Error updating cart"
//     });
//   }
// };


const checkProductInCart = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.json({
        inCart: false
      });
    }

    const { productId } = req.query;
    if (!productId) {
      return res.json({
        inCart: false
      });
    }

    // Find the cart
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.json({
        inCart: false
      });
    }

    // Check if the product exists in the cart
    const productExists = cart.items.some(item => 
      item.productId && item.productId.toString() === productId
    );

    return res.json({
      inCart: productExists
    });

  } catch (err) {
    console.error("Error checking product in cart:", err);
    return res.json({
      inCart: false
    });
  }
};


const removeFromCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const itemId = req.params.itemId; 

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const initialLength = cart.items.length;

    // Remove by item _id
    cart.items = cart.items.filter(
      item => item._id.toString() !== itemId.toString()
    );

    if (cart.items.length === initialLength) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    await cart.save();

    return res.status(200).json({ success: true, message: "Item removed from cart" });

  } catch (error) {
    console.error("Error removing from cart:", error.message);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getCheckoutPage = async(req,res) =>{
  try {
    const userId = req.session.user;
    if(!userId) return res.redirect("/login")

    const cart = await Cart.findOne({userId}).populate("items.productId") 

    let total = 0; 
    cart.items.forEach(item =>{
      if(item.productId && item.productId.price){
        const itemPrice = item.productId.price;
        item.totalPrice = item.quantity * itemPrice;
        total += item.totalPrice;
      }else{
        console.log("Product data is missing for item:", item);
        item.totalPrice = 0;
      }
      
    })


    res.render("checkout", {
      cartItems : cart.items,
      total : total

    })
  } catch (error) {
    console.log("Error getting checkout page : ",error);
    res.redirect("/pageNotFound")
  }
}



module.exports = {
  getCartPage,
  addToCart,
  // updateCartQuantity,
  checkProductInCart,
  removeFromCart,
  getCheckoutPage
}