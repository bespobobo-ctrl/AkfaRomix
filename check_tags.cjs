const fs = require('fs');
let content = fs.readFileSync('archive/admin_dashboard_original.html', 'utf16le');
const start = content.indexOf('<section id="section-autoclapak"');
let endAc = content.indexOf('<!-- END AUTO CLAPAK -->');
if (endAc !== -1) {
    endAc += '<!-- END AUTO CLAPAK -->'.length;
} else {
    endAc = content.indexOf('</section>', start) + 10;
}
const endScript = content.indexOf('<script', endAc);
console.log('CONTENT BETWEEN END OF AUTOCLAPAK AND FIRST SCRIPT:');
console.log(content.substring(endAc, endScript));
