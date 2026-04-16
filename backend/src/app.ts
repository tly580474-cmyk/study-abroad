import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import authRoutes from './routes/authRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import schoolRoutes from './routes/schoolRoutes.js';
import majorRoutes from './routes/majorRoutes.js';
import userRoutes from './routes/userRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import forumRoutes from './routes/forumRoutes.js';
import schoolPostRoutes from './routes/schoolPostRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/majors', majorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/school-posts', schoolPostRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/export', exportRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export default app;
