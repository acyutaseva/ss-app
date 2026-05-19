import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  dbUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ss_app'
};
