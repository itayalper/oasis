import { Router } from 'express';
import { validate } from '../middleware/validate';
import { ensureApiKey } from '../middleware/ensureApiKey';
import { externalCreateTicketSchema } from '../schemas/external.schema';
import { handleExternalCreateTicket } from '../handlers/external.handler';

const router = Router();

router.post('/tickets', ensureApiKey, validate(externalCreateTicketSchema), handleExternalCreateTicket);

export default router;
