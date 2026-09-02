import { DAYS, CATS } from './constants.js';
import { STATE, openPickers } from './state.js';
import { el, pad2 } from './utils.js';
import { markDirtySoon } from './persistence.js';

function cellKey(day, hour) {
    return day + '_' + hour;
}

function catInfo(key) {
    return CATS.find(c => c.key === key);
}

export function renderCronograma() {

    const c =
        document.getElementById(
            'panel-cronograma'
        );

    c.innerHTML = '';

    c.appendChild(
        el(
            'p',
            { class: 'lede' },
            'Cada casillero es una hora. Tocá "+" para elegir una categoría y escribir qué va ahí. Tocá la "×" para vaciarlo, o el nombre de la categoría para cambiarla.'
        )
    );

    const card =
        el('div', { class: 'card' });

    const scroller =
        el('div', {
            class: 'week-scroll'
        });

    const table =
        el('table', {
            class: 'weekgrid'
        });

    const colgroup =
        el('colgroup');

    colgroup.appendChild(
        el('col', {
            class: 'hourcol'
        })
    );

    DAYS.forEach(() => {
        colgroup.appendChild(
            el('col')
        );
    });

    table.appendChild(colgroup);

    const thead =
        el(
            'thead',
            null,
            el(
                'tr',
                null,
                [
                    el(
                        'th',
                        null,
                        'Hora'
                    ),

                    ...DAYS.map(day =>
                        el(
                            'th',
                            null,
                            day
                        )
                    )
                ]
            )
        );

    table.appendChild(thead);

    const tbody =
        el('tbody');

    for (let h = 0; h < 24; h++) {

        const tr =
            el('tr');

        tr.appendChild(
            el(
                'td',
                { class: 'hourcell' },
                pad2(h) +
                ':00–' +
                pad2(
                    h + 1 === 24
                        ? 0
                        : h + 1
                ) +
                ':00'
            )
        );

        DAYS.forEach(day => {
            tr.appendChild(
                renderCell(day, h)
            );
        });

        tbody.appendChild(tr);
    }

    table.appendChild(tbody);

    scroller.appendChild(table);

    card.appendChild(scroller);

    // Leyenda
    const legend =
        el('div', {
            class: 'legend'
        });

    CATS.forEach(cat => {

        legend.appendChild(
            el(
                'div',
                {
                    class: 'legend-item'
                },
                [
                    el('span', {
                        class:
                            'legend-dot cat-' +
                            cat.key
                    }),

                    cat.label
                ]
            )
        );
    });

    card.appendChild(legend);

    c.appendChild(card);
}

export function renderCell(day, hour) {

    const key =
        cellKey(day, hour);

    const data =
        STATE.cronograma[key];

    const td =
        el(
            'td',
            {
                class:
                    'hcell' +
                    (data
                        ? ' cat-' + data.cat
                        : '')
            }
        );

    if (!data) {

        if (openPickers.has(key)) {

            const picker =
                el('div', {
                    class: 'cell-picker'
                });

            CATS.forEach(cat => {

                picker.appendChild(
                    el(
                        'button',
                        {
                            class:
                                'picker-cat-btn',

                            onclick: () => {

                                STATE.cronograma[key] = {
                                    cat: cat.key,
                                    text: ''
                                };

                                openPickers.delete(key);

                                markDirtySoon();

                                renderCronograma();

                                focusCellText(key);
                            }
                        },
                        [
                            el('span', {
                                class:
                                    'sw cat-' +
                                    cat.key
                            }),

                            cat.label
                        ]
                    )
                );
            });

            picker.appendChild(
                el(
                    'button',
                    {
                        class:
                            'picker-cancel',

                        onclick: () => {

                            openPickers.delete(key);

                            renderCronograma();
                        }
                    },
                    'cancelar'
                )
            );

            td.appendChild(picker);

        } else {

            const wrap =
                el('div', {
                    class: 'cell-empty'
                });

            wrap.appendChild(
                el(
                    'button',
                    {
                        class: 'plus-btn',
                        title: 'Agregar',

                        onclick: () => {

                            openPickers.add(key);

                            renderCronograma();
                        }
                    },
                    '+'
                )
            );

            td.appendChild(wrap);
        }

    } else {

        const info =
            catInfo(data.cat);

        const filled =
            el('div', {
                class: 'cell-filled'
            });

        // Eliminar
        filled.appendChild(
            el(
                'button',
                {
                    class: 'rm-btn',
                    title: 'Vaciar',

                    onclick: () => {

                        delete STATE.cronograma[key];

                        markDirtySoon();

                        renderCronograma();
                    }
                },
                '✕'
            )
        );

        // Cambiar categoría
        filled.appendChild(
            el(
                'div',
                {
                    class: 'cat-tag',
                    title: 'Cambiar categoría',

                    onclick: () => {

                        delete STATE.cronograma[key];

                        openPickers.add(key);

                        markDirtySoon();

                        renderCronograma();
                    }
                },
                info
                    ? info.label
                    : data.cat
            )
        );

        // Texto editable
        // Texto editable solamente para categorías
// que permiten agregar un detalle.
if (data.cat !== 'trabajo') {

    const textDiv =
        el(
            'div',
            {
                class: 'cell-text',
                contenteditable: 'true',

                'data-placeholder':
                    info
                        ? info.placeholder
                        : '',

                oninput: e => {

                    data.text =
                        e.target.textContent;

                    markDirtySoon();
                }
            },
            data.text
        );

    textDiv.dataset.cellkey = key;

    filled.appendChild(textDiv);
    }

        td.appendChild(filled);
    }

    return td;
}

export function focusCellText(key) {

    setTimeout(() => {

        const element =
            document.querySelector(
                '.cell-text[data-cellkey="' +
                key +
                '"]'
            );

        if (element) {
            element.focus();
        }

    }, 0);
}