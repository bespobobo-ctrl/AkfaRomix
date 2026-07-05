const { chromium } = require('playwright');
const NAME = 'FLOWFIX TEST ' + Date.now();

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1300 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

  await page.goto('http://localhost:5183/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('currentUser', JSON.stringify({ id: 'x', username: 'admin', role: 'admin', full_name: 'Super Admin' })));

  // 1. Create order via real Sotuv UI
  await page.goto('http://localhost:5183/src/projects/romix/sales/sales_dashboard.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.click('#openOrderModal');
  await page.waitForTimeout(800);
  await page.fill('#oCustomer', NAME);
  await page.fill('#oPhone', '+998901112233');
  await page.fill('#itemWidth', '1200');
  await page.fill('#itemHeight', '1400');
  await page.fill('#itemQty', '2');
  await page.click('#addItemBtn');
  await page.waitForTimeout(500);
  await page.fill('#oProdDeadline', '2026-07-15');
  await page.fill('#oAdvance', '3000000');
  await page.click('#saveOrderBtn');
  await page.waitForTimeout(2500);

  // No "Guruh Tayinlash" button should exist anywhere
  const hasAssignBtn = await page.evaluate(() => !!document.querySelector('.assign-btn'));
  console.log('HAS_ASSIGN_BTN (should be false):', hasAssignBtn);

  // Fetch order + material_requests directly
  const check1 = await page.evaluate(async (name) => {
    const mod = await import('/src/js/core/supabase.js');
    const s = mod.supabase;
    const { data: order } = await s.from('sales_orders').select('*').eq('customer_name', name).maybeSingle();
    const { data: req } = await s.from('material_requests').select('*').eq('order_id', order.id).maybeSingle();
    return { order_status: order.status, order_id: order.id, req_exists: !!req, req_status: req ? req.status : null, req_worker_group: req ? req.worker_group : 'N/A', materials: req ? req.materials_json : null };
  }, NAME);
  console.log('AFTER_ORDER_CREATE:', JSON.stringify(check1, null, 2));

  if (!check1.req_exists) {
    console.log('FAIL: material_requests was not auto-created');
    await browser.close();
    return;
  }

  // 2. Approve via warehouse QR flow
  await page.goto('http://localhost:5183/src/projects/romix/warehouse/warehouse_dashboard.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.click('#openScanModal');
  await page.waitForTimeout(700);
  await page.fill('#qrReqId', check1.order_id ? '' : '');
  // Need request id, fetch it
  const reqId = await page.evaluate(async (orderId) => {
    const mod = await import('/src/js/core/supabase.js');
    const { data } = await mod.supabase.from('material_requests').select('id').eq('order_id', orderId).maybeSingle();
    return data.id;
  }, check1.order_id);
  await page.fill('#qrReqId', reqId);
  await page.click('#searchReqBtn');
  await page.waitForTimeout(1500);
  const groupNameText = await page.evaluate(() => document.getElementById('reqGroupName')?.textContent);
  console.log('REQ_GROUP_NAME_DISPLAY (should not say undefined):', groupNameText);
  await page.click('#approveReqBtn');
  await page.waitForTimeout(2500);

  // 3. Verify order status is now Jarayonda
  const check2 = await page.evaluate(async (orderId) => {
    const mod = await import('/src/js/core/supabase.js');
    const { data: order } = await mod.supabase.from('sales_orders').select('status').eq('id', orderId).maybeSingle();
    const { data: req } = await mod.supabase.from('material_requests').select('status').eq('order_id', orderId).maybeSingle();
    return { order_status: order.status, req_status: req.status };
  }, check1.order_id);
  console.log('AFTER_WAREHOUSE_APPROVE:', JSON.stringify(check2, null, 2));

  // 4. Verify appears in production "Yangi (Qabul kutilmoqda)"
  await page.goto('http://localhost:5183/src/projects/romix/production/production_dashboard.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.click('.tab-btn[data-tab="pipeline"]');
  await page.waitForTimeout(3000);
  const inNewCol = await page.evaluate((name) => document.getElementById('pipelineColNew')?.textContent.includes(name), NAME);
  console.log('APPEARS_IN_PRODUCTION_READY_COL:', inNewCol);

  console.log('PAGE_ERRORS:', JSON.stringify(errors));

  // Cleanup
  await page.evaluate(async (orderId) => {
    const mod = await import('/src/js/core/supabase.js');
    const s = mod.supabase;
    await s.from('material_requests').delete().eq('order_id', orderId);
    await s.from('sales_orders').delete().eq('id', orderId);
  }, check1.order_id);
  console.log('CLEANED_UP');

  await browser.close();
})();
