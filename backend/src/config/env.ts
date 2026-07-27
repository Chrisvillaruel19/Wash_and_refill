import dotenv from "dotenv";
dotenv.config();

export const ENV = {
    PORT: process.env.PORT || 8000,
    BACKEND_PORT: process.env.BACKEND_URL ||'http://localhost:8000',
    DATABASE_URL: process.env.DATABASE_URL,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
} 