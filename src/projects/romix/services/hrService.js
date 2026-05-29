import { supabase } from '@/core/supabase.js';

export const hrService = {
    async getAllEmployees() {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('full_name', { ascending: true });
        if (error) throw error;
        return data;
    },

    async getTodayAttendance() {
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('date', todayStr);
        if (error) throw error;
        return data;
    },

    async saveEmployee(payload, id = null) {
        if (id) {
            return await supabase.from('employees').update(payload).eq('id', id).select();
        } else {
            return await supabase.from('employees').insert([payload]).select();
        }
    },

    async deleteEmployee(id) {
        return await supabase.from('employees').delete().eq('id', id);
    },

    async logActivity(role, action, details) {
        // Implementation for activity logging if table exists
        console.log(`Activity Log: [${role}] ${action} - ${details}`);
    }
};
