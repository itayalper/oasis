import { Router } from 'express';
import { validate } from '../middleware/validate';
import { ensureSession } from '../middleware/ensureSession';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { handleRegister, handleLogin, handleLogout, handleMe } from '../handlers/auth.handler';

const router = Router();

router.post('/register', validate(registerSchema), handleRegister);
router.post('/login', validate(loginSchema), handleLogin);
router.post('/logout', handleLogout);
router.get('/me', ensureSession, handleMe);

export default router;
