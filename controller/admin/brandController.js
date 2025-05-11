const Brand = require("../../models/brandSchema")
const Product = require("../../models/productSchema")

const getBrandPage = async(req, res) =>{
  try {
    
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page-1) * limit;

    const brandData = await Brand.find({})
    .sort({createdAt : -1})
    .skip(skip)
    .limit(limit);

    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands/limit)
    // const reverseBrand = brandData

    res.render("brands", {
      data : brandData,
      currentPage : page,
      totalPages : totalPages,
      totalBrands : totalBrands
    })

  } catch (error) {
      res.redirect("/pageError")
      console.log("Error displaying brand page : ", error);      
  }
}

// const addBrand = async (req, res) => {
//   try {
//     const brandName = req.body.name?.trim();
//     if (!brandName) {
//       return res.redirect("/admin/brands?error=InvalidBrandName");
//     }

//     const findBrand = await Brand.findOne({ brandName });
//     if (findBrand) {
//       return res.redirect("/admin/brands?error=BrandAlreadyExists");
//     }

//     if (!req.file) {
//       return res.redirect("/admin/brands?error=NoImageUploaded");
//     }

//     const newBrand = new Brand({
//       brandName: brandName,
//       brandImage: req.file.filename
//     });

//     await newBrand.save();
//     res.redirect("/admin/brands");

//   } catch (error) {
//     console.log("Error adding brand: ", error);
//     res.redirect("/pageError");
//   }
// };

const addBrand = async (req, res) => {
  try {
    const brandName = req.body.name?.trim();

    if (!brandName || !req.file) {
      return res.render("brands", {
        data: await Brand.find(), // or whatever you're passing to show the list
        error: "Please enter all required details",
      });
    }

    const findBrand = await Brand.findOne({ brandName });
    if (findBrand) {
      return res.render("brands", {
        data: await Brand.find(),
        error: "This brand already exists",
      });
    }

    const newBrand = new Brand({
      brandName,
      brandImage: req.file.filename,
    });

    await newBrand.save();
    res.redirect("/admin/brands");

  } catch (error) {
    console.log("Error adding brand: ", error);
    res.redirect("/pageError");
  }
};


const blockBrand = async (req,res)=>{
  try {
    const id = req.query.id;
    await Brand.updateOne({_id:id}, {$set : {isBlocked:true}})
    res.redirect("/admin/brands")
  } catch (error) {
    res.redirect("/pageError")
    console.log("Error blocking brand : ", error); 
  }
}

const unblockBrand = async (req,res)=>{
  try {
    const id = req.query.id;
    await Brand.updateOne({_id:id}, {$set : {isBlocked:false}})
    res.redirect("/admin/brands")
  } catch (error) {
    res.redirect("/pageError")
    console.log("Error unblocking brand : ", error); 
  }
}

const deleteBrand = async (req,res)=>{
  try {
    const {id} =  req.params;
    if(!id){
      return res.status(400).redirect("/pageError")
    }
    await Brand.deleteOne({_id:id})
    res.redirect("/admin/brands")

  } catch (error) {
    res.redirect("/pageError")
    console.log("Error deleting brand : ", error); 
  }
}


module.exports = {
  getBrandPage,
  addBrand,
  blockBrand,
  unblockBrand,
  deleteBrand
}