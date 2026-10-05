import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import healthRouter from './routes/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => res.json({ service: 'datatripwire-backend', status: 'ok' }));
app.use('/api/v1', healthRouter);

const specPath = path.resolve(__dirname, '../docs/openapi.yaml');
const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));

export default app;
