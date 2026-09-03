import { STORAGE_KEY } from './constants.js';
import { STATE, defaultState } from './state.js';
import { debounce } from './utils.js';
import { getCurrentUser, loadCloudState, saveCloudState } from './supabase.js';

export function loadLocalState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            const state = Object.assign(defaultState(), saved);
            if (!saved.keyDates) {
                state.keyDates = defaultState().keyDates;
            }
            return state;
        }
    } catch (e) {
        console.warn('No se pudo leer el estado local:', e);
    }
    return defaultState();
}

export function loadState() {
    return loadLocalState();
}

export async function syncStateWithCloud() {
    const user = await getCurrentUser();
    if (!user) return null;

    try {
        const cloudData = await loadCloudState(user.id);
        if (cloudData) {
            const state = Object.assign(defaultState(), cloudData);
            if (!cloudData.keyDates) {
                state.keyDates = defaultState().keyDates;
            }
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (_) {}
            return state;
        } else {
            // Primera vez de este usuario: subimos el estado local a su nube
            const local = loadLocalState();
            await saveCloudState(user.id, local);
            return local;
        }
    } catch (e) {
        console.warn('Error en sincronización con la nube:', e);
        return null;
    }
}

function saveStatusEl() {
    return document.getElementById('saveStatus');
}

export const saveState = debounce(async () => {
    // 1. Respaldo local inmediato
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(STATE)
        );
    } catch (e) {
        console.warn('Error al guardar localmente:', e);
    }

    const timeStr = new Date().toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const s = saveStatusEl();

    // 2. Guardado en la nube si hay usuario activo
    const user = await getCurrentUser();

    if (user) {
        try {
            await saveCloudState(user.id, STATE);
            if (s) {
                s.textContent = `Nube ✓ ${timeStr}`;
                s.classList.add('saved');
            }
        } catch (e) {
            console.error('No se pudo guardar en Supabase:', e);
            if (s) {
                s.textContent = `Local ✓ (sin red)`;
                s.classList.add('saved');
            }
        }
    } else {
        if (s) {
            s.textContent = `Local ✓ ${timeStr}`;
            s.classList.add('saved');
        }
    }
}, 400);

export function markDirtySoon() {
    const s = saveStatusEl();

    if (s) {
        s.textContent = 'Guardando…';
        s.classList.remove('saved');
    }

    saveState();
}