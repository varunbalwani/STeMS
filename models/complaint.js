const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');


const ComplaintSchema = new Schema({
    topic:{
        type: String
    },

    details:{
        type: String
    },
    time:{
        type:String,
        default:new Date().toISOString().slice(0,10)
    },
    author:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Student"
        },
        username:String,
    }

});



module.exports =mongoose.model("Complaint",ComplaintSchema);