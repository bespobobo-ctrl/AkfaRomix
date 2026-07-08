-- Xodimga joriy oy uchun berilgan avans (HR > Yangi Xodim / Xodimlar ro'yxati)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS advance_paid NUMERIC DEFAULT 0;
