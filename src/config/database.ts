import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import 'reflect-metadata';

// Load environment variables
dotenv.config();

// Import entities
import { User } from '../entities/User';
import { Product } from '../entities/Product';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';

// Database connection configuration
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ecommerce_db',
  synchronize: process.env.NODE_ENV === 'development', // Auto-sync in development only
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Product, Cart, CartItem, Order, OrderItem],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
});

// Initialize database connection
export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('PostgreSQL database connected successfully');
    
    // Run migrations in production
    if (process.env.NODE_ENV === 'production') {
      await AppDataSource.runMigrations();
      console.log('Database migrations completed');
    }
  } catch (error) {
    console.error('Error connecting to PostgreSQL database:', error);
    throw error;
  }
};

// Close database connection
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
};