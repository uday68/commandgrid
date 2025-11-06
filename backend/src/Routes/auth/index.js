import express from 'express'

import companyAdminRegisteration from './companyAdminRegistration.js'
import login from './login.js'
// import session  from './session.js' // Removed session-based auth, using only JWT
import userRegisteration from './userRegistration.js'


const router = express.Router();

router.use('/login',login)
// router.use('/session',session) // Removed session-based auth, using only JWT
router.use('/userregistration',userRegisteration)
router.use('/companyregistration',companyAdminRegisteration)
router.post('/logout', async (req, res) => {
  // Handle logout logic here
  // In a real implementation, you might invalidate tokens in a database or cache
  // For JWT, the client side is responsible for removing tokens from localStorage
  
  // Just send success response as token invalidation happens on client side
  res.status(200).json({ message: 'Logged out successfully' });
});

export default router






