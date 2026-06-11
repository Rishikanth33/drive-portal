import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fileUpload from 'express-fileupload';

import authRoutes from './routes/authRoutes';
import fileRoutes from './routes/fileRoutes';
import folderRoutes from './routes/folderRoutes';
import adminRoutes from './routes/adminRoutes';
import { authMiddleware } from './middleware/authMiddleware';

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// VERY IMPORTANT
app.use(
  fileUpload({
    createParentPath: true,
  })
);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({
    message: 'Protected route accessed successfully',
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Drive Portal API Running 🚀',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});