import { Router } from 'express';
import {
  getSchools,
  getSchoolById,
  getSchoolWithMajors,
  createSchool,
  updateSchool,
  deleteSchool,
} from '../controllers/schoolController.js';

const router = Router();

router.get('/', getSchools);
router.get('/:id', getSchoolById);
router.get('/:id/majors', getSchoolWithMajors);
router.get('/:id/with-majors', getSchoolWithMajors);
router.post('/', createSchool);
router.put('/:id', updateSchool);
router.delete('/:id', deleteSchool);

export default router;
