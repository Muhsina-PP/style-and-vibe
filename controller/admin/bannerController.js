const Banner = require("../../models/bannerSchema")
const path = require ("path")
const fs = require ("fs")


const getBannerPage = async (req,res) =>{
  try {
    
    const findBanner = await Banner.find({}).sort({ _id: -1 })
    res.render("banner", {data : findBanner})

  } catch (error) {
    res.redirect("/pageError")
  }
}

const getAddBannerPAge = async (req,res) =>{
  try {
    res.render("addBanner")
  } catch (error) {
    res.redirect("/admin/pageError")
  }
}

const addBanner = async(req,res) =>{
  try {
    
    const data = req.body;
    const image = req.file;
    const newBanner = new Banner({
      image : image.filename,
      title : data.title,
      description : data.description,
      startDate : new Date(data.startDate + "T00:00:00"),
      endDate : new Date(data.endDate + "T00:00:00"),
      link : data.link
    })

    await newBanner.save().then((data)=>console.log(data))
    res.redirect("/admin/banner")
  } catch (error) {

    console.log("Error adding banners : ",error);
    res.redirect("/admin/pageError")
  }
}

const deleteBanner = async(req,res) =>{
  try {
    const id= req.query.id;
    await Banner.deleteOne({_id : id}).then((data) =>{
      console.log(data)
    })

  } catch (error) {
    res.redirect("/admin/pageError")
  }
}



module.exports = {
  getBannerPage,
  getAddBannerPAge,
  addBanner,
  deleteBanner
}