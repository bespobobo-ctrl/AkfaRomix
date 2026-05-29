const fs = require('fs');
const path = require('path');

const targets = [
    'C:/Users/PRESTIGE/.gemini/antigravity-ide/scratch/AKFA/src/projects/autoclapak/pages',
    'C:/Users/PRESTIGE/.gemini/antigravity/scratch/AKFA/src/projects/autoclapak/pages'
];

const newBlock = `<script>
        // Anti-Flash & RBAC Role Protection
        try {
            var savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                var u = JSON.parse(savedUser);
                if (u.role === 'ac_manager') {
                    var style = document.createElement('style');
                    style.innerHTML = \`
                        .sidebar-slim { display: none !important; }
                        .executive-tabs { display: none !important; }
                        .admin-main { margin-left: 0 !important; }
                        .mobile-bottom-nav { display: none !important; }
                    \`;
                    document.head.appendChild(style);
                }
            } else {
                window.location.href = '/index.html';
            }
        } catch(e) {}
    </script>`;

// Match any <script> block that tries to get currentUser and does try/catch
const regex = /<script>[\s\S]*?try\s*\{\s*var\s*savedUser[\s\S]*?\} catch\s*\(e\)\s*\{\}\s*<\/script>/g;

targets.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        if (file.endsWith('.html') && file !== 'admin_dashboard.html') {
            const filePath = path.join(dir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            if (regex.test(content)) {
                content = content.replace(regex, newBlock);
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Patched anti-flash in: ${filePath}`);
            } else {
                console.log(`Skipped (no match): ${filePath}`);
            }
        }
    });
});

console.log('Anti-flash patching completed successfully.');
