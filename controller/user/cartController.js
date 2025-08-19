const Cart = require("../../models/cartSchema")
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Wishlist = require('../../models/wishlistSchema')
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema")
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

// const getCheckoutPage = async(req,res) =>{
//   try {
//     const userId = req.session.user;
//     if(!userId) return res.redirect("/login")

//     const cart = await Cart.findOne({userId}).populate("items.productId") 

//     let total = 0; 
//     cart.items.forEach(item =>{
//       if(item.productId && item.productId.price){
//         const itemPrice = item.productId.price;
//         item.totalPrice = item.quantity * itemPrice;
//         total += item.totalPrice;
//       }else{
//         console.log("Product data is missing for item:", item);
//         item.totalPrice = 0;
//       }
      
//     })


//     res.render("checkout", {
//       cartItems : cart.items,
//       total : total

//     })
//   } catch (error) {
//     console.log("Error getting checkout page : ",error);
//     res.redirect("/pageNotFound")
//   }
// }

// const getCheckoutPage = async(req, res) => {
//   try {
//     const userId = req.session.user;
//     if(!userId) return res.redirect("/login")

//     const cart = await Cart.findOne({userId}).populate("items.productId") 
//     if(!cart || !cart.items.length) {
//       return res.render("checkout", { cartItems: [], total: 0, emptyCart: true , addresses :[], user: null, subtotal :0, totalDiscount :0});
//     }

//     const validCartItems = cart.items.filter(item => item.productId != null);

//     let subtotal = 0;
//     let totalDiscount = 0;

//     validCartItems.forEach(item => {
//       // Calculate the item price
//       const itemPrice = item.price || (item.productId ? item.productId.price : 0);
      
//       // Calculate item total price
//       const itemTotal = item.quantity * itemPrice;
//       item.totalPrice = itemTotal;
      
//       // Add to subtotal
//       subtotal += itemTotal;
      
//       // Calculate discount if applicable
//       if (item.productId && item.productId.discount && item.productId.discount > 0) {
//         const discountAmount = (item.productId.discount / 100) * itemTotal;
//         item.discount = discountAmount;
//         totalDiscount += discountAmount;
//       } else {
//         item.discount = 0;
//       }
//     });
    
//     // Calculate final total
//     const total = subtotal - totalDiscount;
    
//     // Update cart in database with only valid items
//     cart.items = validCartItems;
//     await cart.save();
    
//     // Get user's addresses
//     const addresses = await Address.find({ userId });
    
//     // Ensure at least one address is set as default if addresses exist
//     if (addresses.length > 0 && addresses.length === 0) {
//       let hasDefault = addresses.some(addr => addr.isDefault === true);
      
//       if (!hasDefault && addresses.length > 0) {
//         // Set the first address as default if no default exists
//         addresses[0].isDefault = true;
//         await addresses[0].save();
//       }
//     }

//     console.log(validCartItems.map(item => item.productId.productImages));

    
//     // Get user data
//     const user = await User.findById(userId);
    
//     res.render("checkout", {
//       cartItems: validCartItems,
//       subtotal: subtotal,
//       totalDiscount: totalDiscount,
//       total: total,
//       addresses: addresses,
//       user: user
//     });
//   } catch (error) {
//     console.log("Error getting checkout page:", error);
//     res.status(500).redirect("/pageNotFound");
//   }
// };
// const getCheckoutPage = async(req, res) => {
//   try {
//     const userId = req.session.user;
//     if(!userId) return res.redirect("/login")

//     const cart = await Cart.findOne({userId}).populate("items.productId") 
//     if(!cart || !cart.items.length) {
//       return res.render("checkout", { cartItems: [], total: 0, emptyCart: true , addresses: [], user: null, subtotal: 0, totalDiscount: 0});
//     }

//     const validCartItems = cart.items.filter(item => item.productId != null);

//     let subtotal = 0;
//     let totalDiscount = 0;

//     validCartItems.forEach(item => {
//       // Calculate the item price
//       const itemPrice = item.price || (item.productId ? item.productId.price : 0);
      
//       // Calculate item total price
//       const itemTotal = item.quantity * itemPrice;
//       item.totalPrice = itemTotal;
      
//       // Add to subtotal
//       subtotal += itemTotal;
      
//       // Calculate discount if applicable
//       if (item.productId && item.productId.discount && item.productId.discount > 0) {
//         const discountAmount = (item.productId.discount / 100) * itemTotal;
//         item.discount = discountAmount;
//         totalDiscount += discountAmount;
//       } else {
//         item.discount = 0;
//       }
//     });
    
//     // Calculate final total
//     const total = subtotal - totalDiscount;
    
//     // Update cart in database with only valid items
//     cart.items = validCartItems;
//     await cart.save();
    
//     // Get user's addresses
//     const addresses = await Address.find({ userId });
    
//     // Ensure at least one address is set as default if addresses exist
//     if (addresses.length > 0) {
//       let hasDefault = addresses.some(addr => addr.isDefault === true);
      
//       if (!hasDefault) {
//         // Set the first address as default if no default exists
//         addresses[0].isDefault = true;
//         await addresses[0].save();
//       }
//     }
    
//     // Get user data
//     const user = await User.findById(userId);
    
//     // Log the addresses being sent to the template
//     console.log("Addresses being sent to checkout template:", addresses);
    
//     res.render("checkout", {
//       cartItems: validCartItems,
//       subtotal: subtotal,
//       totalDiscount: totalDiscount,
//       total: total,
//       addresses: addresses,
//       user: user
//     });
//   } catch (error) {
//     console.log("Error getting checkout page:", error);
//     res.status(500).redirect("/pageNotFound");
//   }
// };
const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect("/login");

    // Fetch cart with populated product info
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || !cart.items.length) {
      return res.render("checkout", {
        cartItems: [],
        subtotal: 0,
        totalDiscount: 0,
        total: 0,
        addresses: [],
        user: null,
        emptyCart: true
      });
    }

    // Filter out invalid products
    const validCartItems = cart.items.filter(item => item.productId != null);

    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;

    validCartItems.forEach(item => {

      const itemPrice = item.price || item.productId.price || 0;
      const itemTotal = item.quantity * itemPrice;
      item.totalPrice = itemTotal;

      subtotal += itemTotal;

      if (item.productId.discount && item.productId.discount > 0) {
        const discountAmount = (item.productId.discount / 100) * itemTotal;
        item.discount = discountAmount;
        totalDiscount += discountAmount;
      } else {
        item.discount = 0;
      }
    });

    const total = subtotal - totalDiscount;

    // Save valid cart back to DB
    cart.items = validCartItems;
    await cart.save();

    // Fetch address document
    const addressDoc = await Address.findOne({ userId });

    let addresses = [];

    if (addressDoc && addressDoc.address.length > 0) {
      addresses = addressDoc.address;

      // Ensure one default address exists
      const hasDefault = addresses.some(addr => addr.isDefault === true);
      if (!hasDefault) {
        addresses[0].isDefault = true;
        await addressDoc.save(); // save the updated address list
      }
    }

    // Get user data
    const user = await User.findById(userId);

    console.log("Addresses being sent to checkout template:", addresses);

    return res.render("checkout", {
      cartItems: validCartItems,
      subtotal,
      totalDiscount,
      total,
      addresses,
      user,
      emptyCart: false
    });
  } catch (error) {
    console.error("Error getting checkout page:", error);
    return res.status(500).redirect("/pageNotFound");
  }
};

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { selected, paymentMethod } = req.body; // assuming address and payment info is submitted from checkout form

    console.log("HIIII..."); 
    console.log("Address ID and payment method", selected, paymentMethod);
    
    // Get user's cart
    const cart = await Cart.findOne({ user: userId }).populate('items.productId');

    if (!cart || cart.items.length === 0) {
      return res.redirect("/?error=emptyCart");
    }

    // Check and update product stock
    for (const item of cart.items) {
      const product = item.productId;

      if (product.quantity <= item.quantity) {
        return res.render("checkout", { 
          error: `Insufficient stock for ${product.productName}`,
          cart: cart
        });
      }

      // Decrease product stock
      product.quantity -= item.quantity;

      // If stock reaches 0, update status
      if (product.quantity === 0) {
        product.status = "Out of stock";
      }

      await product.save();
    }

    // Calculate prices
    const totalPrice = cart.items.reduce((sum, item) => {
      return sum + (item.productId.salesPrice * item.quantity);
    }, 0);

    const discount = cart.discount || 0; // assuming you store this in cart
    const finalAmount = totalPrice - discount;

    // Create orderedItems array for Order
    const orderedItems = cart.items.map(item => ({
      product: item.productId._id,
      quantity: item.quantity,
      price: item.productId.salesPrice,
    }));

    // Create the order
    const newOrder = new Order({
      user: userId, // Add user reference
      orderedItems,
      totalPrice,
      discount,
      finalAmount,
      address: addressId,
      paymentMethod, // Include payment method
      invoiceDate: new Date(),
      status: "Pending",
      couponApplied: cart.couponApplied || false,
    });

    console.log("New Order : ",newOrder)

    await newOrder.save();

    // Clear the user's cart
    await Cart.findOneAndDelete({ user: userId });

    // Redirect to order success page
    res.redirect(`/order-success?orderId=${newOrder._id}`);
  } catch (error) {
    console.error("Order placement error:", error);
    res.status(500).render("checkout", { error: "An error occurred while placing your order" });
  }
};

const getOrderSuccess = async (req, res) => {
  try {
    const orderId = req.query.orderId;

    if (!orderId) {
      return res.redirect("/shop");
    }

    // Find the order by _id 
    const order = await Order.findById(orderId)
      .populate("orderedItems.product") // to show product details if needed
      .populate("address");             // assuming this is user's address (ref: User)

    if (!order) {
      return res.redirect("/shop");
    }

    res.render("order-success", {
      orderId: order._id, // Pass the MongoDB _id for the view
      orderNumber: order.orderNumber || order._id, // In case you have a separate order number field
      orderDate: order.invoiceDate,
      order
    });
  } catch (error) {
    console.error("Error loading order success page:", error);
    res.redirect("/shop");
  }
};


module.exports = {
  getCartPage,
  addToCart,
  // updateCartQuantity,
  checkProductInCart,
  removeFromCart,
  getCheckoutPage,
  placeOrder,
  getOrderSuccess
}