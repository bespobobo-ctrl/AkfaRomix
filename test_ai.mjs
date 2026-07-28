import handler from './api/unified-chat.js';

async function runTest(dept, text) {
    console.log(`\n--- TESTING DEPT: ${dept} ---`);
    console.log(`USER: ${text}`);
    
    let responseData = null;
    const req = {
        method: 'POST',
        query: { dept },
        body: { action: 'chat', text: text, chatId: 'test_user_123' }
    };
    
    const res = {
        status: (code) => {
            return {
                json: (data) => {
                    responseData = data;
                }
            };
        }
    };

    await handler(req, res);
    console.log(`AI: ${responseData ? responseData.text : 'ERROR'}`);
}

async function main() {
    try {
        // Test 1: Buxgalter AI ga ombor haqida so'raymiz
        await runTest('buxgalter', 'Salom! Omborda qancha profil qolgan?');
        
        // Test 2: HR AI ga moliya haqida so'raymiz
        await runTest('hr', 'Assalomu alaykum. Kecha qancha daromad qildik?');
        
        // Test 3: Buxgalter AI ga moliya haqida so'raymiz (ruxsat etilgan)
        await runTest('buxgalter', 'Oxirgi xarajatlar qanday bo\'ldi?');
    } catch(e) {
        console.error(e);
    }
}

main();
