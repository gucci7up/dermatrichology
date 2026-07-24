import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAuth } from './auth.js';
import authRoutes from './routes/auth.js';
import patientsRoutes from './routes/patients.js';
import appointmentsRoutes from './routes/appointments.js';
import settingsRoutes from './routes/settings.js';
import profilesRoutes from './routes/profiles.js';
import clinicalRoutes from './routes/clinical.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/patients', requireAuth, patientsRoutes);
app.use('/api/appointments', requireAuth, appointmentsRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/profiles', requireAuth, profilesRoutes);
app.use('/api', requireAuth, clinicalRoutes);

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
