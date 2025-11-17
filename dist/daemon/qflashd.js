"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const supervisor_1 = require("../supervisor");
const logger_1 = require("../utils/logger");
const PORT = process.env.QFLASHD_PORT ? Number(process.env.QFLASHD_PORT) : 4500;
const server = http_1.default.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/status') {
        const running = (0, supervisor_1.listRunning)();
        res.end(JSON.stringify({ running }));
        return;
    }
    if (req.url && req.url.startsWith('/stop')) {
        const name = req.url.split('/')[2];
        if (name) {
            const ok = (0, supervisor_1.stopProcess)(name);
            res.end(JSON.stringify({ ok }));
            return;
        }
        (0, supervisor_1.stopAll)();
        res.end(JSON.stringify({ ok: true }));
        return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
});
server.listen(PORT, () => logger_1.logger.success(`qflashd running on http://localhost:${PORT}`));
