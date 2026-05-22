import { supabase } from '../core/supabase.js';

export const ClapakService = {
    async loadProduction() {
        const { data, error } = await supabase
            .from('clapak_production')
            .select('*')
            .order('start_time', { ascending: false });
        if (error) {
            console.error('Error loading production:', error);
            return [];
        }
        return data;
    },

    async updateStage(id, newStage) {
        const { data, error } = await supabase
            .from('clapak_production')
            .update({ stage: newStage, last_update: new Date().toISOString() })
            .eq('id', id);
        if (error) console.error('Error updating stage:', error);
        return !error;
    },

    async startProduction(model, quantity) {
        // 1. Create production entry
        const { data, error } = await supabase
            .from('clapak_production')
            .insert([{
                model: model,
                quantity: quantity,
                stage: 'STANOK',
                status: 'ACTIVE',
                start_time: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error('Error starting production:', error);
            return null;
        }

        // 2. Deduct materials (simplified logic)
        // In a real system, you'd lookup a recipe. 
        // For now, we'll log it in transactions.
        await supabase.from('warehouse_transactions').insert([{
            type: 'OUT',
            quantity: quantity,
            note: `Auto Clapak Production Started: ${model} (${quantity} units)`
        }]);

        return data;
    }
};
