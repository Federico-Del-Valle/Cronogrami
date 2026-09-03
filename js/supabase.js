import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants.js';

let supabaseClient = null;

export function getSupabase() {
    if (supabaseClient) {
        return supabaseClient;
    }

    if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return supabaseClient;
    }

    console.warn('Supabase SDK aún no está cargado globalmente.');
    return null;
}

export async function initSupabase() {
    if (supabaseClient) return supabaseClient;

    if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return supabaseClient;
    }

    // Fallback con import dinámico si el script CDN falló
    try {
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return supabaseClient;
    } catch (e) {
        console.error('No se pudo inicializar Supabase:', e);
        return null;
    }
}

export async function getCurrentUser() {
    const sb = await initSupabase();
    if (!sb) return null;

    try {
        const { data: { session } } = await sb.auth.getSession();
        return session ? session.user : null;
    } catch (e) {
        console.warn('Error al obtener sesión de Supabase:', e);
        return null;
    }
}

export async function signUp(email, password) {
    const sb = await initSupabase();
    if (!sb) throw new Error('Supabase no disponible');

    return await sb.auth.signUp({
        email,
        password
    });
}

export async function signIn(email, password) {
    const sb = await initSupabase();
    if (!sb) throw new Error('Supabase no disponible');

    return await sb.auth.signInWithPassword({
        email,
        password
    });
}

export async function signOut() {
    const sb = await initSupabase();
    if (!sb) return;

    return await sb.auth.signOut();
}

export async function loadCloudState(userId) {
    const sb = await initSupabase();
    if (!sb || !userId) return null;

    try {
        const { data, error } = await sb
            .from('user_cronograma')
            .select('data')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error al leer de Supabase:', error);
            return null;
        }

        if (data && data.data && Object.keys(data.data).length > 0) {
            return data.data;
        }

        return null;
    } catch (e) {
        console.error('Fallo al conectar con Supabase:', e);
        return null;
    }
}

export async function saveCloudState(userId, stateData) {
    const sb = await initSupabase();
    if (!sb || !userId) return false;

    try {
        const { error } = await sb
            .from('user_cronograma')
            .upsert({
                user_id: userId,
                data: stateData,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('Error al guardar en Supabase:', error);
            throw error;
        }

        return true;
    } catch (e) {
        console.error('Fallo al enviar a Supabase:', e);
        throw e;
    }
}
