import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { app } from './app.js';
import jwt from 'jsonwebtoken';
import { SimulatorService } from './services/SimulatorService.js';

const PORT = Number(process.env.PORT) || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const pubClient = new Redis(REDIS_URL);
const subClient = pubClient.duplicate();

const server = http.createServer(app.server);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

io.adapter(createAdapter(pubClient, subClient));

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    const pureToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(pureToken, process.env.JWT_SECRET || 'secret');
    (socket as any).user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.on('subscribe', (symbols: string[]) => {
    symbols.forEach(symbol => {
      socket.join(`market:${symbol}`);
    });
  });

  socket.on('disconnect', () => {
  });
});

const simulator = SimulatorService.getInstance();
simulator.setOnTickCallback((tick) => {
  io.to(`market:${tick.symbol}`).emit('price_update', {
    s: tick.symbol,
    p: tick.price,
    v: tick.volume
  });
});

const start = async () => {
  try {
    await simulator.start();
    server.listen(PORT, '0.0.0.0', () => {
      console.log(` Server is running at http://localhost:${PORT}`);
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
