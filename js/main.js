import { PANELS } from './constants.js';

import {
    setState,
    defaultState
} from './state.js';

import {
    loadState,
    syncStateWithCloud
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

import {
    renderAuthSection,
    openAuthModal,
    setOnAuthChanged
} from './authModal.js';

import {
    getCurrentUser
} from './supabase.js';


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


async function init() {

    // Cargar estado inicial (local rápido)
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

    // Renderizar sección de usuario en el sidebar
    await renderAuthSection();

    // Configurar listener para login / logout
    setOnAuthChanged(async (user) => {
        if (user) {
            const cloud = await syncStateWithCloud();
            if (cloud) {
                setState(cloud);
                renderAll();
            }
        } else {
            setState(defaultState());
            renderAll();
            openAuthModal();
        }
    });

    // Verificar si ya hay usuario logueado en la nube
    const user = await getCurrentUser();
    if (user) {
        const cloud = await syncStateWithCloud();
        if (cloud) {
            setState(cloud);
            renderAll();
        }
    } else {
        // Si no está logueado, abrimos el modal para que pueda identificarse
        openAuthModal();
    }
}


document.addEventListener(
    'DOMContentLoaded',
    init
);