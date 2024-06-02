const bcrypt = require("bcryptjs")
const db = require('./db')
const helper = require('../helper')
const config = require('../config')

async function getMultiple(page = 1){
    //const offset = helper.getOffset(page, config.listPerPage )
    const rows = await db.query(
        'SELECT username, projectNum FROM users; '
    )
    const data = helper.emptyOrRows(rows)
    const meta = {page}

    return {
        data,
        meta
    }
}
async function login(username, password){
   console.log(password)
    const result = await db.query(
        `SELECT * FROM users WHERE username='${username}';`
    )
    
    console.log("g",typeof result[0].username)
    console.log("p",username === result[0].username)
    
    let message = 'Error in login '
    
    if(result.length>0){
        message = "successfully"
    }
    const isPasswordValid = await bcrypt.compare(password, result[0].password)
    if(!isPasswordValid){
        return message = 'הסיסמא לא נכונה'
    }
    
    
    return {
        message,
        result
    }
}
module.exports = {
    getMultiple,
    login
}