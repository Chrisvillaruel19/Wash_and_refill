import dotenv from "dotenv";
dotenv.config();
export const ENV = {
    PORT: process.env.PORT || 8000,
    BACKEND_PORT: process.env.BACKEND_URL || 'http://localhost:8000',
    DATABASE_URL: process.env.DATABASE_URL
};
//# sourceMappingURL=env.js.map