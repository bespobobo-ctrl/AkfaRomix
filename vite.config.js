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
            '@projects': resolve(__dirname, 'src/projects'),
        },
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                admin: resolve(__dirname, 'src/projects/autoclapak/pages/admin_dashboard.html'),
                admin_ombor: resolve(__dirname, 'src/projects/autoclapak/pages/admin_ombor.html'),
                admin_tayyor: resolve(__dirname, 'src/projects/autoclapak/pages/admin_tayyor.html'),
                admin_sotuv: resolve(__dirname, 'src/projects/autoclapak/pages/admin_sotuv.html'),
                admin_buhgalteriya: resolve(__dirname, 'src/projects/autoclapak/pages/admin_buhgalteriya.html'),
                admin_ishlab_chiqarish: resolve(__dirname, 'src/projects/autoclapak/pages/admin_ishlab_chiqarish.html'),
                admin_xodimlar: resolve(__dirname, 'src/projects/autoclapak/pages/admin_avtoclpak_xodimlar.html'),
                admin_sozlamalar: resolve(__dirname, 'src/projects/autoclapak/pages/admin_sozlamalar.html'),
                romix_dashboard: resolve(__dirname, 'src/projects/romix/pages/romix_dashboard.html'),
                hr: resolve(__dirname, 'src/projects/romix/pages/hr_dashboard.html'),
                sales: resolve(__dirname, 'src/projects/romix/pages/sales_dashboard.html'),
                warehouse: resolve(__dirname, 'src/projects/romix/pages/warehouse_dashboard.html'),
                production: resolve(__dirname, 'src/projects/romix/pages/production_dashboard.html'),
                showroom: resolve(__dirname, 'src/projects/romix/pages/showroom_dashboard.html'),
                scanner: resolve(__dirname, 'src/projects/romix/pages/scanner.html'),
                akfa_hr_mini: resolve(__dirname, 'src/projects/romix/pages/akfa_hr_mini.html'),
                stanok: resolve(__dirname, 'src/projects/autoclapak/mini-app/stanok-app/index.html'),
                kraska: resolve(__dirname, 'src/projects/autoclapak/mini-app/kraska-app/index.html'),
                qadoqlash: resolve(__dirname, 'src/projects/autoclapak/mini-app/qadoqlash-app/index.html'),
                dashbor: resolve(__dirname, 'src/projects/autoclapak/pages/dashbor.html'),
            },
        },
    },
});
