import { PANELS } from './constants.js';
import { el } from './utils.js';

export let currentPanel = 'dashboard';

export function renderNav() {
    const nav = document.getElementById('nav');

    nav.innerHTML = '';

    PANELS.forEach(p => {

        const btn = el(
            'button',
            {
                class:
                    'nav-item' +
                    (p.key === currentPanel
                        ? ' active'
                        : ''),

                onclick: () =>
                    switchPanel(p.key)
            },
            [
                el(
                    'span',
                    { class: 'tag' },
                    p.tag
                ),

                el(
                    'span',
                    null,
                    p.label
                )
            ]
        );

        btn.dataset.key = p.key;

        nav.appendChild(btn);
    });
}

export function switchPanel(key) {

    currentPanel = key;

    document
        .querySelectorAll('.panel')
        .forEach(p => {

            p.classList.toggle(
                'active',
                p.dataset.panel === key
            );
        });

    document
        .querySelectorAll('.nav-item')
        .forEach(btn => {

            btn.classList.toggle(
                'active',
                btn.dataset.key === key
            );
        });

    const panel = PANELS.find(
        p => p.key === key
    );

    document.getElementById(
        'panelTitle'
    ).textContent =
        panel
            ? panel.label
            : '';

    window.scrollTo(0, 0);
}