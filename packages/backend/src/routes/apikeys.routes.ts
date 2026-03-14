import { Router } from 'express';
import { validate } from '../middleware/validate';
import { ensureSession } from '../middleware/ensureSession';
import { createApiKeySchema } from '../schemas/tickets.schema';
import { handleCreateApiKey, handleListApiKeys } from '../handlers/apikeys.handler';

const router = Router();

router.use(ensureSession);

router.post('/', validate(createApiKeySchema), handleCreateApiKey);
router.get('/', handleListApiKeys);

export default router;
