const fs = require('fs');
let c = fs.readFileSync('src/projects/romix/romix_dashboard.html', 'utf8');
c = c.replace(/window\.romixAiState\.endpoint = '\/api\/hr-ai-chat';/g, (match, offset) => {
    // Only replace the fallback one which is near 'ombor'
    if (c.substring(offset - 200, offset).includes('ombor')) {
        return "window.romixAiState.endpoint = '/api/ombor-ai-chat';";
    }
    return match;
});
fs.writeFileSync('src/projects/romix/romix_dashboard.html', c);
console.log('Fixed ombor endpoint!');
