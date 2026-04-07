import { createRealtimeServer } from './server';

const port = Number(process.env.PORT ?? 3001);
const server = createRealtimeServer({ port, log: true });

server
  .start()
  .then((boundPort) => {
    console.log(`[Server] Running on http://localhost:${boundPort}`);
  })
  .catch((error) => {
    console.error('[Server] Failed to start', error);
    process.exitCode = 1;
  });
