import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/authRoutes';
import fileRoutes from './routes/fileRoutes';
import folderRoutes from './routes/folderRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

const app = express();
app.use('/api/admin', adminRoutes);
app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/folders', folderRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});