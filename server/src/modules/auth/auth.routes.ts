import type { FastifyInstance } from 'fastify';
import { register, login } from './auth.controller.js';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', register);
  fastify.post('/login', login);
}
