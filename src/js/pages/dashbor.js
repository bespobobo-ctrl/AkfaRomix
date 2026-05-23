import { supabase } from '../core/supabase.js';

let currentUser = null;
let pipelineData = {
    stanok: [],
    sovutish: [],
    kraska: [],
    sushilka: [],
    packaging_active: 0,
    warehouse_pending: 0,
    finished: []
};

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('ac_manager_session');
    if (saved) {
        currentUser = JSON.parse(saved);
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dash-screen').style.display = 'block';
        initDash();
    }
});

document.getElementById('login-btn').onclick = () => {
    const id = document.getElementById('login-id').value.trim();
    const pass = document.getElementById('login-pass').value.trim();

    if (id.toUpperCase().replace(/\s+/g, '') === 'AC1' && pass === '123') {
        currentUser = { id: 'AC1', name: 'Ishlab Chiqarish Boshlig\'i' };
        localStorage.setItem('ac_manager_session', JSON.stringify(currentUser));
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dash-screen').style.display = 'block';
        initDash();
    } else {
        alert('Login yoki parol xato!');
    }
};

window.logout = () => {
    localStorage.removeItem('ac_manager_session');
    location.reload();
};

function initDash() {
    fetchPipelineData();
    setInterval(fetchPipelineData, 5000); // refresh every 5s
}

async function fetchPipelineData() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const startOfDay = `${today}T00:00:00.000Z`;
        const endOfDay = `${today}T23:59:59.999Z`;

        const { data, error } = await supabase
            .from('clapak_production')
            .select('*')
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay);

        if (error) throw error;

        pipelineData = { stanok: [], sovutish: [], kraska: [], sushilka: [], packaging_active: 0, warehouse_pending: 0, finished: [] };

        data.forEach(item => {
            if (item.stage.startsWith('stanok')) pipelineData.stanok.push(item);
            else if (item.stage.startsWith('sovutish')) pipelineData.sovutish.push(item);
            else if (item.stage.startsWith('kraska')) pipelineData.kraska.push(item);
            else if (item.stage.startsWith('sushilka')) pipelineData.sushilka.push(item);
            else if (item.stage.startsWith('packaging')) {
                // Active packaging
                pipelineData.packaging_active += (item.quantity || 0);
            }
            else if (item.stage === 'warehouse_pending') {
                // Finished by qadoqlovchi, waiting for manager
                pipelineData.warehouse_pending += (item.quantity || 0);
            }
            else if (item.stage === 'finished') {
                pipelineData.finished.push(item);
            }
        });

        renderPipeline();
    } catch (e) {
        console.error("Dashboard fetch error:", e);
    }
}

function renderPipeline() {
    // 1. Stanok
    document.getElementById('pipe-stanok').innerHTML = pipelineData.stanok.map(c => 
        `<div class="machine-card">
            <div style="font-size:0.8rem; color:#888;">Arava #${c.stage.split('-')[1] || '?'}</div>
            <div style="font-weight:bold; margin-top:5px;">${c.model}</div>
            <div style="font-size:0.9rem; color:#00f2ff; margin-top:5px;">${c.quantity} dona</div>
        </div>`
    ).join('') || '<div style="color:#666; text-align:center;">Bo\'sh</div>';

    // 2. Sovutish
    document.getElementById('pipe-sovutish').innerHTML = pipelineData.sovutish.map(c => 
        `<div class="machine-card">
            <div style="font-size:0.8rem; color:#888;">Arava #${c.stage.split('-')[1] || '?'}</div>
            <div style="font-weight:bold; margin-top:5px;">${c.model}</div>
            <div style="font-size:0.9rem; color:#00f2ff; margin-top:5px;">${c.quantity} dona</div>
        </div>`
    ).join('') || '<div style="color:#666; text-align:center;">Bo\'sh</div>';

    // 3. Kraska
    document.getElementById('pipe-kraska').innerHTML = pipelineData.kraska.map(c => 
        `<div class="machine-card">
            <div style="font-size:0.8rem; color:#888;">Arava #${c.stage.split('-')[1] || '?'}</div>
            <div style="font-weight:bold; margin-top:5px;">${c.model}</div>
            <div style="font-size:0.9rem; color:#ba00ff; margin-top:5px;">${c.quantity} dona</div>
        </div>`
    ).join('') || '<div style="color:#666; text-align:center;">Bo\'sh</div>';

    // 4. Sushilka
    document.getElementById('pipe-sushilka').innerHTML = pipelineData.sushilka.map(c => 
        `<div class="machine-card">
            <div style="font-size:0.8rem; color:#888;">Arava #${c.stage.split('-')[1] || '?'}</div>
            <div style="font-weight:bold; margin-top:5px;">${c.model}</div>
            <div style="font-size:0.9rem; color:#fabb18; margin-top:5px;">${c.quantity} dona</div>
        </div>`
    ).join('') || '<div style="color:#666; text-align:center;">Bo\'sh</div>';

    // 5. Qadoqlash
    document.getElementById('q-qty').textContent = pipelineData.packaging_active;
    document.getElementById('q-boxes').textContent = `${Math.floor(pipelineData.packaging_active / 4)} KOMPLEKT (BOX)`;

    // 6. Tayyor Ombor
    const pendingBoxes = Math.floor(pipelineData.warehouse_pending / 4);
    document.getElementById('w-boxes').textContent = pendingBoxes;
    
    const btnReceive = document.getElementById('btn-receive');
    if (pendingBoxes > 0) {
        btnReceive.disabled = false;
        btnReceive.onclick = async () => {
            btnReceive.disabled = true;
            btnReceive.textContent = "QABUL QILINMOQDA...";
            try {
                const today = new Date().toISOString().split('T')[0];
                await supabase
                    .from('clapak_production')
                    .update({ stage: 'finished', status: 'DONE_WAREHOUSE' })
                    .eq('stage', 'warehouse_pending')
                    .gte('start_time', `${today}T00:00:00.000Z`);
                
                alert(`${pendingBoxes} komplekt omborga muvaffaqiyatli qabul qilindi!`);
                fetchPipelineData();
            } catch (e) {
                console.error(e);
                alert("Xatolik yuz berdi!");
            }
            btnReceive.textContent = "OMBORGA QABUL QILISH";
        };
    } else {
        btnReceive.disabled = true;
    }

    // Top Metrics
    const activeCarts = pipelineData.stanok.length + pipelineData.sovutish.length + pipelineData.kraska.length + pipelineData.sushilka.length;
    document.getElementById('metric-carts').textContent = activeCarts;

    let finishedQty = pipelineData.finished.reduce((sum, i) => sum + (i.quantity || 0), 0);
    document.getElementById('metric-today').textContent = finishedQty;
    document.getElementById('metric-boxes').textContent = Math.floor(finishedQty / 4);
}
