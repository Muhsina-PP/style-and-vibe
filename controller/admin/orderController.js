const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema")

const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build filter object based on your schema
        const filters = {};
        
        if (req.query.orderId) {
            filters.orderId = new RegExp(req.query.orderId, 'i');
        }
        
        if (req.query.customerName) {
            filters['address.name'] = new RegExp(req.query.customerName, 'i');
        }
        
        if (req.query.status) {
            filters.status = req.query.status;
        }
        
        if (req.query.dateFrom || req.query.dateTo) {
            filters.createdOn = {};
            if (req.query.dateFrom) {
                filters.createdOn.$gte = new Date(req.query.dateFrom);
            }
            if (req.query.dateTo) {
                filters.createdOn.$lte = new Date(req.query.dateTo + 'T23:59:59.999Z');
            }
        }

        // Get orders with sorting by createdOn (newest first)
        const orders = await Order.find(filters)
            .populate('orderedItems.product', 'productName salePrice productImage') // Adjust field names as per your Product model
            .sort({ createdOn: -1 }) // Sort by createdOn descending
            .skip(skip)
            .limit(limit)
            .lean();

        // Get total count for pagination
        const totalOrders = await Order.countDocuments(filters);
        const totalPages = Math.ceil(totalOrders / limit);

        // Get summary statistics based on your schema
        const summaryStats = await Promise.all([
            Order.countDocuments(), // Total orders
            Order.countDocuments({ 
                status: { $in: ['Pending', 'Processing'] } 
            }), // Pending orders
            Order.countDocuments({ status: 'Delivered' }), // Completed orders
            Order.aggregate([
                { $match: { status: 'Delivered' } },
                { $group: { _id: null, total: { $sum: '$finalAmount' } } }
            ]) // Total revenue from delivered orders
        ]);

        const [totalOrdersCount, pendingOrders, completedOrders, revenueResult] = summaryStats;
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        res.render('orderDetails', {
            orders,
            currentPage: page,
            totalPages,
            limit,
            totalOrders: totalOrdersCount,
            pendingOrders,
            completedOrders,
            totalRevenue: totalRevenue.toFixed(2),
            filters: req.query,
            title: 'Orders Management'
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('error', { 
            message: 'Error loading orders',
            error: error 
        });
    }
};

const getSingleOrderPage = async (req,res) =>{
  try {
    const orderId = req.params.orderId;

    // console.log("my Order id :",orderId);
    
    const order = await Order.findById(orderId)
    .populate('orderedItems.product')
    if(!order){
      return res.status(404).send('Order not found')
    }
    // console.log("OOORDER : ", order)
    res.render('single-order-page', { order });

  } catch (error) {
    console.error("Error fetching single order page : ",error)
    return res.status(404).send('Server Error')
  }
}

const updateOrderStatus = async (req, res) => {
  try {
    // Step 1: Get order ID and new status
    const orderId = req.params.orderId;
    const newStatus = req.body.status;

    console.log('Updating order:', orderId);
    console.log('New status from form:', newStatus);

    // Step 2: Check if status is valid (must match your schema exactly)
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Out Of Delivery', 'Delivered', 'Cancelled', 'Return request', 'Returned'];
    
    if (!validStatuses.includes(newStatus)) {
      console.log('Invalid status received:', newStatus);
      return res.redirect(`/admin/orderDetails/${orderId}?error=invalid`);
    }

    // Step 3: Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.redirect('/admin/orderDetails?error=notfound');
    }

    // Step 4: Update the order status
    order.status = newStatus;

    // Step 5: Update item statuses too
    if (newStatus === 'Delivered') {
      // All items become delivered (except cancelled ones)
      order.orderedItems.forEach(item => {
        if (item.status !== 'Cancelled') {
          item.status = 'Delivered';
        }
      });
      order.invoiceDate = new Date();
    } 
    else if (newStatus === 'Cancelled') {
      // All items become cancelled (except delivered ones)
      order.orderedItems.forEach(item => {
        if (item.status !== 'Delivered') {
          item.status = 'Cancelled';
        }
      });
    }

    // Step 6: Save to database
    await order.save();

    console.log('Order updated successfully');
    
    // Step 7: Go back to same page with success message
    res.redirect(`/admin/orderDetails/${orderId}?success=updated`);

  } catch (error) {
    console.log('Error:', error);
    res.redirect(`/admin/orderDetails/${req.params.orderId}?error=servererror`);
  }
};


const handleReturnRequest = async (req,res) =>{
   try {
    const { orderId } = req.params;
    const { decision } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.redirect('/admin/orderDetails');
    }

    if (order.status !== 'Return Requested') {
      return res.redirect(`/admin/orderDetails/${orderId}`);
    }


    if (decision === 'approve') {
      order.status = 'Returned';
    } else if (decision === 'reject') {
      order.status = 'Return Rejected'; // Add this status in your EJS logic as needed
    } else {
      return res.redirect(`/admin/orderDetails/${orderId}`);
    }

    await order.save();

    // req.flash('success', `Return request ${decision === 'approve' ? 'approved' : 'rejected'} successfully`);
    res.redirect(`/admin/orderDetails/${orderId}`);
  } catch (error) {
    console.error('Error handling return request:', error);
    // req.flash('error', 'Server error');
    res.redirect(`/admin/orderDetails/${req.params.orderId}`);
  }
}

module.exports = {
  getOrders,
  getSingleOrderPage,
  updateOrderStatus,
  handleReturnRequest
}