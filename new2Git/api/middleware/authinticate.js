const jwt = require("jsonwebtoken");
const userdb = require("../models/User");
const keysecret = process.env.SECRET_KEY;

const authinticate = async(req , res , next)=>{
    try{
        const token = req.header.authorization;
        console.log("token req.header.authorization" , token);

        const verifytoken = jwt.verify(token , keysecret);

        const rootUser = await userdb.findOne({_id:verifytoken._id});

        if(!rootUser){
            throw new Error("user not found");
        }

        req.token = token;
        req.rootUser = rootUser;
        req.userId = rootUser._id;

        next();
    }
    catch (error) {
        res.status(401).json({status:401,message:"Unauthorized no token provide"})
    }
};

module.exports = authinticate