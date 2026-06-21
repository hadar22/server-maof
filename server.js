require("dotenv").config();
const express = require("express");
const cors = require("cors")
const bcrypt = require("bcrypt")
//const session = require("express-session")
const mysql = require('mysql2/promise');
const session = require('express-session')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')

const app = express();
// אפשר כל דומיין (לבדיקות בלבד, לא לפרודקשן)
//app.use(core())

const allowedOrigins = ['http://localhost:3000', 'https://www.maofelevators.com', 'https://maofelevators.com'];
// או – בצורה מאובטחת יותר, אפשר רק את הדומיין שלך:
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      },
    credentials: true // אם אתה משתמש ב-cookies או authentication headers
     
}))


app.use(express.json());
app.use(express.urlencoded({ extended: true })); //pass form data


const db = mysql.createPool({
    host: process.env.HOST ,
    user: process.env.USER,
    password: process.env.MYSQL_P,
    database: process.env.DB,
    multipleStatements: true,
    timezone: '+00:00',
    // connectTimeout: 60000
})

//--
const SECRET = process.env.JWT_SECRET
//--
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
// app.use((req,res,next)=>{
//     if(req.session.userAuth){
//         res.locals.userAuth = req.session.userAuth
//     }else{
//         res.locals.userAuth = null
//     }
//     next()
// })
//contact page
app.post('/api/contact', async (req, res)=>{
    try{
        const {fullName, email, phone, city, street, buildingNumber} = req.body

        //
        if(!fullName || !email || !phone || !city || !street || !buildingNumber){
            return res.status(400).json({error: "Missing required fields"})
        }
        //create transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        })
        //email content
        const mailoption = {
            from: process.env.GMAIL_USER,
            to: process.env.GMAIL_USER,
            subject: `פניה חדשה מהאתר - ${fullName}`,
            html: `
                <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1a4ba0; border-bottom: 2px solid #1a4ba0; padding-bottom:10px;">
                        פנייה חדשה מאתר מעוף מעליות
                    </h2>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr>
                             <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">שם מלא:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${fullName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">אימייל:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                <a href="mailto:${email}">${email}</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">טלפון:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                <a href="tel:${phone}">${phone}</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">עיר:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${city}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">רחוב:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${street}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; font-weight: bold;">מספר בניין:</td>
                            <td style="padding: 10px;">${buildingNumber}</td>
                        </tr>
                    </table>
                     <p style="margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-radius: 5px; font-size: 14px; color: #666;">
            הודעה זו נשלחה באופן אוטומטי מטופס יצירת הקשר באתר מעוף מעליות.
          </p>

                </div>`,
        }
        //send email
        await transporter.sendMail(mailoption)

        return res.json({success: true})

    }catch(error){
        console.error("Error sending email:", error)
        return res.status(500).json({error: "Failed to send email"})
    }
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
        // db.connect()
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
// app.post('/register' , async(req, res)=>{
//     console.log("jjj")
//     const {name, password} = req.body
//     console.log(password)
//     // const salt = await bcrypt.genSalt(10)
//     const passwordHashed = await bcrypt.hash(password ,10)
//     const sql = "INSERT INTO users (projectNum, projectName, password) VALUES (?,?,?); "
//     db.query(sql, [password, name, passwordHashed], (err, result)=>{
//         if(err){ 
//             console.log(err)
//             return res.json({message: "error"})}
//         return res.json({status: "success"})
//     })
// })
// login--NEW
// app.post('/projects/login', async(req, res, next)=>{
//     res.set('Access-Control-Allow-Origin', '*');
//     // console.log("heyy")
//     const {name, password} = req.body
//    console.log("body",req.body)
//     const sql = "SELECT * FROM users WHERE projectName=?;"
  
//     db.query(sql, [name] ,async (err, data)=>{
//        console.log("heyy1")
//         if(err){ 
//             console.log("error", err)
//             return res.json({status:"error",message: err.sqlMessage})
//         }
//         const isGood = await bcrypt.compareSync(password, data[0].password)
    
//         // console.log(isGood)
//         if(!isGood){
//             console.log("not good")
//             return res.json({status: "error" ,message: "הסיסמא שגויה"})
//           }
//           else{
//             if(name === process.env.MANAGE){
//                 return res.json({status: 'success' ,data:{name: name, projectNum: data[0].projectNum, manage:"1"}
//             })
//             }else{
//                 return res.json({status: 'success' ,data:{name: name, projectNum: data[0].projectNum, manage: "0"}
//             })
//             }
            
//           }
//         // console.log(data[0].projectNum)
//         // req.session.userAuth = data[0].projectNum 
            
//         }) 
// })
app.post('/projects/login', async(req, res)=>{
    const {name, password} = req.body
    console.log(name)
    const [rows] = await db.execute('SELECT * FROM users WHERE projectName=?', [name])
    if(rows.length === 0) return res.status(401).json({message: 'שם פרויקט לא נמצא'})

    const project = rows[0]
    match = await bcrypt.compare(password, project.password)
    if(!match) return res.status(401).json({message: 'סיסמה שגויה'})

    const token = jwt.sign({id: project.id, role: project.role}, SECRET, {expiresIn: '1h'})
    console.log( project.role);
    res.json({token, role: project.role, name: project.projectName})
})
const authenticate = (req, res, next)=>{
    //console.log(req.headers.authorization)
    const authHeader = req.headers.authorization
    if(!authHeader){
        
         return res.status(401).json({message:'אין אימות סיסמא'
         })
        }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, SECRET, (err, project)=>{
        if(err) return res.status(403).json({message:'שגיאה באימות'})
        req.project = project
       
        next()
    })
}
// const isAdmin = (req, res, next)=>{
//     if(req.project.role !== 'admin') return res.sendStatus(403)
//     next()
// }
const isAdmin = (req, res, next) =>{
    if(!req.project){
        return res.status(401).json({
            status: "error",
            message: "Authentication error: missing project data"
        })
    }
    if(!req.project.role){
        return res.status(401).json({
            status: "error",
            message:"Authentication error: no role found"
        })
    }
    if(req.project.role !== "admin"){
        return res.status(403).json({
            status: "error",
            message: "Access denied: admin only"
        })
    }
    next()
}


app.get('/admin-data', authenticate, isAdmin, (req, res)=>{
    res.json({status:'success', message: 'Welcome Admin!'})
})
app.get('/project-data', authenticate, (req, res)=>{
    // res.json({message: `Welcome ${req.project.role}`})
    res.json({message:'success'})
})
//add new project -NEW
app.post('/manager/add', authenticate, isAdmin,async (req,res)=>{
    const {projectName, password, contact, phoneNum, projectNum, role }= req.body
    console.log(projectNum)
    console.log(role)
    try{
        const [existing] = await db.execute(
            'SELECT * FROM users WHERE projectNum = ?', [projectNum]
        )
        if(existing.length>0){
            console.log("hii")
            return res.status(400).json({message:'פרויקט כבר קיים'})
        }

        //Password encryption
        const passwordHashed = await bcrypt.hash(password ,10)
        //Inserting data into the USERS table
        await db.execute(
            "INSERT INTO users (projectName, password, contact, phoneNum, projectNum, role) VALUES (?,?,?,?,?,?);",[projectName, passwordHashed, contact, phoneNum, projectNum, role]
        )
        //Inserting data into the project_info table
        await db.execute(
            "INSERT INTO project_info ( projectNum, projectName) VALUES (?,?);", [projectNum, projectName]
        )
        res.json({status: 'success', message: 'הפרויקט נוסף בהצלחה'})
    }catch(err){
        console.error(err)
        res.status(500).json({status: 'error', message:'שגיאה בהוספת פרויקט'})
    }
    // const isAdmin = 0
    // const passwordHashed = await bcrypt.hash(password ,10)
    // const sql = "INSERT INTO users (projectName, password, contact, phoneNum, projectNum, isAdmin) VALUES (?,?,?,?,?,?);"
    // db.query(sql, [projectName, passwordHashed, contact, phoneNum, projectNum, isAdmin], (err, result) => {
    //     if(err){
    //         console.log(err);
    //         return res.json({message: "error"})}
    //     else{
    //         console.log(projectNum, projectName);
    //         const sql2 = "INSERT INTO project_info ( projectNum, projectName) VALUES (?,?);"
    //         db.query(sql2, [projectNum, projectName], (err2, result2)=>{
    //             if(err2){ 
    //                 console.log("שגיאה",err2)
    //                 return res.json({message: "error2"})}
    //             else{
    //                 console.log("res",result2);
    //                 return res.json({message: "success"})
    //             }
    //         })
    //     }
    // })
})
//get all project to manager page
app.get('/manager/get-all-projects', authenticate, isAdmin, async (req, res)=>{
    try{
        const [rows] = await db.execute("SELECT * FROM users WHERE role != 'admin'") 
        const safeRows = Array.isArray(rows) ? rows :[]
        return res.json({
            status: 'success', myData: safeRows
        })
    }catch (err) {
        console.error("DB error:", err)
        return res.status(500).json({
            status: 'error',
            message: 'Database error',
            myData: []
        })
    }
    
    
})
//logout
// app.get('/projects/logout', (req,res, next)=>{
//     req.session.destroy()
//     res.clearCookie('token')
//     return res.json({Status: "Seccess"})
// })


//All project data
app.get('/project/get-all-project-data',authenticate, async(req, res)=>{
    const projectNum = req.query.projectNum
    console.log(projectNum)
    const [rows] = await db.execute("SELECT *, DATE_FORMAT(dateSignature, '%Y-%m-%d') AS dateSignature, DATE_FORMAT(endDate, '%Y-%m-%d') AS endDate, DATE_FORMAT(electricCompany, '%Y-%m-%d') AS electricCompany, DATE_FORMAT(standardsInstitute, '%Y-%m-%d') AS standardsInstitute, DATE_FORMAT(receivElevator, '%Y-%m-%d') AS receivElevator  FROM project_info WHERE projectName=?", [projectNum])
    // const [rows] = await db.execute("SELECT * FROM project_info WHERE projectName LIKE ?;",[`${projectNum}%`])
    console.log("rows",rows[0])
    if(rows.length === 0) return res.status(501).json({message: 'הפרויקט לא נמצא'})
    const user = rows[0]
    return res.json({status: 'success', data: user})
    
})


//Update first details
app.post('/project/update-first-details', async(req, res)=>{
    const projectNum= req.query.projectNum
    console.log("update", projectNum)

    const [ans] = await db.execute('UPDATE project_info SET workOffice= ? , dateSignature = ?, elevatorType = ?, endDate = ? WHERE projectNum=?;',[req.body.workOffice, req.body.dateSignature, req.body.elevatorType, req.body.endDate, projectNum])
    console.log(ans)
    if(ans.affectedRows>0){
        return res.json({status: 'success', message:"הנתונים עודכנו בהצלחה"})
    }else{
        return res.status(400).json({status:'error', message: "לא התבצע עדכון. ייתכן שהפרויקט לא קיים או שהנתונים לא השתנו"})
    }
   
})

//add engineer
app.post('/project/add-engineer',async (req,res)=>{
    const values =[req.body.engineer, req.body.username]
    console.log("engineer")
    const [ans] = await db.execute('UPDATE project_info SET engineer=? WHERE projectName=?;', [req.body.engineer, req.body.username])
    if(ans.affectedRows>0){
        return res.json({status: 'success', message:"שם המהנדס נשמר בהצלחה"})
    }else{
        return res.status(400).json({status:'error', message: "לא התבצע עדכון. ייתכן שהפרויקט לא קיים או שהנתונים לא השתנו"})
    }
    
})
//update that we are in the planning phase
app.post('/project/planning-phase', async (req,res)=>{
    const username=req.body.username
    const [ans] = await db.execute("UPDATE project_info SET planning = '1' WHERE projectName = ?;", [username])
    if(ans.affectedRows>0){
        return res.json({status: 'success'})
    }else{
        return res.status(400).json({status:'error', message: "לא התבצע עדכון. ייתכן שהפרויקט לא קיים או שהנתונים לא השתנו"})
    }
})
//update that we are in the purchase phase
app.post('/project/purchase-phase', async (req,res)=>{
    const username=req.body.username
    const [ans] = await db.execute("UPDATE project_info SET procurement = '1' WHERE projectName = ?;", [username])
    if(ans.affectedRows>0){
        return res.json({status: 'success'})
    }else{
        return res.status(400).json({status:'error'})
    }
})
//date to the electricity company
app.post('/project/date-to-electric-company',async (req,res)=>{
    
    const [ans] = await db.execute('UPDATE project_info SET electricCompany=? WHERE projectName=?;', [req.body.electricCompany, req.body.username])
    if(ans.affectedRows>0){
        return res.json({status: 'success'})
    }else{
        return res.status(400).json({status:'error'})
    }
   
})
//date to the standards-institute company
app.post('/project/date-to-standards-institute', async (req,res)=>{
    
    const [ans] = await db.execute('UPDATE project_info SET standardsInstitute =? WHERE projectName=?;',[req.body.standardsInstitute, req.body.username])
    if(ans.affectedRows>0){
        return res.json({status: 'success'})
    }else{
        return res.status(400).json({status:'error'})
    }
})
//date receive elevator
app.post('/project/date-receive-elevator', async (req,res)=>{
    
    const [ans] = await db.execute('UPDATE project_info SET receivElevator =? WHERE projectName=?;',[req.body.receivElevator, req.body.username])
    if(ans.affectedRows>0){
        return res.json({status: 'success'})
    }else{
        return res.status(400).json({status:'error'})
    }
})
//upload work plan
app.post('/project/upload-work-plan',async (req,res)=>{
    const username = req.body.username
    console.log(username)
    const [ans] = await db.execute("UPDATE project_info SET workPlan ='1' WHERE projectName = ?;", [username]) 
    if(ans.affectedRows>0){
        return res.json({status: 'success'})
    }else{
        return res.status(400).json({status:'error'})
    }
})
//delete project from users - NEW
app.delete('/manager/delete-project', async (req, res)=>{
    const projectNum = req.query.projectNum
    console.log("SERVER GOT projectNum =", req.query.projectNum)

    const [ans1] = await db.execute("DELETE FROM users WHERE projectNum = ?",[projectNum])
    const [ans2] = await db.execute("DELETE FROM project_info WHERE projectNum = ?",[projectNum])
    console.log(ans2)
    console.log(ans1)
    if(ans1.affectedRows>0 & ans2.affectedRows>0){
        return res.json({status: 'success'})
    }else{
        return res.status(400).json({status:'error'})
    }
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