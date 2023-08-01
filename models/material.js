const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');


const MaterialSchema = new Schema({
    topic:{
        type: String
    },
    link:{
        type: String
    },
    time:{
        type:String,
        default:new Date().toISOString().slice(0,10)
    },
    author:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Teacher"
        },
        name:String,
        subject: String,
    }

});



module.exports =mongoose.model("Material",MaterialSchema);