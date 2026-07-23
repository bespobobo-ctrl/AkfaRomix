-- "Xavfli Zona: Tozalash" tugmasi ba'zi jadvallarda DELETE'ni bajara olmayapti,
-- chunki o'sha jadvallarda RLS yoqilgan-u, lekin DELETE uchun policy yo'q edi
-- (SELECT/INSERT/UPDATE ishlagani uchun bu sezilmagan). Bu skript loyihaning
-- boshqa joylarida (romix_finance.sql, romix_ombor_categories.sql va h.k.)
-- ishlatilgan "anon_all_*" naqshini TOZALASH tugmasidagi barcha 25 jadvalga
-- qo'llaydi. Xavfsiz: idempotent (qayta ishga tushirsa ham xato bermaydi),
-- ma'lumotlarni o'chirmaydi — faqat ruxsat siyosatini to'g'irlaydi.

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'attendance', 'employees', 'material_requests', 'production_recipes', 'profile_requests',
        'romix_accessories', 'romix_accessories_history', 'romix_bot_state', 'romix_brigade_members',
        'romix_brigade_ratings', 'romix_brigades', 'romix_debts', 'romix_expenses',
        'romix_installation_materials', 'romix_inventory', 'romix_oynak', 'romix_payment_log',
        'romix_production_batches', 'romix_production_log', 'romix_qoldiq_profillar', 'romix_staff',
        'romix_transactions', 'romix_utility_readings', 'sales_orders', 'showroom_products', 'system_users'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS anon_all_%s ON public.%I', t, t);
            EXECUTE format('CREATE POLICY anon_all_%s ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
        ELSE
            RAISE NOTICE 'Jadval topilmadi, o''tkazib yuborildi: %', t;
        END IF;
    END LOOP;
END $$;
