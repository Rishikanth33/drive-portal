"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const fileRoutes_1 = __importDefault(require("./routes/fileRoutes"));
const folderRoutes_1 = __importDefault(require("./routes/folderRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const authMiddleware_1 = require("./middleware/authMiddleware");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({
    limit: '10mb',
}));
app.use(express_1.default.urlencoded({
    extended: true,
}));
// ✅ FILE UPLOAD MIDDLEWARE
app.use((0, express_fileupload_1.default)({
    createParentPath: true,
}));
// ✅ STATIC UPLOADS
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// ✅ ROUTES
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/files', fileRoutes_1.default);
app.use('/api/folders', folderRoutes_1.default);
// ✅ TEST PROTECTED ROUTE
app.get('/api/protected', authMiddleware_1.authMiddleware, (req, res) => {
    res.json({
        message: 'Protected route accessed successfully',
    });
});
// ✅ ROOT ROUTE
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
