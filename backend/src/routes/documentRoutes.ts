import { Router } from 'express';
import multer from 'multer';
import {
  getDocuments,
  uploadDocument,
  getDocumentById,
  deleteDocument,
  getDocumentPreview,
  fixAllDocumentNames,
} from '../controllers/documentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.use(authenticate);

router.get('/fix-names', fixAllDocumentNames);
router.get('/preview/:id', getDocumentPreview);
router.get('/:applicationId', getDocuments);
router.post('/:applicationId', upload.single('file'), uploadDocument);
router.get('/download/:id', getDocumentById);
router.delete('/:id', deleteDocument);

export default router;
