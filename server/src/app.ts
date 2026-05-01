import fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes.js';
import marketRoutes from './modules/market/market.routes.js';
import userRoutes from './modules/user/user.routes.js';

dotenv.config();

const app = fastify({ logger: true });


app.register(cors, { 
  origin: true 
});

app.register(authRoutes, { prefix: '/api/auth' });
app.register(marketRoutes, { prefix: '/api/stocks' });
app.register(userRoutes, { prefix: '/api/user' });

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

export { app };
