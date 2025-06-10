import { Router } from 'express';
import {
  getContactsController,
  getContactByIdController,
} from '../controllers/contacts.js';

const router = Router();

router.get('/contacts', getContactsController);
router.get('/contacts/:contactId', getContactByIdController);

export default router;
