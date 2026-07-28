const fs = require('fs');
const path = require('path');

const romixPath = path.join(__dirname, 'src/projects/romix/romix_dashboard.html');
let content = fs.readFileSync(romixPath, 'utf8');

const replacement = `
    <!-- ============ ROMIX UNIFIED AI ASSISTANT ============ -->
    <div id="aiFloatingBtn" onclick="window.toggleRomixAiDrawer()" style="display:none; position:fixed; bottom:30px; right:30px; width:65px; height:65px; background:linear-gradient(135deg, #00d2ff, #3a7bd5); border-radius:50%; box-shadow:0 10px 30px rgba(0,210,255,0.4); align-items:center; justify-content:center; font-size:2rem; cursor:pointer; z-index:9000; transition:all 0.3s ease;" onmouseover="this.style.transform='scale(1.1) rotate(10deg)'" onmouseout="this.style.transform='scale(1) rotate(0deg)'" title="Romix AI Yordamchi">
        🤖
        <span id="aiBtnLabel" style="position:absolute; top:-10px; right:-10px; background:#ff4d4f; color:#fff; font-size:0.7rem; font-weight:800; padding:4px 8px; border-radius:20px; border:2px solid #111;">AI</span>
    </div>
    <div id="aiChatDrawer" style="position:fixed; top:0; right:-400px; width:380px; height:100vh; background:rgba(15,15,15,0.95); backdrop-filter:blur(20px); border-left:1px solid rgba(255,255,255,0.1); z-index:9999; transition:right 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); display:flex; flex-direction:column; box-shadow:-10px 0 40px rgba(0,0,0,0.5);">
        <div style="padding:20px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:space-between; background:rgba(0,210,255,0.05);">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:40px; height:40px; background:linear-gradient(135deg, #00d2ff, #3a7bd5); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; box-shadow:0 0 15px rgba(0,210,255,0.3);">🤖</div>
                <div>
                    <span id="aiDrawerTitle" style="font-weight:800; color:#fff; font-size:0.95rem; display:block;">AI Asistenti</span>
                    <span style="font-size:0.75rem; color:#00ff88; font-weight:600; display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:6px; height:6px; background:#00ff88; border-radius:50%; box-shadow:0 0 8px #00ff88;"></span>Online</span>
                </div>
            </div>
            <button onclick="window.toggleRomixAiDrawer()" style="background:rgba(255,255,255,0.1); border:none; width:32px; height:32px; border-radius:50%; color:#fff; cursor:pointer; font-size:1.1rem; display:flex; align-items:center; justify-content:center;">✕</button>
        </div>
        <div id="aiChatHistory" style="flex:1; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; font-size:0.85rem;">
            <div id="aiWelcomeBubble" style="background:rgba(0,210,255,0.08); border:1px solid rgba(0,210,255,0.25); border-radius:14px; padding:12px 14px; color:#fff; align-self:flex-start; max-width:88%; line-height:1.5;">
                👋 Assalomu alaykum! Men Romix AI yordamchisiman.
            </div>
        </div>
        <div style="padding:15px; border-top:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.3); display:flex; gap:10px;">
            <input type="text" id="aiInputText" placeholder="Savol yoki buyruq yozing..." style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:8px 12px; color:#fff; font-size:0.85rem; outline:none;" onkeydown="if(event.key==='Enter') window.submitAiMessage()">
            <button onclick="window.submitAiMessage()" style="background:#00d2ff; color:#000; border:none; padding:8px 14px; border-radius:12px; font-weight:800; font-size:0.85rem; cursor:pointer;">🚀</button>
        </div>
    </div>

    <!-- Scripts -->
    <script>
        const u = JSON.parse(localStorage.getItem('currentUser') || 'null');
        
        window.romixAiState = {
            endpoint: '/api/hr-ai-chat',
            chatId: 'admin_user',
            activeTab: 'dashboard'
        };

        function updateAiForTab(tabName) {
            window.romixAiState.activeTab = tabName;
            const btn = document.getElementById('aiFloatingBtn');
            const label = document.getElementById('aiBtnLabel');
            const title = document.getElementById('aiDrawerTitle');
            const welcome = document.getElementById('aiWelcomeBubble');
            
            if (!btn) return;
            
            if (tabName === 'dashboard' || tabName === 'logins') {
                btn.style.display = 'none';
                return;
            } else {
                btn.style.display = 'flex';
            }

            if (tabName === 'xodimlar') {
                label.textContent = 'HR AI';
                title.textContent = 'HR AI Asistenti';
                welcome.innerHTML = '👋 Assalomu alaykum! Men <strong>Romix HR AI</strong> yordamchisiman. Xodimlar va davomat bo\\'yicha menga savol berishingiz mumkin!';
                window.romixAiState.endpoint = '/api/hr-ai-chat';
                window.romixAiState.chatId = 'hr_user';
            } 
            else if (tabName === 'sotuv') {
                label.textContent = 'Sotuv AI';
                title.textContent = 'Sotuv AI Asistenti';
                welcome.innerHTML = '👋 Assalomu alaykum! Men <strong>Romix Sotuv AI</strong> yordamchisiman. Buyurtmalar va savdo bo\\'yicha menga savol berishingiz mumkin!';
                window.romixAiState.endpoint = '/api/sotuv-ai-chat';
                window.romixAiState.chatId = 'sotuv_user';
            }
            else if (tabName === 'ishlab_chiqarish' || tabName === 'tayyor_mahsulot') {
                label.textContent = 'Zavod AI';
                title.textContent = 'Ishlab Chiqarish AI';
                welcome.innerHTML = '👋 Assalomu alaykum! Men <strong>Romix Zavod AI</strong> yordamchisiman. Ishlab chiqarish bo\\'yicha menga savol berishingiz mumkin!';
                window.romixAiState.endpoint = '/api/ishlab-chiqarish-ai-chat';
                window.romixAiState.chatId = 'zavod_user';
            }
            else if (tabName === 'buhgalter') {
                label.textContent = 'Buxgalter AI';
                title.textContent = 'Buxgalteriya AI';
                welcome.innerHTML = '👋 Assalomu alaykum! Men <strong>Romix Buxgalteriya AI</strong> yordamchisiman. Moliya va xarajatlar bo\\'yicha yordam beraman!';
                window.romixAiState.endpoint = '/api/buxgalter-ai-chat';
                window.romixAiState.chatId = 'buxgalter_user';
            }
            else if (tabName === 'ombor') {
                label.textContent = 'Ombor AI';
                title.textContent = 'Ombor AI Asistenti';
                welcome.innerHTML = '👋 Assalomu alaykum! Men <strong>Romix Ombor AI</strong> yordamchisiman. Ombor va qoldiqlar haqida so\\'rang!';
                window.romixAiState.endpoint = '/api/hr-ai-chat';
                window.romixAiState.chatId = 'ombor_user';
            }
        }

        document.querySelectorAll('.nav-link-item').forEach(link => {
            link.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-tab');
                if (tab) updateAiForTab(tab);
            });
        });

        setTimeout(() => {
            if (u && u.role === 'buxgalter') {
                updateAiForTab('buhgalter');
            } else if (u && u.role === 'admin') {
                const activeTab = document.querySelector('.nav-link-item.active');
                if (activeTab) updateAiForTab(activeTab.getAttribute('data-tab'));
                else updateAiForTab('dashboard');
            } else {
                updateAiForTab('dashboard');
            }
        }, 500);

        window.toggleRomixAiDrawer = function() {
            const drawer = document.getElementById('aiChatDrawer');
            if (!drawer) return;
            drawer.style.right = (drawer.style.right === '0px') ? '-400px' : '0px';
        };

        window.submitAiMessage = async function() {
            const endpoint = window.romixAiState.endpoint;
            const chatId = window.romixAiState.chatId;
            const input = document.getElementById('aiInputText');
            const history = document.getElementById('aiChatHistory');
            if (!input || !history) return;

            const text = input.value.trim();
            if (!text) return;

            const userBubble = document.createElement('div');
            userBubble.style.cssText = 'background:rgba(0,210,255,0.18); border:1px solid rgba(0,210,255,0.3); border-radius:14px; padding:10px 14px; color:#fff; align-self:flex-end; max-width:85%; font-weight:600; line-height:1.4;';
            userBubble.textContent = text;
            history.appendChild(userBubble);
            input.value = '';

            const typingBubble = document.createElement('div');
            typingBubble.id = 'aiTypingBubble';
            typingBubble.style.cssText = 'background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:14px; padding:10px 14px; color:rgba(255,255,255,0.6); align-self:flex-start; font-size:0.8rem; font-style:italic;';
            typingBubble.textContent = "🤖 Romix AI o'ylamoqda...";
            history.appendChild(typingBubble);
            history.scrollTop = history.scrollHeight;

            let responseHtml = "⚠️ Xatolik yuz berdi.";
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'chat', text, chatId })
                });
                const data = await res.json();
                if (data.ok && data.text) {
                    let txt = data.text;
                    txt = txt.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
                    txt = txt.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
                    txt = txt.replace(/\\n/g, '<br>');
                    responseHtml = txt;
                } else if (data.error) {
                    responseHtml = "⚠️ Xato: " + data.error;
                }
            } catch (e) {
                responseHtml = "⚠️ Tarmoq xatosi yoki serverga ulanib bo'lmadi.";
            }

            const typing = document.getElementById('aiTypingBubble');
            if (typing) typing.remove();

            const aiBubble = document.createElement('div');
            aiBubble.style.cssText = 'background:rgba(0,210,255,0.08); border:1px solid rgba(0,210,255,0.25); border-radius:14px; padding:12px 14px; color:#fff; align-self:flex-start; max-width:88%; line-height:1.5; font-size:0.85rem;';
            aiBubble.innerHTML = responseHtml;
            history.appendChild(aiBubble);
            history.scrollTop = history.scrollHeight;
        };
    </script>
`;

// Remove the old Buxgalteriya block and any duplicate scripts at the end of the file
const regex = /<!-- ============ Buxgalteriya AI Assistant \(Faqat Buxgalter uchun\) ============ -->[\s\S]*?<\/script>\s*/;
content = content.replace(regex, "");

// Write it right before </body>
content = content.replace(/<\/body>/i, replacement + "\n</body>");

fs.writeFileSync(romixPath, content, 'utf8');
console.log('Successfully updated romix_dashboard.html with unified AI block!');
