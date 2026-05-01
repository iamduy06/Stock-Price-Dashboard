import type { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../../config/supabase.js';

const SALT_ROUNDS = 10;
const INITIAL_BALANCE = 100000000;

export const register = async (request: FastifyRequest, reply: FastifyReply) => {
  const { username, password } = request.body as any;

  if (!username || !password)
    return reply.code(400).send({ message: "Username or password required" });
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser)
      return reply.code(400).send({ message: "Username already exists" });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { data, error } = await supabase
      .from('users')
      .insert([{
        username,
        password_hash,
        balance: INITIAL_BALANCE
      }])
      .select()
      .single();

    if (error) throw error;

    return reply.code(201).send({
      message: "User registered successfully",
      user: { id: data.id, username: data.username, balance: data.balance }
    })
  }
  catch (error: any) {
    return reply.status(500).send({ message: error.message });
  }
}

export const login = async (request: FastifyRequest, reply: FastifyReply) => {
  const { username, password } = request.body as any;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return reply.status(401).send({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return reply.status(401).send({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    return reply.send({
      message: 'Logged in successfully',
      token,
      user: { id: user.id, username: user.username, balance: user.balance }
    });
  } catch (error: any) {
    return reply.status(500).send({ message: error.message });
  }
};
