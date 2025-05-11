const User = require("../models/userSchema")

// const userAuth = (req, res, next)=>{
  
//   if(req.session.user){
//       User.findById(req.session.user)
//       .then(data =>{
//         if(data && !data.isBlocked){
//           next()
//         }else{
//           res.redirect("/login")
//         }
//       })
//       .catch(error =>{
//         console.log("Error in user authentication middleware : ", error);
//         res.status(500).send("Internal Server Error")
        
//       })
  
//   }else{
//     res.redirect("/login")
//   }
// }
const userAuth = async (req, res, next) => {
  try {
    if (req.session.user) {
      const user = await User.findById(req.session.user);

      if (user && !user.isBlocked) {
        next();
      } else {
        res.redirect("/");
      }
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.log("Error in user authentication middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};


// const adminAuth = (req,res,next) =>{
//   User.findOne({isAdmin :true})
//     .then(data =>{
//       if(data){
//         next();
//       }else{
//         res.redirect("/admin/login")
//       }
//     })
//     .catch(error =>{
//       console.log("Error in admin auth middleware : ", error);
//       res.status(500).send("Internal Server Error")     
//     })
// }

const adminAuth = async (req, res, next) => {
  try {
    await User.findOne({ isAdmin: true });

    if (req.session.admin) {
      next();
    } else {
      res.redirect("/admin/login");
    }
  } catch (error) {
    console.log("Error in admin auth middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};


module.exports = { userAuth, adminAuth}