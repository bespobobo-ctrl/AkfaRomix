import { supabase } from '@/core/supabase.js';

export const inventoryService = {
    async getProducts() {
        const { data, error } = await supabase
            .from('warehouse_products')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getHistory() {
        const { data, error } = await supabase
            .from('warehouse_transactions')
            .select(`*, warehouse_products(name, unit)`)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async updateProduct(id, payload) {
        return await supabase.from('warehouse_products').update(payload).eq('id', id);
    },

    async addTransaction(payload) {
        return await supabase.from('warehouse_transactions').insert([payload]).select().single();
    }
};
