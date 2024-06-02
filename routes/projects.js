const express = require('express');
const router = express.Router();
const projects = require('../services/projects');

/* GET  */
router.get('/', async function(req, res, next) {
  try {
    res.json(await projects.getMultiple(req.query.page));
  } catch (err) {
    console.error(`Error while getting projects `, err.message);
    next(err);
  }
});

// router.get('/:username', async function(req, res, next){
//     try{
//         res.json(await projects.login(req.params.username))
//     }catch(err){
//         console.error('Error in login!', err.message)
//         next(err)
//     }
// })
router.get('/login', async function(req, res, next){
    const {username, password} = req.body
      if(!username || !password){
        return res.json( {
            error:'חייב למלא את כל השדות',
        })
    }
    try{
        
        const data = res.json(await projects.login(username, password))
        console.log(data.data)
        // req.session.userAuth = data[1].username
    }catch(err){
        console.error('Error in login!', err.message)
        next(err)
    }
})

module.exports = router;