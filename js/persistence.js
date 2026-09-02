import { STORAGE_KEY } from './constants.js';
import { STATE, defaultState } from './state.js';
import { debounce } from './utils.js';

export function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (raw) {

            const saved =
                JSON.parse(raw);

            const state =
                Object.assign(
                    defaultState(),
                    saved
                );

            // Si el usuario ya tenía datos guardados
            // antes de existir keyDates, agregamos
            // las fechas iniciales sin tocar lo demás.
            if (!saved.keyDates) {
                state.keyDates =
                    defaultState().keyDates;
            }

            return state;
        }
    } catch (e) {
        console.warn(
            'No se pudo leer el estado guardado',
            e
        );
    }

    return defaultState();
}

function saveStatusEl() {
    return document.getElementById('saveStatus');
}

export const saveState = debounce(() => {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(STATE)
        );

        const s = saveStatusEl();

        if (s) {
            s.textContent =
                'Guardado ✓ ' +
                new Date().toLocaleTimeString(
                    'es-AR',
                    {
                        hour: '2-digit',
                        minute: '2-digit'
                    }
                );

            s.classList.add('saved');
        }

    } catch (e) {
        const s = saveStatusEl();

        if (s) {
            s.textContent =
                'No se pudo autoguardar';

            s.classList.remove('saved');
        }
    }
}, 350);

export function markDirtySoon() {
    const s = saveStatusEl();

    if (s) {
        s.textContent = 'Guardando…';
        s.classList.remove('saved');
    }

    saveState();
}