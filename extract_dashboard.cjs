const fs = require('fs');
const content = fs.readFileSync('archive/admin_dashboard_original.html', 'utf16le');
const start = content.indexOf('<section id="section-dashboard"');
const end = content.indexOf('</section>', start) + 10;
fs.writeFileSync('archive/extracted_dashboard.html', content.substring(start, end), 'utf8');
