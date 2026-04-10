import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export default app;
