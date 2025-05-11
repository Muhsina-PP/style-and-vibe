const User = require("../../models/userSchema")


const customerInfo = async (req,res) =>{
  try {

    let search = "";
    if(req.query.search){
      search = req.query.search;
    }

    let page = parseInt(req.query.page) || 1;
    if(page<1) page=1;
    // if(req.query.page){
    //   page = req.query.page;
    // }

    const limit =5;
    const userData = await User.find({
      isAdmin : false, 
      $or : [
        {name : {$regex : ".*" +search+ ".*", $options : "i"}},
        {email : {$regex : ".*" +search+ ".*", $options: "i"}}
      ]
    })
    .sort({createdOn:-1})
    .limit(limit*1)
    .skip((page-1) * limit)
    .exec();

    const count = await User.find({
      isAdmin : false, 
      $or : [
        {name : {$regex : ".*" +search+ ".*"}},
        {email : {$regex : ".*" +search+ ".*"}}
      ]
    }).countDocuments();

    const totalPages = Math.ceil(count / limit);

    res.render("customers", { data: userData, count: count ,  currentPage: page,
      totalPages, search});

    
  } catch (error) {
    console.log("Error loading cutomer information : ", error);
    res.status(500).send("Internal Server Error")  
  }
}

const customerBlocked = async (req,res)=>{
  try {
    let id = req.query.id;
    await User.updateOne({_id :id}, {$set : {isBlocked : true}})
    res.redirect("/admin/users")
  } catch (error) {
    res.redirect("/pageError")
    console.log("Error Blocking user : ", error);
  }
}


const customerUnblocked = async (req,res)=>{
  try {
    let id = req.query.id;
    await User.updateOne({_id :id}, {$set : {isBlocked : false}})
    res.redirect("/admin/users")
  } catch (error) {
    res.redirect("/pageError")
    console.log("Error unblocking user : ", error);
  }
}


module.exports = {
  customerInfo,
  customerBlocked,
  customerUnblocked
}

