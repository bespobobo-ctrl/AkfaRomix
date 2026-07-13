-- 7 ta jadval PostgREST'ga "topilmadi (404)" deb ko'rinyapti, lekin Table Editor'da mavjud —
-- demak muammo RLS emas, balki anon/authenticated rollariga GRANT yetishmayapti yoki
-- PostgREST keshi eskirgan. Bu skript xavfsiz: jadval strukturasi yoki ma'lumotiga tegmaydi,
-- faqat ruxsat beradi va PostgREST'ni sxemani qayta o'qishga majbur qiladi.

GRANT ALL ON TABLE
    public.romix_accessories,
    public.romix_accessories_history,
    public.romix_qoldiq_profillar,
    public.romix_oynak,
    public.romix_payment_log,
    public.romix_utility_readings,
    public.profile_requests
TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
