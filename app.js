const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const passport = require('passport');
const session = require('express-session');
const LocalStrategy = require('passport-local');
const Student = require("./models/student");
const Teacher = require("./models/teacher");
const Complaint = require("./models/complaint");
const Notice = require("./models/notice");
const Material = require("./models/material");
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/mis'
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    //useCreateIndex: true,
    useUnifiedTopology: true,
    //useFindAndModify: false,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const store = MongoStore.create({
    mongoUrl: dbUrl,
    secret: 'SECRET',
    touchAfter: 24 * 60 * 60
})

store.on('error', function (e) {
    console.log("SESSION STORE ERROR", e);
})

const sessionConfig = {
    store,
    name: 'session',
    secret: 'SECRET',
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
    }
}

const app = express();
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));

app.use(passport.initialize());
app.use(session(sessionConfig));
app.use(passport.session());

// passport.use('student',);
// // passport.use('teacher',new LocalStrategy(Teacher.authenticate()));
// passport.use('teacher', new LocalStrategy({ passReqToCallback: true }, function (req, username, password, done) {
//     Teacher.findOne({ username }, function (err, teacher) {
//         console.log("teacher pass = ", teacher);
//         if (err) return done(err);
//         if (!teacher) {
//             return done(null, false, { message: 'This email is not registered' });
//         }
//         if (!teacher.authenticate(password)) {
//             return done(null, false, { message: 'Password is incorrect !' });
//         }
//         req.user = teacher;
//         // console.log(req);
//         return done(null, teacher);
//     })
// }));

passport.use(new LocalStrategy(function (username, password, done) {
    Teacher.findOne({ username }, function (err, teacher) {
        // first method succeeded?
        if (!err && teacher && teacher.authenticate(password)) {
            return done(null, teacher);
        }
        Student.findOne({ username }, function (err, student) {
            if (!err && student && student.authenticate(password)) {
                return done(null, student);
            }
            done(new Error("Invalid user or password"));
        })
    })
}))

// passport.serializeUser(Student.serializeUser());
// passport.deserializeUser(Student.deserializeUser());
// passport.serializeUser(Teacher.serializeUser());
// passport.deserializeUser(Teacher.deserializeUser());
passport.serializeUser((user, done) => {
    done(null, user._id);
});
passport.deserializeUser((id, done) => {
    Teacher.findById(id, function (err, teacher) {
        if (!err && teacher) {
            done(null, teacher);
        }
        done('pass');
    })
});
passport.deserializeUser((id, done) => {
    Student.findById(id, function (err, student) {
        if (!err && student) {
            done(null, student);
        }
    })
});

// passport.serializeUser(function (user, done){
//     let type = user.
// });

// passport.use(new LocalStrategy(Teacher.authenticate()));
// passport.serializeUser(Teacher.serializeUser());
// passport.deserializeUser(Teacher.deserializeUser()); 
app.use((req, res, next) => {
    // console.log("mm = ", req);
    res.locals.currentUser = req.user;
    console.log("middleware = ", res.locals.currentUser);
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})


app.get('/', (req, res) => {
    res.render('landing.ejs');
    // console.log(res.locals.currentUser);
})


//register Routes
app.get("/student/register", (req, res) => {
    res.render("users/registerStudent");
});

app.post("/student/register", function (req, res) {
    var newUser = new Student({ username: req.body.username, name: req.body.name });
    newUser.studentId = req.body.username;
    newUser.name = req.body.studentName;
    Student.register(newUser, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            req.flash("error", err.message);
            return res.render("users/registerStudent");
        }
        passport.authenticate("local")(req, res, function () {
            res.redirect("/student/home");
        });
    });
});

app.get("/teacher/register", (req, res) => {
    res.render("users/registerTeacher");
});

app.post("/teacher/register", function (req, res) {
    if (req.body.pin != '1234') {
        req.flash("Wrong Pin!!");
        return res.render("teacher/register");
    }
    var newUser = new Teacher({ username: req.body.username });
    newUser.name = req.body.teacherName;
    newUser.subject = req.body.subject;

    Teacher.register(newUser, req.body.password, function (err, user) {
        if (err || req.body.pin != '1234') {
            console.log(err);
            req.flash("error", err.message);
            return res.render("teacher/register");
        }
        passport.authenticate("local")(req, res, function () {
            res.redirect("/teacher/home");
        });
    });
});

// login routes
app.get("/student/login", function (req, res) {
    res.render("users/loginStudent");
});
app.post("/student/login", passport.authenticate("local", {
    failureFlash: true,
    failureRedirect: "/student/login"
}), function (req, res) {
    req.flash('success', 'welcome back');
    const redirectUrl = req.session.returnTo || '/student/home';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
});



app.get("/teacher/login", function (req, res) {
    res.render("users/loginTeacher");
});
app.post("/teacher/login", passport.authenticate("local", {
    failureFlash: true,
    failureRedirect: "/teacher/login"
}), function (req, res) {
    req.flash('success', 'welcome back');
    const redirectUrl = req.session.returnTo || '/teacher/home';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
});


//logout routes
app.get("/student/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.flash('success', "Successfully Logged Out !!");
        res.redirect('/');
    })
});

app.get("/teacher/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.flash('success', "Successfully Logged Out !!");
        res.redirect('/');
    })
});


//home page routes
app.get("/student/home", (req, res) => {
    const currUser=req.user;
    res.render("home/homeStudent",{currUser});

});

app.get("/teacher/home", (req, res) => {
    const currUser=req.user;
    res.render("home/homeTeacher",{currUser});

});

//update profile
app.get("/student/updateProfile", isLoggedIn, async (req, res) => {
    const currUser = req.user;
    const subjects = await Teacher.find();
    res.render('users/edit', { currUser, subjects });
})

app.post("/student/updateProfile", isLoggedIn, async (req, res) => {
    const { studentName, dob, address, allotedSubjects } = req.body;
    const newObj = await Student.findById(req.user._id);
    newObj.name = studentName;
    newObj.dob = dob;
    newObj.address = address;
   // if (newObj.courses.length != 0) { newObj.courses = []; }
    allotedSubjects.forEach(async function (subject) {
        newObj.courses.push({ id: subject });
        const newT = await Teacher.findById(subject);
        newT.students.push({ id: req.user._id, grades: 0, attendence: 0 });
        await newT.save();
    });

    await newObj.save();
    res.redirect('/student/home');
})

//complain routes

app.get("/student/complaints/new", isLoggedIn, (req, res) => {
    res.render("complaints/add");
});

app.post("/student/complaints/new", isLoggedIn, (req, res) => {
    var newComplaint = { details: req.body.details, topic: req.body.topic }
    Complaint.create(newComplaint, function (err, Complaint) {
        if (err) {
            req.flash("error", "Something went wrong,Try again!!");
            console.log(err);
        } else {
            Complaint.author.username = req.user.username;
            Complaint.author.id = req.user._id;
            Complaint.save();
            res.redirect("/student/home");
            req.flash("success", "Successfully added suggestion");
        }
    })
});

app.get("/teacher/complaints", isLoggedIn, async (req, res) => {
    const complaints = await Complaint.find();
    res.render('complaints/show', { complaints });
})

app.delete("/teacher/complaints/:complaint_id", isLoggedIn, function (req, res) {

    Complaint.findByIdAndRemove(req.params.complaint_id, function (err) {
        if (err) {
            res.redirect("/teacher/complaints");
        } else {
            req.flash("success", "Complaint deleted");
            res.redirect("/teacher/complaints");
        }
    });
});


//notice routes
app.get("/teacher/notices/new", isLoggedIn, async (req, res) => {
    const notices = await Notice.find();
    res.render("notices/add", { notices });
});

app.post("/teacher/notices/new", isLoggedIn, (req, res) => {
    var newNotice = { details: req.body.details }
    Notice.create(newNotice, function (err, Notice) {
        if (err) {
            req.flash("error", "Something went wrong,Try again!!");
            console.log(err);
        } else {
            Notice.author.name = req.user.name;
            Notice.author.id = req.user._id;
            Notice.author.subject = req.user.subject;
            Notice.save();
            res.redirect("/teacher/notices/new");
            req.flash("success", "Successfully added suggestion");
        }
    })
});

app.get("/teacher/notices/:notice_id/edit", isLoggedIn, function (req, res) {
    Notice.findById(req.params.notice_id, function (err, foundnotice) {
        if (err) {
            res.redirect("/teacher/home");
        } else {
            res.render("notices/edit", { foundnotice });
        }
    });
});

app.put("/teacher/notices/:notice_id", isLoggedIn, async function (req, res) {
    const newObj = await Notice.findById(req.params.notice_id);
    newObj.details = req.body.details;
    await newObj.save();
    req.flash("success", "Notice Updated!");
    res.redirect("/teacher/notices/new");
});


app.delete("/teacher/notices/:notice_id", isLoggedIn, function (req, res) {

    Notice.findByIdAndRemove(req.params.notice_id, function (err) {
        if (err) {
            res.redirect("/teacher/notices/new");
        } else {
            req.flash("success", "Notice deleted");
            res.redirect("/teacher/notices/new");
        }
    });
});

app.get("/student/notices", isLoggedIn, async (req, res) => {
    const notices = await Notice.find();
    res.render("notices/show", { notices });
});



//course matirial
app.get("/teacher/materials/new", isLoggedIn, async (req, res) => {
    const materials = await Material.find();
    res.render("materials/add", { materials });
});

app.post("/teacher/materials/new", isLoggedIn, (req, res) => {
    var newMaterial = { topic: req.body.topic, link: req.body.link };
    Material.create(newMaterial, function (err, material) {
        if (err) {
            req.flash("error", "Something went wrong,Try again!!");
            console.log(err);
        } else {
            material.author.name = req.user.name;
            material.author.id = req.user._id;
            material.author.subject = req.user.subject;
            material.save();
            res.redirect("/teacher/materials/new");
            req.flash("success", "Successfully added material");
        }
    })
});

app.get("/teacher/materials/:material_id/edit", isLoggedIn, function (req, res) {
    Material.findById(req.params.material_id, function (err, foundmaterial) {
        if (err) {
            res.redirect("/teacher/materials/new");
        } else {
            res.render("materials/edit", { foundmaterial });
        }
    });
});

app.put("/teacher/materials/:material_id", isLoggedIn, async function (req, res) {
    const newObj = await Material.findById(req.params.material_id);
    newObj.topic = req.body.topic;
    newObj.link = req.body.link;
    await newObj.save();
    req.flash("success", "Material Updated!");
    res.redirect("/teacher/materials/new");
});

app.delete("/teacher/materials/:material_id", isLoggedIn, function (req, res) {

    Material.findByIdAndRemove(req.params.material_id, function (err) {
        if (err) {
            res.redirect("/teacher/materials/new");
        } else {
            req.flash("success", "material deleted");
            res.redirect("/teacher/materials/new");
        }
    });
});

app.get("/student/materials", isLoggedIn, async (req, res) => {
    const allMaterial= await Material.find();
     const courses=req.user.courses;
//    const materials=allMaterial.filter(el=>{
//          return courses.filter(sub =>{
//             return(sub.id.toString() == el.author.id.toString());
//          })
//    })
const ids= courses.map(ele=> ele['id']).toString();
const materials= allMaterial.filter(el =>{
    const id=el.author.id.toString();
    return (ids.includes(id));
})
    // const materials=await Promise.all(studentCourses.map(async (subject)=>{
    //     const subId= subject.id;
    //     const materialDoc=await Material.find({id: subId});
    //     return new Promise((resolve) =>{
    //         resolve(materialDoc);
    //     })
    // }))
  // console.log(ids);
   //const materials=[];
    //console.log(materials);
    //console.log(allMaterial)
    res.render("materials/show", {materials} );
});

//grades routes
app.get("/teacher/grades", isLoggedIn, async function (req, res) {
    const currentUser = req.user;
    const resp = await Promise.all(currentUser.students.map(async (student) => {
        const studentId = student.id;
        const studentDoc = await Student.findById(studentId);
        return new Promise((resolve) => {
            resolve({ name: studentDoc.name, studentId: studentDoc.studentId, grades: student.grades, attendence: student.attendence, id2:studentDoc._id });
        });
    }));
    // res.send(resp);
    res.render("grades/show", { students: resp });
})

app.get("/student/grades", isLoggedIn, async function (req, res) {
    const currentUser = req.user;
    const resp = await Promise.all(currentUser.courses.map(async (subject) => {
        const teacherId = subject.id;
        const teacherDoc = await Teacher.findById(teacherId);
          console.log(teacherDoc.students)
          const mystudent = teacherDoc.students.filter(el => {
              return el.id.toString() == currentUser._id.toString()
          })[0];
          const {grades, attendance} = mystudent;
        return new Promise((resolve) => {
            resolve({ name: teacherDoc.name, subject: teacherDoc.subject, grades: grades, attendance: attendance });
        });
    }));
    res.render("grades/showStudent", { subjects: resp });
})

app.get('/teacher/grades/:id/edit',isLoggedIn, async function(req,res){
    const studentId= req.params.id;
    res.render('grades/edit',{studentId});

})

app.put('/teacher/grades/:id', async function(req,res){
    const studentId= req.params.id;
    const newObj= await Teacher.findById(req.user._id);
    const students=newObj.students;
    const student = await students.find( ele => ele.id == studentId);
    student.grades= req.body.marks;
    await newObj.save();
    res.redirect('/teacher/grades')
})

//attendence routes
app.get("/teacher/attendence", isLoggedIn, async function (req, res) {
    const currentUser = req.user;
    const resp = await Promise.all(currentUser.students.map(async (student) => {
        const studentId = student.id;
        const studentDoc = await Student.findById(studentId);
        return new Promise((resolve) => {
            resolve({ name: studentDoc.name, studentId: studentDoc.studentId,classes: currentUser.count ,grades: student.grades, attendence: student.attendence, id2: studentDoc._id });
        });
    }));
    // res.send(resp);
    //console.log("rr = ", resp);
    res.render("attendence/show", { students: resp });
})

app.get("/student/attendence", isLoggedIn, async function (req, res) {
    const currentUser = req.user;
    const resp = await Promise.all(currentUser.courses.map(async (subject) => {
        const teacherId = subject.id;
        const teacherDoc = await Teacher.findById(teacherId);
          //console.log(teacherDoc.students)
          const mystudent = teacherDoc.students.filter(el => {
              return el.id.toString() == currentUser._id.toString()
          })[0];
          const {grades, attendence} = mystudent;
        return new Promise((resolve) => {
            resolve({ classes: teacherDoc.count, subject: teacherDoc.subject, grades: grades, attendence: attendence });
        });
    }));
    res.render("attendence/showStudent", { subjects: resp });
})

app.get('/teacher/attendence/:id/edit',isLoggedIn, async function(req,res){
    const studentId= req.params.id;
    res.render('attendence/edit',{studentId,totalClasses: req.user.count});

})

app.put('/teacher/attendence/:id', async function(req,res){
    const studentId= req.params.id;
    const newObj= await Teacher.findById(req.user._id);
    const students=newObj.students;
    const student = await students.find( ele => ele.id == studentId);
    student.attendence= req.body.attendence;
    newObj.count=req.body.classes
    await newObj.save();
    res.redirect('/teacher/attendence')
})

//middleware
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
        //console.log(User);
    }
    //console.log();
    req.session.returnTo = req.originalUrl;
    req.flash("error", "You need to be logged in to do that");
    res.redirect("/");
};

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on port ${port}!!`);
})