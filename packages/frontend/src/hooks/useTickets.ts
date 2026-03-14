import { useState, useCallback } from 'react';
import { ticketsApi, type TicketRecord, type CreateTicketBody } from '../api/client';

export function useTickets() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecent = useCallback(async (project: string) => {
    if (!project) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ticketsApi.getRecent(project);
      setTickets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTicket = useCallback(async (body: CreateTicketBody): Promise<TicketRecord> => {
    setLoading(true);
    setError(null);
    try {
      const ticket = await ticketsApi.create(body);
      return ticket;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { tickets, loading, error, loadRecent, createTicket };
}
