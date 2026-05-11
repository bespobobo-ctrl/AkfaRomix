import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src/js'),
            '@css': resolve(__dirname, 'src/css'),
            '@components': resolve(__dirname, 'src/js/components'),
            '@services': resolve(__dirname, 'src/js/services'),
            '@constants': resolve(__dirname, 'src/js/constants'),
        },
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                admin: resolve(__dirname, 'src/pages/admin_dashboard.html'),
                hr: resolve(__dirname, 'src/pages/hr_dashboard.html'),
                sales: resolve(__dirname, 'src/pages/sales_dashboard.html'),
                warehouse: resolve(__dirname, 'src/pages/warehouse_dashboard.html'),
                production: resolve(__dirname, 'src/pages/production_dashboard.html'),
                showroom: resolve(__dirname, 'src/pages/showroom_dashboard.html'),
                scanner: resolve(__dirname, 'src/pages/scanner.html'),
                akfa_hr_mini: resolve(__dirname, 'src/pages/akfa_hr_mini.html'),
            },
        },
    },
});
