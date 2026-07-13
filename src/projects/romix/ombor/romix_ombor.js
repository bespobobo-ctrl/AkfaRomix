        // Set User profile
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (user) {
            const name = user.full_name || user.username || 'RAHBAR';
            document.getElementById('userName').textContent = name.toUpperCase();
        }
        
        // Theme toggle memory
        if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
