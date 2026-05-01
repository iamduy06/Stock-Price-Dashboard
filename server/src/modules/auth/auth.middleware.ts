import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.status(401).send({ message: 'Authorization header is missing' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
      return reply.status(401).send({ message: 'Invalid token format' });
    }

    const token = parts[1];
    if (!token) {
      return reply.status(401).send({ message: 'Token is missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    (request as any).user = decoded;
  } catch (err) {
    return reply.status(401).send({ message: 'Invalid or expired token' });
  }
};
