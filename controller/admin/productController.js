const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Brand = require("../../models/brandSchema")
const User = require ("../../models/userSchema")
const fs = require("fs")
const path = require ("path")
const sharp = require("sharp")

const getProductAddPage = async (req,res)=>{
  try {
    const category = await Category.find({isListed :true})
    const brand = await Brand.find({isBlocked : false})
    res.render("product-add", {
      cat : category,
      brand :brand
    })

  } catch (error) {
    res.redirect("/pageError")
    console.log("Error loading product management page : ",error);
    
  }
}

const addProducts = async (req,res)=>{
  try {
    
    const products = req.body;
    const productExists = await Product.findOne({
      productName : products.productName
    })
    if(!productExists){
      const images = []
      if(req.files && req.files.length>0){
        for(let i=0; i<req.files.length; i++){
          const originalImagePath = req.files[i].path;
          const resizedImagePath = path.join('public','uploads','product-images', req.files[i].filename)
          await sharp(originalImagePath).resize({width:440, height:440}).toFile(resizedImagePath)
          images.push(req.files[i].filename)
        }
      }
      const categoryId = await Category.findOne({name : products.category})
      if(!categoryId){
        return res.status(400).json("Invalid category name")
      }

      const newProduct = new Product({
        productName : products.productName,
        description : products.description,
        brand : products.brand,
        category : categoryId._id,
        regularPrice : Number(products.regularPrice),
        salesPrice : Number(products.salesPrice),
        createdOn : new Date(),
        quantity : products.quantity,
        size : products.size,
        color : products.color,
        productImage : images,
        status : 'Available'
      })
      await newProduct.save();
      return res.redirect("/admin/addProducts")
    }else{
      return res.status(400).json("Product already exists, pls try with another name..")
    }

  } catch (error) {
    console.error("Error saving product : ", error)
    return res.redirect("/pageError")
  }
}

const getAllProducts = async(req,res) =>{

  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 4;
     
    const productData = await Product.find({
      $or : [
        {productName : {$regex : new RegExp(".*"+search+".*","i")}},
        {brand : {$regex : new RegExp(".*"+search+".*","i")} }
      ],
    }).sort({ _id: -1 }).limit(limit*1).skip((page-1)*limit).populate('category').exec()

    const count = await Product.find({
      $or : [
        {productName : {$regex : new RegExp(".*"+search+".*","i")}},
        {brand : {$regex : new RegExp(".*"+search+".*","i")} }
      ],
    }).countDocuments();

    const category = await Category.find({isListed : true})
    const brand = await Brand.find({isBlocked : false})

    if(category && brand){
      res.render("products",{
        data: productData,
        currentPage : page,
        totalPages : Math.ceil(count/limit),
        cat : category,
        brand : brand,
        search
      })
    }else{
      res.render("admin-error")
    }

  } catch (error) {
    res.redirect("/pageError");
    console.log(("Error displaying all products : ",error));
    
  }
}


const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;

    const product = await Product.findOne({ _id: productId });
    if (!product) return res.json({ status: false, message: "Product not found" });

    const category = await Category.findOne({ _id: product.category });
    if (!category) return res.json({ status: false, message: "Category not found" });

    if (category.categoryOffer > percentage) {
      return res.json({
        status: false,
        message: "This product's category already has a better offer",
      });
    }

    const discountAmount = Math.floor(product.regularPrice * (percentage / 100));
    product.salesPrice = product.regularPrice - discountAmount;
    product.productOffer = parseInt(percentage);

    await product.save();

    if (category.categoryOffer > 0) {
      category.categoryOffer = 0;
      await category.save();
    }

    return res.json({ status: true });
  } catch (error) {
    console.error("Error in addProductOffer:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};




const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await Product.findOne({ _id: productId });
    if (!product) return res.json({ status: false, message: "Product not found" });

    product.salesPrice = product.regularPrice;
    product.productOffer = 0;

    await product.save();

    return res.json({ status: true });
  } catch (error) {
    console.error("Error in removeProductOffer:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

const blockProduct = async (req,res)=>{
  try {
    let id = req.query.id;
    await Product.updateOne({_id:id},{$set:{isBlocked:true}});
    res.redirect('/admin/products');
  } catch (error) {
    res.redirect('/pageError');
  }
}

const unblockProduct = async (req,res)=>{
  try {
    let id = req.query.id;
    await Product.updateOne({_id:id},{$set:{isBlocked:false}});
    res.redirect('/admin/products'); 
  } catch (error) {
    res.redirect('/pageError');
  }
}

const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;

    const product = await Product.findById(id);
    console.log("Fetched product:", product);

    const category = await Category.find();
    const brand = await Brand.find();

    res.render('editproduct', {
      cat:category,
      product:product,
      brand:brand
    });

  } catch (error) {
    console.log("Edit Product Error:", error);
    res.redirect('/admin/pageError');
  }
};


const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findOne({ _id: id });
    const data = req.body;

    console.log("Submitted category:", data.category);

    const existingProduct = await Product.findOne({
      productName: data.productName,
      _id: { $ne: id }
    });

    if (existingProduct) {
      return res.status(400).json({ error: "Product with this name already exists." });
    }

    const images = [];

    if(req.files && req.files.length>0){
      for(let i=0;i<req.files.length;i++){
        images.push(req.files[i].filename);
      }
    }
    console.log("Category from form:", req.body.category);
    

    const updateFields = {
      productName: data.productName,
      description: data.description,
      brand: data.brand,
      category: data.category,
      regularPrice: data.regularPrice,
      salesPrice: data.salesPrice,
      quantity: data.quantity,
      size: data.size,
      color: data.color
    };

    if (images.length > 0) {
      updateFields.productImage = images; // replace images entirely
    }
    await Product.findByIdAndUpdate(id, updateFields,{new:true});
   
    res.redirect('/admin/products');

  } catch (error) {
    console.error("Error while updating product:", error);
    res.redirect('/pageError');
  }
};


const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;

    const product =await Product.findByIdAndUpdate(productIdToServer, {
      $pull: { productImage: imageNameToServer }
    });

    const imagePath = path.join("public", "uploads", "re-image", imageNameToServer);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`Image ${imageNameToServer} deleted successfully`);
    }else {
      console.log(`Image ${imageNameToServer} not found`)
    }

    res.send({ status: true });

  } catch (error) {
    console.log(error);
    res.redirect('/pageError');
  }
};


const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    await Product.findByIdAndDelete(productId);
    res.redirect('/admin/products');
  } catch (error) {
    console.log("Error deleting product:", error);
    res.redirect('/admin/pageError');
  }
};



module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  addProductOffer,
  removeProductOffer,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage,
  deleteProduct
}