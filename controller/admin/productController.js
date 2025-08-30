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

// const addProducts = async (req,res)=>{
//   try {
    
//     const products = req.body;
//     const productExists = await Product.findOne({
//       productName : products.productName
//     })
//     if(!productExists){
//       const images = []
//       if(req.files && req.files.length>0){
//         for(let i=0; i<req.files.length; i++){
//           const originalImagePath = req.files[i].path;
//           const resizedImagePath = path.join('public','uploads','product-images', req.files[i].filename)
//           await sharp(originalImagePath).resize({width:440, height:440}).toFile(resizedImagePath)
//           images.push(req.files[i].filename)
//         }
//       }
//       const categoryId = await Category.findOne({name : products.category})
//       if(!categoryId){
//         return res.status(400).json("Invalid category name")
//       }

//       const newProduct = new Product({
//         productName : products.productName,
//         description : products.description,
//         brand : products.brand,
//         category : categoryId._id,
//         regularPrice : Number(products.regularPrice),
//         salesPrice : Number(products.salesPrice),
//         createdOn : new Date(),
//         quantity : products.quantity,
//         size : products.size,
//         color : products.color,
//         productImage : images,
//         status : 'Available'
//       })
//       await newProduct.save();
//       return res.redirect("/admin/addProducts")
//     }else{
//       return res.status(400).json("Product already exists, pls try with another name..")
//     }

//   } catch (error) {
//     console.error("Error saving product : ", error)
//     return res.redirect("/pageError")
//   }
// }



// const addProducts = async (req, res) => {
//   try {
//     const products = req.body;

//     const processedImages = [];

//     if (req.files && req.files.length > 0) {
//       for (const file of req.files) {
//         const outputFilePath = path.join(
//           __dirname,
//           "../public/uploads/re-image",
//           `resized-${Date.now()}-${file.originalname}`
//         );

//         // Resize + compress
//         await sharp(file.path)
//           .resize(800, 800, { fit: "cover" }) // Change size if needed
//           .toFormat("jpeg")
//           .jpeg({ quality: 80 })
//           .toFile(outputFilePath);

//         // Add processed image path
//         processedImages.push(`/uploads/re-image/${path.basename(outputFilePath)}`);

//         // Delete original uploaded file from temp
//         fs.unlinkSync(file.path);
//       }
//     }

//     const newProduct = new Product({
//       productName: products.productName,
//       description: products.description,
//       brand: products.brand,
//       regularPrice: products.regularPrice,
//       salesPrice: products.salesPrice,
//       color: products.color,
//       category: products.category,
//       quantity: products.quantity,
//       images: processedImages
//     });

//     await newProduct.save();

//     res.redirect("/admin/products");
//   } catch (error) {
//     console.error("Error adding product:", error);
//     res.status(500).send("Internal Server Error");
//   }
// };

const addProducts = async (req, res) => {
  try {
   
    console.log("🔍 req.files =", req.files)
    const products = req.body;
    const processedImages = [];

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      console.log("No files uploaded");
      return res.status(400).json({
        success: false,
        message: "At least one image is required"
      });
    }

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, "../public/uploads/re-image");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Process each uploaded file
    for (const file of req.files) {
      try {
        console.log("Processing file:", file.filename);
        
        // Generate unique filename for processed image
         const outputFilename = file.filename;
        const outputFilePath = path.join(outputDir, outputFilename);

        // Check if source file exists
        if (!fs.existsSync(file.path)) {
          console.error("Source file does not exist:", file.path);
          continue;
        }

        // Resize and compress the image
        
        // await sharp(file.path)
        //   .resize(800, 800, { 
        //     fit: "cover",
        //     withoutEnlargement: true 
        //   })
        //   .toFormat("jpeg")
        //   .jpeg({ quality: 80 })
        //   .toFile(outputFilePath);

          await sharp(file.path)
          .resize(800, 800, {
            fit: sharp.fit.cover,
            position: sharp.strategy.entropy
          })
          .toFormat("jpeg")
          .jpeg({ quality: 80 })
          .toFile(outputFilePath);


        // Add the relative path to processed images array
        processedImages.push(`${outputFilename}`);
        console.log("Processed image saved:", outputFilename);

        // Delete the original uploaded file
        // fs.unlinkSync(file.path);

      } catch (fileError) {
        console.error("Error processing individual file:", fileError);
        // Continue processing other files even if one fails
      }
    }

    // Validate that at least one image was processed successfully
    if (processedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to process any images"
      });
    }

      const categoryDoc = await Category.findOne({ name: products.category });

      if (!categoryDoc) {
      return res.status(400).json({
        success: false,
        message: "Invalid category selected"
      });
    }

    // Create new product with processed data
    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      brand: products.brand,
      regularPrice: parseFloat(products.regularPrice),
      salesPrice: parseFloat(products.salesPrice),
      color: products.color,
      category: categoryDoc._id,
      quantity: parseInt(products.quantity),
      productImage: processedImages,
      createdAt: new Date(),
      isActive: true
    });

    // Save to database
    await newProduct.save();
    console.log("Product saved successfully:", newProduct._id);

    // Success response
    res.redirect("/admin/products?success=true");

  } catch (error) {
    console.error("Error adding product:", error);
    
    // Clean up any uploaded files in case of error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (cleanupError) {
            console.error("Error cleaning up file:", cleanupError);
          }
        }
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
  }
};

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