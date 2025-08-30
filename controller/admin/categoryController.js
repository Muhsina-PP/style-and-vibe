const Category = require("../../models/categorySchema")
const Product = require("../../models/productSchema")



const categoryInfo = async (req, res) => {
     
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    // Search filter
    const query = search
      ? { name: { $regex: search, $options: "i" } }
      : {};

    // Fetch matching categories
    const categoryData = await Category.find(query)
      .sort({ createdAt: -1 }) // Latest first
      .skip(skip)
      .limit(limit);

    // Count total categories based on search
    const totalCategories = await Category.countDocuments(query);

    // Calculate total pages
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("category", {
      cat: categoryData,
      currentPage: page,
      totalPages,
      totalCategories,
      search,
    });
  } catch (error) {
    console.error("Error loading categories:", error);
    res.redirect("/admin/pageError");
  }
};


const addCategory = async(req,res)=>{
  const {name, description} = req.body;
  try {
    const existingCategory = await Category.findOne({name})
    if(existingCategory){
      return res.status(400).json({error :" Category already exists"})
    }
    const newCategory = new Category ({
      name,
      description
    })
    await newCategory.save()
    return res.json({message : "Category added succesfully"})
  } catch (error) {
    return res.status(500).json({error : "Internal Server Error"})
  }
}

const addCategoryOffer = async (req,res)=>{
  try {
    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId)
    if(!category){
      return res.status(400).json({status:false, message : "Category not found"})
    }
    const products = await Product.find({category : category._id})
    const hasProductOffer = products.some((product)=>product.productOffer > percentage)
    if(hasProductOffer){
      return res.json({status : false, message : "Products within this category already has offers"})
    }
    await Category.updateOne({_id : categoryId}, {$set : {categoryOffer:percentage}})
    for (const product of products){
      product.productOffer = 0;
      product.salesPrice = product.regularPrice;
      await product.save()
    }
    res.json({status : true})
  } catch (error) {
    res.status(500).json({status:false, message : "Internal Server Error"})
  }
}

const removeCategoryOffer = async (req,res)=>{
  try {
    
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId)
    
    if(!category){
      return res.status(404).json({status:false, message :"Category not found "})
    }

    const percentage = category.categoryOffer;
    const products = await Product.find({category : category._id})

    if(products.length >0){
      for (const product of products){       
        // product.salesPrice = Math.floor(product.regularPrice * (percentage/100));
        product.salesPrice = Math.floor(product.regularPrice - (product.regularPrice * (percentage / 100)));

        product.productOffer = 0;
        await product.save()
      }
    }
    category.categoryOffer =0;
    await category.save()
    res.json({status:true})

  } catch (error) {
    res.status(500).json({status :false, message : "Internal Server Error"})
  }
}

const getListCategory = async (req,res)=>{
  try {
    
    const id = req.query.id;
    await Category.updateOne({_id:id},{$set :{isListed :true }})
    res.redirect("/admin/category")
  } catch (error) {
    console.log("Error listing category:", error);
    res.redirect("/pageError")
  }
}

const getunListCategory = async (req,res)=>{
  try {
    const id = req.query.id;
    await Category.updateOne({_id:id},{$set :{isListed :false }})
    res.redirect("/admin/category")
  } catch (error) {
    console.log("Error unlisting category:", error);
    res.redirect("/pageError")
  }
}

const getEditCategory = async (req,res)=>{
  try {

    const id = req.query.id;
    const category = await Category.findOne({_id:id})
    res.render("edit-category",{category :category})
    
  } catch (error) {
    res.redirect("/pageError")
  }
}

const editCategory = async (req,res)=>{
  try {
    
    const id = req.params.id;
    const {categoryName, description} = req.body;
    const existingCategory = await Category.findOne({name : categoryName})

    if(existingCategory){
      return res.status(400).json({error : "This category already exists, pls choose another category"})
    }
    const updateCategory = await Category.findByIdAndUpdate(
      id,
      { name : categoryName, description : description },
      {new :true}
    )

    if(updateCategory){
      res.redirect("/admin/category")
      // res.status(200).json({ message: "Category updated successfully" });

    }else{
      res.status(400).json({error : "Category not found"})
    }

  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({error : "Internal Server Error"})
  }
}

// const searchCategory = async (req,res) =>{
//   try {

//     let search = "";
//     if(req.query.search){
//       search = req.query.search;
//     }

//     console.log("Search term:", search);


//     let page = 1;
//     if(req.query.page){
//       page = parseInt(req.query.page) || 1;
//     }

//     const limit =4;
//     const categoryData = await Category.find({
//       isListed : true, 
//       $or : [
//         {name : {$regex : ".*" +search+ ".*", $options: "i"}}
//       ]
//     })
//     .limit(limit*1)
//     .skip((page-1) * limit)
//     .exec();

//     const count = await Category.find({
//       isListed : true, 
//       $or : [
//         {name : {$regex : ".*" +search+ ".*", $options: "i"}}      ]
//     }).countDocuments();

//     const totalPages = Math.ceil(count / limit);

//     res.render("category", { cat: categoryData, count: count ,  currentPage: parseInt(page),
//       totalPages, search});

    
//   } catch (error) {
//     console.log("Error loading category information : ", error);
//     res.status(500).send("Internal Server Error")  
//   }
// }

const deleteCategory = async(req,res) =>{
  try {

    let categoryId = req.params.id;

    const productExists = await Product.findOne({category : categoryId})
    if(productExists){
      return res.status(400).json({
        success : false,
        message : "Cannot delete category. Products are linked to this category."  
      })
    }
    await Category.findByIdAndDelete(categoryId)
    return res.status(200).json({
      success :true,
      message :"Category deleted successfully."
    })
    
  } catch (error) {
    console.error("Error deleting category : ",error);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
}



module.exports = {
  categoryInfo,
  addCategory,
  addCategoryOffer,
  removeCategoryOffer,
  getListCategory,
  getunListCategory,
  getEditCategory,
  editCategory,
  // searchCategory,
  deleteCategory
}