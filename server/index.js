import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireAuth } from './auth.js';
import authRoutes from './routes/auth.js';
import patientsRoutes from './routes/patients.js';
import appointmentsRoutes from './routes/appointments.js';
import settingsRoutes from './routes/settings.js';
import profilesRoutes from './routes/profiles.js';
import clinicalRoutes from './routes/clinical.js';

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');
const startedAt = new Date().toISOString();

const app = express();
app.set('trust proxy', 1);

app.use(express.json({ limit: '10mb' }));

// `frontendBuiltAt` is the mtime of the served bundle: it tells you at a glance
// whether a deploy actually rebuilt `dist/` or just restarted the process.
app.get('/api/health', (req, res) => {
  let frontendBuiltAt = null;
  try {
    frontendBuiltAt = statSync(path.join(distPath, 'index.html')).mtime.toISOString();
  } catch {
    // dist/ missing — the frontend was never built in this image
  }
  res.json({ ok: true, startedAt, frontendBuiltAt });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', requireAuth, patientsRoutes);
app.use('/api/appointments', requireAuth, appointmentsRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/profiles', requireAuth, profilesRoutes);
app.use('/api', requireAuth, clinicalRoutes);

app.use(express.static(distPath));

app.use((err, req, res, next) => {
  console.error('Unhandled route error:', err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
