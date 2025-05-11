const User = require("../../models/userSchema")
const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt")
const env = require("dotenv").config()
const session = require("express-session")
const passport = require('passport');
const Address = require("../../models/addressSchema")



function generateOtp(){
  const digits = "1234567890";
  let otp = "";
  for(let i=0; i<6; i++){
    otp+= digits[Math.floor(Math.random()*10)]
  }
  return otp;
}

const sendVerificationEmail= async(email,otp)=>{
    try {    
      const transporter = nodemailer.createTransport({
        service : 'gmail',
        port : 587,
        secure : false,
        requireTLS : true,
        auth : {
          user : process.env.NODEMAILER_EMAIL,
          pass : process.env.NODEMAILER_PASSWORD
        }
      })
      const mailoptions = {
        from : process.env.NODEMAILER_EMAIL,
        to : email, 
        subject : "Your OTP for password reset",
        text : `Your OTP is ${otp}`,
        html : `<b><h4> Your OTP : ${otp} </h4></b>`
      }
      const info = await transporter.sendMail(mailoptions)
      console.log("Email sent : ",info.messageId);
      return true;

    } catch (error) {
        console.error("Error sending email : ",error)
        return false;
    }
}

const securePassword = async(password) =>{
  try {
    const passwordHash = await bcrypt.hash(password,10)
    return passwordHash;
  } catch (error) {
    console.log("Error securing password : ",error); 
  }
}

const getForgotPassPage = async (req,res)=>{
  try {
    res.render("forgot-password")
  } catch (error) {
    res.redirect("/pageNotFound")
  }
}

const forgotEmailValid = async(req,res)=>{
  try {
    const {email} = req.body;
    const findUser = await User.findOne({email:email})
    if(findUser){
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email,otp);
      if(emailSent){
        req.session.userOtp = otp;
        req.session.email = email;
        res.render("forgotPass-otp")
        console.log("OTP : ",otp);
      }else{
        res.json({sucess:false, message : "Failed to sedn OTP, try again"})
      }
    }else{
      res.render("forgot-password" ,{
        message : "User with this email doesn't exist"
      })
    }
  } catch (error) {
    res.redirect("/pageNotFound")
  }
}

const verfiyForgotPassOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      res.json({ success: true, redirectUrl: "/reset-password" });
    } else {
      res.json({ success: false, message: "OTP is not matching" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "An error occurred, please try again." });
  }
};


const getResetPassPage = async (req,res)=>{
  try {
    res.render("reset-password")
  } catch (error) {
    res.redirect("/pageNotFound")
  }
}

const resetPassword = async (req,res)=>{
  try {
    const {newPassword1,newPassword2}=req.body;
    const email = req.session.email;
    if(newPassword1 === newPassword2){
      const passwordHash = await securePassword(newPassword1);
      await User.updateOne({email:email},{$set:{password:passwordHash}})
      res.redirect('/userProfile');
    }else{
      res.render('reset-password',{message:"passwords do not match"})
    }
  } catch (error) {
    res.redirect('/pageNotFound');
  }
}

const userProfile = async(req,res) =>{
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId)
    const addressData = await Address.findOne({userId : userId})
    res.render("profile", {
      user :userData,
      addresses: addressData ? addressData.address : []

    })
  } catch (error) {
    console.error("Error retrieving user profile : ",error)
    res.redirect("/pageNotFound")
  }
}

const resendOtp = async(req,res) =>{
  try {
    const otp = generateOtp();
    req.session.userOtp = otp;
    const email = req.session.email;
    console.log("Resending OTP to email : ", email);
    const emailSent = await sendVerificationEmail(email, otp);
    if(emailSent){
      console.log("Resent OTP : ",otp);
      res.status(200).json({success :true, message:"Resent OTP succesfull"}) 
    }
  } catch (error) {
    console.log("Error resending OTP : ",error);
    res.status(500).json({success:false, message:"Internal Server Error"})   
  }
}

const postNewPassword = async (req, res) => {
  try {
    const { newPassword1, newPassword2 } = req.body;
    const email = req.session.userEmailForReset;

    if (!newPassword1) {
      console.log("newPassword1 is missing!");
      return res.render("reset-password", { message: "Password cannot be empty." });
    }    

    if (newPassword1 !== newPassword2) {
      return res.render("reset-password", { message: "Passwords do not match." });
    }

    const passwordHash = await securePassword(newPassword1);
    await User.updateOne({ email }, { $set: { password: passwordHash } });

    // Clear session
    req.session.userEmailForReset = null;
    req.session.userOtp = null;

    res.redirect("/login");
  } catch (error) {
    console.log("Error resetting password:", error);
    res.redirect("/pageNotFound");
  }
};

const changeEmail = async(req,res) =>{
  try {
    res.render("change-email")
  } catch (error) {
    res.redirect("/pageNotFound");
  }
}

const changeEmailValid = async(req,res) =>{
  try {
    const {email} = req.body;
    const userExists = await User.findOne({email})
    if(userExists){
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email,otp);

    if(emailSent){
      req.session.userOtp = otp;
      req.session.userData = req.body;
      req.session.email ;
      console.log(`email sent to ${email}`);
      console.log("otp:", otp);
      res.render("change-email-otp")   
    }else{
      res.json("email-error")
    }
  }else{
    res.render("change-email", {
      message : "User with this email does not exist"
    })
  }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
}

const verifyEmailOtp = async (req,res) =>{
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      const user = await User.findOne({ email: req.session.userData.email }); 
      req.session.userId = user._id;
      req.session.userData = req.body.userData;
      res.render("new-email", {
        userData: req.session.userData
      });    
    }else{
      res.render("change-email-otp", {
        message : "OTP is not matching",
        userData : req.session.userData
      })
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
}

const updateEmail = async (req, res) => {
  try {
    const newEmail = req.body.newEmail;
    const userId = req.session.userId;

    const result = await User.findByIdAndUpdate(userId, { email: newEmail });   
    if (!result) {
      console.log("User not found or update failed");
    }
    res.redirect("/userProfile");
  } catch (error) {
    console.error("Error updating email:", error);
    res.redirect("/pageNotFound");
  }
};

const getEditProfile = async(req,res) =>{
  try {
    const userId = req.session.user;
    console.log("Session userId:", userId);

    const user = await User.findById(req.session.user)
    console.log("Fetched user:", user);

    if (!user) {
      return res.redirect('/login'); // or handle missing user
    }
    
    res.render("edit-profile", {user})
  } catch (error) {
    res.redirect("/pageNotFound");
  }
}

const changePassword = async(req,res) =>{
  try {
    res.render("change-password")
  } catch (error) {
    res.redirect("/pageNotFound");
  }
}

const changePasswordValid = async (req, res) => {
  try {
    const { email } = req.body;
    const userExist = await User.findOne({ email });

    if (userExist) {
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);

      if (emailSent) {
        req.session.userOtp = otp;
        req.session.userData = req.body;
        req.session.email = email;
        console.log(`OTP: ${otp}`);
        return res.render('change-password-otp'); // ✅ return added
      } else {
        return res.json({ success: false, message: "Failed to send OTP, please try again" });
      }
    }else{
      return res.render('change-password', {
        message: "User with this email does not exist"
      });
    }
  } catch (error) {
    console.log("error in change password validation", error);
    return next(error); 
  }
};

const verifyChangePasswordOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if(enteredOtp === req.session.userOtp){
      res.json({
        success : true,
        redirectUrl : "/reset-password"
      })
    }else{
      res.json({
        success : false,
        message : "Otp is not matching"
      })
    }
  } catch (error) {
    return res.status(500).render('change-password-otp', {
      message: "An error occurred. Please try again later."
    });
  }
};

const addAddress = async(req,res) =>{
  try {
    const user = req.session.user;
    res.render("add-address", {user :user})
  } catch (error) {
    res.redirect("/pageNotFound");
    console.log("Error getting address page : ",error)
  }
}

const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const userId = req.session.user; 
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profileImage: '/uploads/profile/' + req.file.filename },  
      { new: true }
    );

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const updateProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const { name, phone } = req.body;

    const updatedUser = await User.findByIdAndUpdate(userId, {
      name,
      phone
    }, { new: true });

    req.session.user.name = updatedUser.name;
    req.session.user.phone = updatedUser.phone;

    res.redirect('/userprofile');
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).send('Something went wrong.');
  }
};

const postAddAddress = async(req,res) =>{
  try {
    const userId = req.session.user;
    const userData = await User.findOne({_id:userId})
    const {addressType, name, landMark, city, state, pincode, phone, altphone } = req.body;
    const userAddress =  await Address.findOne({userId : userData._id})
    if(!userAddress){
      const newAddress = new Address ({
        userId : userData._id,
        address : [{addressType, name, landMark, city, state, pincode, phone, altphone }]
      });
      await newAddress.save();
    }else{
      userAddress.address.push({addressType, name, landMark, city, state, pincode, phone, altphone })
      await userAddress.save();
    }
    res.redirect("/userProfile")

  } catch (error) {
    console.log("Error adding address : ",error);   
    res.redirect("/pageNotFound");
  }
}

const getEditAddress = async (req, res) => {
  try {
    const addressId = req.params.id; // Get ID from URL param
    const user = req.session.user;

    // Check if the addressId is a valid ObjectId
    const ObjectId = require('mongoose').Types.ObjectId;
    if (!ObjectId.isValid(addressId)) {
      console.log("Invalid address ID format");
      return res.redirect("/pageNotFound");
    }

    // Find the user document that has this address in their address array
    const currAddress = await Address.findOne({
      "address._id": new ObjectId(addressId),
    });

    console.log("currAddress:", currAddress);

    if (!currAddress) {
      console.log("No user found with given address ID");
      return res.redirect("/pageNotFound");
    }

    // Find the actual address object inside the address array
    const addressData = currAddress.address.find((item) => {
      return item._id.toString() === addressId;
    });

    console.log("addressData:", addressData);

    if (!addressData) {
      console.log("Address ID not found inside address array");
      return res.redirect("/pageNotFound");
    }

    // Render the edit-address view
    res.render("edit-address", { address: addressData, user: user });

  } catch (error) {
    console.error("Error in getEditAddress:", error);
    res.redirect("/pageNotFound");
  }
};

// const postEditAddress = async (req, res) => {
//   try {
//     const data = req.body;
//     const addressId = req.query.id;
//     const user = req.session.user;

//     const findAddress = await Address.findOne({ "address._id": addressId });
//     if (!findAddress) {
//       return res.redirect("/pageNotFound");
//     }

//     await Address.updateOne(
//       { "address._id": addressId },
//       {
//         $set: {
//           "address.$": {
//             _id: addressId,
//             addressType: data.addressType,
//             name: data.name,
//             city: data.city,
//             landMark: data.landMark,
//             state: data.state,
//             pincode: data.pincode,
//             phone: data.phone,
//             altphone: data.altphone,
//           },
//         },
//       }
//     );

//     return res.redirect("/userProfile");
//   } catch (error) {
//     console.error("Error updating address:", error);
//     if (!res.headersSent) {
//       return res.redirect("/pageNotFound");
//     }
//   }
// };
const postEditAddress = async (req, res) => {
  try {
    const { id: addressItemId } = req.params; 

    const updatedData = {
      'address.$.addressType': req.body.addressType,
      'address.$.name': req.body.name,
      'address.$.city': req.body.city,
      'address.$.landMark': req.body.landMark,
      'address.$.state': req.body.state,
      'address.$.pincode': req.body.pincode,
      'address.$.phone': req.body.phone,
      'address.$.altphone': req.body.altphone,
    };

    await Address.updateOne(
      { 'address._id': addressItemId }, 
      { $set: updatedData }
    );

    res.redirect('/userProfile');
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).send('Something went wrong');
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      console.warn("Delete request missing address ID");
      return res.redirect("/pageNotFound");
    }

    const addressDoc = await Address.findOne({ "address._id": id });

    if (!addressDoc) {
      console.warn("Address not found");
      return res.status(404).send("Address not found");
    }

    await Address.updateOne(
      { "address._id": id },
      {
        $pull: {
          address: { _id: id }
        }
      }
    );

    res.redirect("/userProfile");
  } catch (error) {
    console.error("Error deleting address:", error);
    res.redirect("/pageNotFound");
  }
};



module.exports = {
  getForgotPassPage,
  forgotEmailValid,
  verfiyForgotPassOtp,
  getResetPassPage,
  resendOtp,
  postNewPassword,
  userProfile,
  resetPassword,
  changeEmail,
  changeEmailValid,
  verifyEmailOtp,
  updateEmail,
  getEditProfile,
  changePassword,
  changePasswordValid,
  verifyChangePasswordOtp,
  addAddress,
  uploadProfileImage,
  updateProfile,
  postAddAddress,
  getEditAddress,
  postEditAddress,
  deleteAddress
}