const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const keysecret = process.env.SECRET_KEY;
console.log("k" , keysecret)

const userSchema = new mongoose.Schema({
    fname:{
        type:String , 
        required:true , 
        trim:true
    } , 
    email:{
        type:String , 
        required:true , 
        unique:true , 
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error ("not valid email")
            }
        }
    } , 
    password:{
        type:String , 
        required:true , 
        minlength:6 ,
    } , 
    cpassword: {
        type: String,
        required: true,
        minlength: 6
    },
    tokens:[
        {
            token:{
                type:String , 
                required:true
            }
        }
    ] , 
    verifytoken:{
        type:String
    }
});

userSchema.pre("save" , async function (next){
    // console.log(this.isModified('password'));     
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password , 12);
        this.cpassword = await bcrypt.hash(this.cpassword , 12);
    };
    next();
});

// token generate 
userSchema.methods.generateAuthtoken = async function(){
    try{
        let token23 = jwt.sign({_id: this._id} , keysecret , {
            expiresIn :"1d"
        });

        this.tokens = this.tokens.concat({token:token23});
        await this.save();
        return token23;
    }
    catch(error){
        // res.status(422).json(error);
        console.log(error);
    }
};

// createing model
const userdb = new mongoose.model("User", userSchema);

module.exports = userdb;