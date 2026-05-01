import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../../config/supabase.js';

export const getOrderHistory = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id: user_id } = (request as any).user;

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return reply.send(data);
  } catch (error: any) {
    return reply.status(500).send({ message: error.message });
  }
};
