const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');


const teacherSchema = new Schema({
    name:{
        type: String
    },

    subject:{
        type: String,
    },
    students:[{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Student"
        },
        grades: {
            type: Number,
            default: 0,
        },
        attendence: {
            type: Number,
            default: 0,
        },
    }],
    count:{
        type: Number,
        default: 0,
    }

});


teacherSchema.plugin(passportLocalMongoose);
module.exports =mongoose.model("Teacher",teacherSchema);