import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../../config/supabase';

const SALT_ROUNDS = 10;
const INITIAL_BALANCE = 100_000_000;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'change_this_to_a_random_secret') {
    throw new Error('JWT_SECRET is not set or is using the default value — set a strong secret in .env');
  }
  return secret;
}

export const register = async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required' });

  const trimmed = username.trim();

  if (!USERNAME_RE.test(trimmed))
    return res.status(400).json({ message: 'Username must be 3–30 alphanumeric characters or underscores' });

  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' });

  try {
    const { data: existing, error: checkErr } = await supabase
      .from('users')
      .select('id')
      .eq('username', trimmed)
      .single();

    if (checkErr && checkErr.code !== 'PGRST116') {
      console.error('[register] supabase error:', checkErr.code, checkErr.message);
      return res.status(500).json({ message: 'Registration failed, please try again' });
    }

    if (existing)
      return res.status(400).json({ message: 'Username already taken' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { data, error } = await supabase
      .from('users')
      .insert([{ username: trimmed, password_hash, balance: INITIAL_BALANCE }])
      .select('id, username, balance')
      .single();

    if (error) throw error;

    const token = jwt.sign(
      { id: data.id, username: data.username },
      jwtSecret(),
      { expiresIn: '7d' }
    );

    return res.status(201).json({ token, user: data });
  } catch (err: any) {
    console.error('[register] error:', err.message);
    return res.status(500).json({ message: 'Registration failed, please try again' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required' });

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, balance')
      .eq('username', username.trim())
      .single();

    if (error || !user) {
      // Constant-time response to prevent user enumeration
      await bcrypt.compare(password, '$2b$10$invalidhashpadding000000000000000000000000000000000000');
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ message: 'Invalid username or password' });

    const token = jwt.sign(
      { id: user.id, username: user.username },
      jwtSecret(),
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: { id: user.id, username: user.username, balance: user.balance },
    });
  } catch (err: any) {
    console.error('[login] error:', err.message);
    return res.status(500).json({ message: 'Login failed, please try again' });
  }
};
