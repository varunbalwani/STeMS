const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');


const studentSchema = new Schema({
    name:{
        type: String
    },
    studentId:{
        type: String,
    },
    dob:{
        type: String
    },
    address:{
        type: String
    },
    courses:[{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Teacher"
        },
    }],
});

studentSchema.plugin(passportLocalMongoose);
module.exports =mongoose.model("Student",studentSchema);