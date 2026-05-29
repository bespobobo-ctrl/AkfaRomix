const fs = require('fs');
let content = fs.readFileSync('src/projects/romix/pages/romix_dashboard.html', 'utf8');
const start = content.indexOf('<section id="section-autoclapak"');
if (start !== -1) {
    let end = content.indexOf('</section>', start + 1000);
    // Auto Clapak is huge, let's just find the last </section> before the scripts
    const endAc = content.indexOf('<!-- END AUTO CLAPAK -->');
    if (endAc !== -1) {
        end = endAc + '<!-- END AUTO CLAPAK -->'.length;
    } else {
        // Let's find where the scripts start and just cut everything before it
        end = content.indexOf('<script', start);
    }
    content = content.substring(0, start) + '\n\n' + content.substring(end);
    fs.writeFileSync('src/projects/romix/pages/romix_dashboard.html', content, 'utf8');
    console.log('Removed section-autoclapak, saved as utf8.');
} else {
    // maybe it is utf16?
    let content16 = fs.readFileSync('src/projects/romix/pages/romix_dashboard.html', 'utf16le');
    const start16 = content16.indexOf('<section id="section-autoclapak"');
    if (start16 !== -1) {
        let end16 = content16.indexOf('<script', start16);
        content16 = content16.substring(0, start16) + '\n\n' + content16.substring(end16);
        fs.writeFileSync('src/projects/romix/pages/romix_dashboard.html', content16, 'utf16le');
        console.log('Removed section-autoclapak, saved as utf16le.');
    } else {
        console.log('Not found in either encoding.');
    }
}
