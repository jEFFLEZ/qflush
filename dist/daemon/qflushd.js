const express = require('express');
const app = express();
const PORT = process.env.QFLUSHD_PORT ? Number(process.env.QFLUSHD_PORT) : 43421;
app.get('/npz/rome-index', (_req, res) => res.json({ success: true, count: 0, items: [] }));
app.listen(PORT, () => console.log(`placeholder qflushd listening on ${PORT}`));
