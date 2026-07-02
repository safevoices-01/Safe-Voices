import { createServer } from 'node:net';
import { spawn } from 'node:child_process';

const DEFAULT_PORT = Number(process.env.PORT ?? '3000');
const MAX_PORT = 3100;

function canListen(port) {
    return new Promise((resolve) => {
        const server = createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close(() => resolve(true));
        });
        server.listen(port, '::');
    });
}

async function resolvePort() {
    for (let port = DEFAULT_PORT; port <= MAX_PORT; port += 1) {
        // eslint-disable-next-line no-await-in-loop
        if (await canListen(port)) return port;
    }
    throw new Error(
        `No available port found between ${DEFAULT_PORT} and ${MAX_PORT}.`,
    );
}

const port = await resolvePort();
if (port !== DEFAULT_PORT) {
    console.log(
        `Port ${DEFAULT_PORT} is in use. Starting @safevoices/web on ${port}.`,
    );
}

const child = spawn('next', ['dev', '--port', String(port)], {
    stdio: 'inherit',
    env: process.env,
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }
    process.exit(code ?? 0);
});
