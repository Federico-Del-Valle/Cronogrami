import { PANELS } from './constants.js';

import {
    setState
} from './state.js';

import {
    loadState
} from './persistence.js';

import {
    renderNav,
    switchPanel
} from './navigation.js';

import {
    renderDashboard
} from './dashboard.js';

import {
    renderCronograma
} from './cronograma.js';

import {
    exportCopy
} from './export.js';


function buildPanelShells() {

    const content =
        document.getElementById('content');

    content.innerHTML = '';

    PANELS.forEach(panel => {

        const div =
            document.createElement('div');

        div.className =
            'panel' +
            (
                panel.key === 'dashboard'
                    ? ' active'
                    : ''
            );

        div.id =
            'panel-' +
            panel.key;

        div.dataset.panel =
            panel.key;

        content.appendChild(div);
    });
}


function renderAll() {

    renderDashboard();

    renderCronograma();
}


function updateTopbarDate() {

    const d = new Date();

    let date =
        d.toLocaleDateString(
            'es-AR',
            {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }
        );

    date =
        date.charAt(0).toUpperCase() +
        date.slice(1);

    document.getElementById(
        'topbarDate'
    ).textContent = date;
}


function init() {

    // Cargar estado guardado
    const state =
        loadState();

    setState(state);

    // Crear navegación
    renderNav();

    // Crear paneles
    buildPanelShells();

    // Renderizar contenido
    renderAll();

    // Mostrar Dashboard inicialmente
    switchPanel('dashboard');

    // Fecha actual
    updateTopbarDate();

    // Botón de exportación
    document
        .getElementById('exportBtn')
        .addEventListener(
            'click',
            exportCopy
        );
}


document.addEventListener(
    'DOMContentLoaded',
    init
);