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
                admin: resolve(__dirname, 'admin_dashboard.html'),
                hr: resolve(__dirname, 'hr_dashboard.html'),
                sales: resolve(__dirname, 'sales_dashboard.html'),
                warehouse: resolve(__dirname, 'warehouse_dashboard.html'),
                production: resolve(__dirname, 'production_dashboard.html'),
                showroom: resolve(__dirname, 'showroom_dashboard.html'),
                scanner: resolve(__dirname, 'scanner.html'),
                akfa_hr_mini: resolve(__dirname, 'akfa_hr_mini.html'),
                stanok: resolve(__dirname, 'src/mini-app/stanok-app/index.html'),
                kraska: resolve(__dirname, 'src/mini-app/kraska-app/index.html'),
                qadoqlash: resolve(__dirname, 'src/mini-app/qadoqlash-app/index.html'),
            },
        },
    },
});
