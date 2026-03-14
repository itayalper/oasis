import { Router } from 'express';
import { validate } from '../middleware/validate';
import { ensureSession } from '../middleware/ensureSession';
import { createTicketSchema } from '../schemas/tickets.schema';
import { handleCreateTicket, handleGetRecentTickets } from '../handlers/tickets.handler';

const router = Router();

router.use(ensureSession);

router.post('/', validate(createTicketSchema), handleCreateTicket);
router.get('/', handleGetRecentTickets);

export default router;
