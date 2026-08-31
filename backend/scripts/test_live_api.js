/**
 * Live API test: hit the running localhost server with a real JWT token
 * Run: node backend/scripts/test_live_api.js <JWT_TOKEN>
 */
import https from 'https';
import http from 'http';
import { URL } from 'url';

const TOKEN = process.argv[2];
if (!TOKEN) {
  console.error('Usage: node backend/scripts/test_live_api.js <JWT_TOKEN>');
  process.exit(1);
}

async function get(urlStr) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const opts = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    };
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const BASE = 'http://localhost:5001/api';

async function main() {
  console.log('=== LIVE API HEATMAP TEST ===\n');

  const tests = [
    { label: 'No filter (All Categories)', url: `${BASE}/analytics/heatmap?days=30` },
    { label: 'Fitness filter', url: `${BASE}/analytics/heatmap?days=30&category=Fitness` },
    { label: 'Health filter', url: `${BASE}/analytics/heatmap?days=30&category=Health` },
    { label: 'Productivity filter', url: `${BASE}/analytics/heatmap?days=30&category=Productivity` },
    { label: 'Learning filter (no habits)', url: `${BASE}/analytics/heatmap?days=30&category=Learning` },
  ];

  for (const test of tests) {
    const res = await get(test.url);
    if (res.status !== 200) {
      console.log(`❌ [${test.label}] HTTP ${res.status}:`, res.body);
      continue;
    }
    const cells = res.body.cells || [];
    const activeCells = cells.filter(c => c.count > 0);
    console.log(`✅ [${test.label}]`);
    console.log(`   totalCompletions=${res.body.totalCompletions}, activeDays=${res.body.activeDaysCount}, cells=${cells.length}`);
    if (activeCells.length > 0) {
      activeCells.slice(0, 5).forEach(c => console.log(`   → ${c.fullDate}: count=${c.count}`));
    } else {
      console.log('   → No active cells (empty heatmap)');
    }
    console.log();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
