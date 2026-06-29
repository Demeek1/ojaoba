import express from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../controllers/assistant.controller';

const r = express.Router();

// AI calls cost money — keep a sane per-IP cap for the public assistant
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "You're sending messages a bit fast — give me a second 😊" },
});

r.post('/chat', aiLimiter, ctrl.chat);
r.get('/profile', ctrl.profile);

export default r;
