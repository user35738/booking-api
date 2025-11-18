import express from 'express';
import pg from 'pg';
import Joi from 'joi';

const app = express();
app.use(express.json());

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Validation schema
const reserveSchema = Joi.object({
  event_id: Joi.number().integer().positive().required(),
  user_id: Joi.string().max(255).required()
});

// Service: reserve seat
async function reserveSeat({ event_id, user_id }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock event row
    const ev = await client.query(
      'SELECT id, total_seats FROM events WHERE id = $1 FOR UPDATE',
      [event_id]
    );

    if (ev.rowCount === 0) {
      const err = new Error('Event not found');
      err.code = 'EVENT_NOT_FOUND';
      throw err;
    }

    // Check existing booking
    const existing = await client.query(
      'SELECT id FROM bookings WHERE event_id = $1 AND user_id = $2',
      [event_id, user_id]
    );

    if (existing.rowCount > 0) {
      const err = new Error('User already booked this event');
      err.code = 'ALREADY_BOOKED';
      throw err;
    }

    const countRes = await client.query(
      'SELECT COUNT(*)::int AS count FROM bookings WHERE event_id = $1',
      [event_id]
    );

    const taken = Number(countRes.rows[0].count);
    if (taken >= ev.rows[0].total_seats) {
      const err = new Error('No free seats available');
      err.code = 'NO_SEATS';
      throw err;
    }

    await client.query(
      'INSERT INTO bookings(event_id, user_id) VALUES ($1, $2)',
      [event_id, user_id]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Route
app.post('/api/bookings/reserve', async (req, res) => {
  const { error } = reserveSchema.validate(req.body);
  if (error) return res.status(422).json({ error: error.message });

  try {
    const result = await reserveSeat(req.body);
    return res.status(201).json(result);
  } catch (err) {
    if (err.code === 'ALREADY_BOOKED' || err.code === 'NO_SEATS' || err.code === 'EVENT_NOT_FOUND') {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

export default app; // for tests
