export function defaultState() {
    const cronograma = {};

    function setCell(day, hour, cat, text) {
        cronograma[day + '_' + hour] = {
            cat,
            text: text || ''
        };
    }

    // Cursadas - Facultad
    [19, 20, 21, 22].forEach(h =>
        setCell(
            'Lunes',
            h,
            'facultad',
            'Diseño de Software'
        )
    );

    [19, 20, 21, 22].forEach(h =>
        setCell(
            'Jueves',
            h,
            'facultad',
            'SISOP'
        )
    );

    [14, 15, 16, 17].forEach(h =>
        setCell(
            'Viernes',
            h,
            'facultad',
            'Autómatas y Gramática'
        )
    );

    // Gimnasio
    [17].forEach(h =>
        setCell(
            'Lunes',
            h,
            'gimnasio',
            ''
        )
    );

    [18].forEach(h =>
        setCell(
            'Martes',
            h,
            'gimnasio',
            ''
        )
    );

    [17].forEach(h =>
        setCell(
            'Jueves',
            h,
            'gimnasio',
            ''
        )
    );

    [18].forEach(h =>
        setCell(
            'Viernes',
            h,
            'gimnasio',
            ''
        )
    );

    return {
    deadlines: [
        { fecha: '2026-09-30', label: 'AWS AI Practitioner' },
        { fecha: '2026-10-01', label: 'Final pendiente (materia anterior) — antes de octubre' },
        { fecha: '2026-11-30', label: 'AWS Cloud Practitioner' },
    ],

    keyDates: [
            {
                fecha: '2026-09-08',
                materia: 'AWS AI Practitioner',
                evaluacion: 'Examen objetivo',
                tipo: 'objetivo'
            },
            {
                fecha: '2026-09-24',
                materia: 'SISOP',
                evaluacion: 'Parcial 1',
                tipo: 'parcial'
            },
            {
                fecha: '2026-09-25',
                materia: 'Autómatas',
                evaluacion: 'Parcial 1',
                tipo: 'parcial'
            },
            {
                fecha: '2026-09-29',
                materia: 'Probabilidad',
                evaluacion: 'Parcial 1',
                tipo: 'parcial'
            },
            {
                fecha: '2026-10-19',
                materia: 'Diseño',
                evaluacion: 'Parcial 1',
                tipo: 'parcial'
            },
            {
                fecha: '2026-10-29',
                materia: 'SISOP',
                evaluacion: 'Parcial 2',
                tipo: 'parcial'
            },
            {
                fecha: '2026-11-02',
                materia: 'Diseño',
                evaluacion: 'Parcial 2',
                tipo: 'parcial'
            },
            {
                fecha: '2026-11-10',
                materia: 'Probabilidad',
                evaluacion: 'Parcial 2',
                tipo: 'parcial'
            },
            {
                fecha: '2026-11-12',
                materia: 'SISOP',
                evaluacion: 'Recuperatorio',
                tipo: 'recuperatorio'
            },
            {
                fecha: '2026-11-13',
                materia: 'Autómatas',
                evaluacion: 'Parcial 2',
                tipo: 'parcial'
            },
            {
                fecha: '2026-11-16',
                materia: 'Diseño',
                evaluacion: 'Recuperatorio',
                tipo: 'recuperatorio'
            },
            {
                fecha: '2026-11-24',
                materia: 'Probabilidad',
                evaluacion: 'Recuperatorio',
                tipo: 'recuperatorio'
            },
            {
                fecha: '2026-11-27',
                materia: 'Autómatas',
                evaluacion: 'Recuperatorio',
                tipo: 'recuperatorio'
            }
        ],

        cronograma,
    };
}

// Estado actual de la aplicación
export let STATE = null;

// Estado temporal de la interfaz
export const openPickers = new Set();

// Permite actualizar el estado
export function setState(newState) {
    STATE = newState;
}