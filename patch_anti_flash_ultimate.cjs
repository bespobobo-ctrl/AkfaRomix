const fs = require('fs');
const path = require('path');

const targets = [
    'C:/Users/PRESTIGE/.gemini/antigravity-ide/scratch/AKFA/src/projects/autoclapak/pages',
    'C:/Users/PRESTIGE/.gemini/antigravity/scratch/AKFA/src/projects/autoclapak/pages'
];

const newBlock = `<script>
        // Anti-Flash & RBAC Role Protection (Ultimate Sync Edition)
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
                        #section-dashboard { display: none !important; }
                        #section-autoclapak { display: block !important; opacity: 1 !important; transform: scale(1) !important; animation: none !important; }
                        .nav-link-item[data-auto-tab="auto-buhgalteriya"],
                        .nav-link-item[data-auto-tab="auto-sozlamalar"] {
                            display: none !important;
                        }
                        .btn-icon-elite.delete, .btn-icon-elite.edit, 
                        button[onclick*="deleteProduct"], button[onclick*="confirmProductPrice"],
                        button[onclick*="editProductSelector"], button[onclick*="addBuhEmployee"],
                        button[onclick*="addBuhRecipeItem"], button[onclick*="addBuhSale"],
                        button[onclick*="addBuhTransaction"], button[onclick*="addBuhUtility"] {
                            display: none !important;
                        }
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
        if (file.endsWith('.html') && file !== 'dashbor.html') {
            const filePath = path.join(dir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            if (regex.test(content)) {
                content = content.replace(regex, newBlock);
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Patched ultimate anti-flash in: \${filePath}`);
            } else {
                // If it doesn't have the script block, let's insert it right before </head>
                if (content.includes('</head>')) {
                    content = content.replace('</head>', `\${newBlock}\n</head>`);
                    fs.writeFileSync(filePath, content, 'utf8');
                    console.log(`Inserted ultimate anti-flash in: \${filePath}`);
                } else {
                    console.log(`Skipped (no head tag): \${filePath}`);
                }
            }
        }
    });
});

console.log('Ultimate Anti-flash patching completed successfully.');
