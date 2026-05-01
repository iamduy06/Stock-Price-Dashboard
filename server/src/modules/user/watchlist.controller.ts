import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../../config/supabase.js';

export const getWatchlist = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id: user_id } = (request as any).user;

  try {
    const { data, error } = await supabase
      .from('watchlists')
      .select('symbol, stocks(*)')
      .eq('user_id', user_id);

    if (error) throw error;
    return reply.send(data);
  } catch (error: any) {
    return reply.status(500).send({ message: error.message });
  }
};

export const addToWatchlist = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id: user_id } = (request as any).user;
  const { symbol } = request.body as any;

  if (!symbol) return reply.status(400).send({ message: 'Symbol is required' });

  try {
    const { data, error } = await supabase
      .from('watchlists')
      .insert({ user_id, symbol })
      .select()
      .single();

    if (error) return reply.status(400).send({ message: 'Stock already in watchlist or invalid symbol' });
    return reply.status(201).send(data);
  } catch (error: any) {
    return reply.status(500).send({ message: error.message });
  }
};

export const removeFromWatchlist = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id: user_id } = (request as any).user;
  const { symbol } = request.params as any;

  try {
    const { error } = await supabase
      .from('watchlists')
      .delete()
      .eq('user_id', user_id)
      .eq('symbol', symbol);

    if (error) throw error;
    return reply.send({ message: 'Removed from watchlist' });
  } catch (error: any) {
    return reply.status(500).send({ message: error.message });
  }
};
