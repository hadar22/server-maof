require("dotenv").config();
const express = require("express");
const cors = require("cors")
const bcrypt = require("bcrypt")
//const session = require("express-session")
const mysql = require('mysql2');
const session = require('express-session')

const app = express();
app.use(cors({
    origin:  ["http://localhost:3000", "https://maofelevators.com"]
    
    
     
}))
// app.use(session({
//     secret: 'secretkey',
//     resave: false,
//   saveUninitialized: true,
//   cookie:{
//     httpOnly:true,
//     secure:false,
//     expires: new Date(Date.now()+ 60*60*1000) 
//   }
// }));
//serve static files

app.use(express.json());
app.use(express.urlencoded({ extended: true })); //pass form data


const db = mysql.createPool({
    host: process.env.HOST ,
    user: process.env.USER,
    password: process.env.MYSQL_P,
    database: process.env.DB,
    multipleStatements: true,
    timezone: 'utc',
    // connectTimeout: 60000
})
db.getConnection((err, conn)=>{
    if(err) throw err
    console.log("Connected!")
})

app.get("/", (req, res) => {
  res.status(200).json({ message: "The server is working" });
});

// //method override
// app.use(methodOverride("_method"))
//save login user into locals
app.use((req,res,next)=>{
    if(req.session.userAuth){
        res.locals.userAuth = req.session.userAuth
    }else{
        res.locals.userAuth = null
    }
    next()
})

// new project
app.post('/projects/new-project',async(req,res,next)=>{
    const {username, password, phoneNum, contact, projectNum } = req.body
    if(!username || !password || !phoneNum || !contact || !projectNum){
        return res.json({Error: "כל השדות צריכים להיות מלאים"})
    }
    const sql = 'INSERT INTO users (username, password, phoneNum, contact, projectNum ) VALUES (?);'
    try{
        //1. check if project exist
        db.connect()
        db.query("SELECT username FROM users WHERE projectNum=?;",[projectNum],(err,result)=>{
            if(result.length > 0){
                return res.json({Error: "הפרויקט כבר קיים במערכת"})
            }

        })
        const salt = await bcrypt.genSalt(10)
        const passwordHashed = await bcrypt.hash(password,salt)
        db.query(sql, [username, passwordHashed, contact, phoneNum, projectNum], (err, result)=>{
            if(err){
                return res.json({Error: "שגיאת שרת בהוספת פרויקט חדש"})
            }else{
                db.query("INSERT INTO project_info (username , projectNum) VALUES (?);",[username, projectNum], (err, result)=>{
                    if(err){
                        return res.json({Error: "לא הצלחנו להכניס את הפרטים לטבלת האינפורמציה של הפרויקטים"})
                    }
                    else{
                        return res.json({Status: "Success"})
                    }
                })
            }
        })
    }catch(error){
        return res.json(error)
    }

})
app.post('/register' , async(req, res)=>{
    const {name, pass} = req.body
    const salt = await bcrypt.genSalt(10)
    const passwordHashed = await bcrypt.hash(pass,salt)
    const sql = "INSERT INTO users (projectNum, username, password) VALUES (?); "
    db.query(sql, [pass, name, passwordHashed], (err, result)=>{
        if(err) return res.json({message: "error"})
        return res.json({status: "success"})
    })
})
// login
app.post('/projects/login', async(req, res, next)=>{
    console.log("heyy")
    const {name, password} = req.body
   console.log(req.body)
    const sql = "SELECT * FROM users WHERE username=?;"
    db.connect()
    db.query(sql, [name] ,async (err, data)=>{
        console.log("heyy1")
        if(err){ 
            console.log("error", err)
            return res.json({status:"error",message: err.sqlMessage})
        }

        console.log("pas",password)
    
        const isGood = await bcrypt.compareSync(password, data[0].password)
    
        console.log(isGood)
        if(!isGood){
            console.log("not good")
            return res.json({status: "error" ,message: "הסיסמא שגויה"})
          }
        console.log(data[0].projectNum)
        req.session.userAuth = data[0].projectNum 
        return res.json({status: 'success' ,data:{name: name, projectNum: data[0].projectNum}
            })
            
            
        })

    
        
    
})
//get all project to manager page
app.get('/manager/get-all-projects',(req, res)=>{
    const sql = 'SELECT * FROM users WHERE projectNum <> 1;'
    db.connect()
    db.query(sql , (err, result)=>{
        if(err) return res.json({Error: "not working"})
        
        return res.status(200).json({myData: result})
    })
})

//logout
app.get('/projects/logout', (req,res, next)=>{
    req.session.destroy()
    res.clearCookie('token')
    return res.json({Status: "Seccess"})
})


//All project data
app.get('/project/get-all-project-data',(req, res)=>{
    const username = req.query.username
    console.log("userGet", username)
    const sql = "SELECT * FROM project_info WHERE username=?;"
    db.connect()
    db.query(sql, [username], (err, result)=>{
        if(err) return res.json({status:'error', message: err})
        console.log(result)
        return res.json({status: 'success', data: result})
    })
})

//Update first details
app.post('/project/update-first-details',(req, res)=>{
   
    const values = [req.body.workOffice, req.body.dateSignature, req.body.elevatorType, req.body.endDate, req.body.username]
    console.log(values)
    db.connect()
    const sql = 'UPDATE project_info SET workOffice= ? , dateSignature = ?, elevatorType = ?, endDate = ? WHERE username=?;'
    db.query(sql, values, (err, result)=>{
        if(err){
            return res.json({status: 'error', message: err})
        }
        
        return res.json({status: 'success'})
    })
})

//add engineer
app.post('/project/add-engineer',(req,res)=>{
    const values =[req.body.engineer, req.body.username]
    const sql = 'UPDATE project_info SET engineer=? WHERE username=?;'
    db.connect()
    db.query(sql, values,(err, result)=>{
        if(err) {
            return res.json({status:'error', message:err})
        }
        return res.json({status:'success'})
    })
})
//update that we are in the planning phase
app.post('/project/planning-phase',(req,res)=>{
    const username=req.body.username
    const sql = "UPDATE project_info SET planning = '1' WHERE username = ?;"
    db.connect()
    db.query(sql, [username],(err,result)=>{
        if(err) {
            console.log(err)
            return res.json({status:'error'})
        }
   
        return res.json({status:'success'})
    })
})
//update that we are in the purchase phase
app.post('/project/purchase-phase',(req,res)=>{
    const username=req.body.username
    const sql = "UPDATE project_info SET procurement = '1' WHERE username = ?;"
    db.connect()
    db.query(sql, [username],(err,result)=>{
        if(err) return res.json({status:'error'})
        return res.json({status:'success'})
    })
})
//date to the electricity company
app.post('/project/date-to-electric-company',(req,res)=>{
    const values = [req.body.electricCompany, req.body.username]
    const sql = 'UPDATE project_info SET electricCompany =? WHERE username=?;'
    db.connect()
    db.query(sql,values, (err,result)=>{
        if(err) return res.json({status:"error"})
        return res.json({status:'success'})
    })
})
//date to the standards-institute company
app.post('/project/date-to-standards-institute',(req,res)=>{
    const values = [req.body.standardsInstitute, req.body.username]
    const sql = 'UPDATE project_info SET standardsInstitute =? WHERE username=?;'
    db.connect()
    db.query(sql,values, (err,result)=>{
        if(err) return res.json({status:"error"})
        return res.json({status:'success'})
    })
})
//date receive elevator
app.post('/project/date-receive-elevator',(req,res)=>{
    const values = [req.body.receivElevator, req.body.username]
    const sql = 'UPDATE project_info SET receivElevator =? WHERE username=?;'
    db.connect()
    db.query(sql,values, (err,result)=>{
        if(err) return res.json({status:"error"})
        return res.json({status:'success'})
    })
})
//upload work plan
app.post('/project/upload-work-plan',(req,res)=>{
    const username = req.body.username
    console.log(username)
    const sql = "UPDATE project_info SET workPlan ='1' WHERE username = ?;"
    db.connect()
    db.query(sql, [username],(err,result)=>{
        if(err) return res.json({status:"error"})
        console.log(result)
        return res.json({status:'success'})

    })
})
//delete project from users
app.delete('/manager/delete-project',(req, res)=>{
    const projectNum = req.query.projectNum
    console.log(projectNum)
    const sql = "DELETE FROM users WHERE projectNum = (?); DELETE FROM project_info WHERE projectNum = (?);"
    db.connect()
    db.query(sql, [projectNum,projectNum], (err, result)=>{
        if(err) return res.json({status: "error"})
        console.log(result)
        return res.json({status: "success"})
    })
})

/* Error handler middleware */
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(err.message, err.stack);
  res.status(statusCode).json({ message: err.message });
  return;
});
const PORT = process.env.PORT || 9000;
//create a server
app.listen(PORT, console.log(`Server is running on PORT ${PORT}`));