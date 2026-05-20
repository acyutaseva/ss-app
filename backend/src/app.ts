import cors from 'cors';
import express from 'express';
import { resolve } from 'node:path';
import { auditMiddleware } from './middleware/audit.js';
import router from './routes/index.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '12mb' }));
app.use('/uploads/signatures', express.static('/data/signatures'));
app.use('/uploads/signatures', express.static(resolve(process.cwd(), 'data/signatures')));
app.use(auditMiddleware);
app.use('/api', router);
