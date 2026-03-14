import { Router } from 'express';
import { validate } from '../middleware/validate';
import { ensureSession } from '../middleware/ensureSession';
import { connectJiraSchema } from '../schemas/tickets.schema';
import {
  handleConnect,
  handleGetConnection,
  handleDisconnect,
  handleGetProjects,
} from '../handlers/jira.handler';

const router = Router();

router.use(ensureSession);

router.post('/connect', validate(connectJiraSchema), handleConnect);
router.get('/connection', handleGetConnection);
router.delete('/connection', handleDisconnect);
router.get('/projects', handleGetProjects);

export default router;
