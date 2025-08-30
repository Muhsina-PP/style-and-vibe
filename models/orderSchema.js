const mongoose = require ("mongoose");
const {Schema} = mongoose;
const {v4:uuidv4} = require ("uuid");
const orderSchema = new Schema ({
  orderId :{
    type : String,
    default : ()=>uuidv4(),
    unique : true
  },
  orderedItems : [{
    product : {
      type : Schema.Types.ObjectId,
      ref : "Product",
      required : true
    },
    quantity : {
      type : Number,
      required : true
    },
    price : {
      type : Number,
      default : 0
    },
    status: {
        type: String,
        enum: ["Ordered", "Cancelled","Delivered","Return Requested","Return Rejected","Return Approved", "Returned"],
        default: "Ordered"
      },
      returnReason: {
        type: String 
      },
  }],
  totalPrice : {
    type : Number,
    required : true
  },
  discount : {
    type : Number,
    default : 0
  },
  finalAmount : {
    type : Number,
    required : true
  },
  address :{
    addressType : {
      type : String,
      required : true
    },
    name :{
      type : String,
      required : true
    },
    city : {
      type : String,
      required : true
    },
    landMark :{
      type : String,
      required : true
    },
    state : {
      type : String,
      required : true
    },
    pincode : {
      type : Number,
      required : true
    },
    phone :{
      type : String,
      required : true
    },
    altphone : {
      type : String,
      required : true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  invoiceDate : {
    type : Date
  },
  status : {
    type : String,
    required :true,
    enum : ["Pending", "Processing", "Shipped", "Out Of Delivery" ,"Delivered" ,"Cancelled", "Return request", "Returned"]
  },
  createdOn :{
    type : Date,
    default : Date.now,
    required : true
  },
  coupenApplied : {
    type : Boolean,
    default : false
  }
})

const Order = mongoose.model ("Order", orderSchema)
module.exports = Order;