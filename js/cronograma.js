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

        // Texto editable solamente para categorías
        // que permiten agregar un detalle.
        if (data.cat !== 'trabajo' && data.cat !== 'gimnasio') {

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

        // Rutina para gimnasio
        if (data.cat === 'gimnasio') {

            const gymWrap =
                el('div', {
                    class: 'gym-cell-content'
                });

            if (!data.rutina) {

                gymWrap.appendChild(
                    el(
                        'button',
                        {
                            class: 'gym-add-btn',
                            title: 'Crear rutina',

                            onclick: e => {
                                e.stopPropagation();
                                openRoutineModal(key, day, hour);
                            }
                        },
                        '+'
                    )
                );

            } else {

                gymWrap.appendChild(
                    el(
                        'div',
                        {
                            class: 'gym-routine-tag',
                            title: 'Ver rutina detallada',

                            onclick: e => {
                                e.stopPropagation();
                                openRoutineModal(key, day, hour);
                            }
                        },
                        data.rutina.nombre || 'Rutina'
                    )
                );

                gymWrap.appendChild(
                    el(
                        'button',
                        {
                            class: 'gym-routine-del-btn',
                            title: 'Eliminar rutina',

                            onclick: e => {
                                e.stopPropagation();

                                showConfirmDeleteModal({
                                    title: '¿Eliminar rutina?',
                                    subtitle: `¿Estás seguro de que querés eliminar la rutina de ${day} a las ${pad2(hour)}:00?`,
                                    onConfirm: () => {
                                        delete data.rutina;
                                        markDirtySoon();
                                        renderCronograma();
                                    }
                                });
                            }
                        },
                        '×'
                    )
                );
            }

            filled.appendChild(gymWrap);
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

export function openRoutineModal(key, day, hour) {

    const existing = document.getElementById('routine-modal-overlay');
    if (existing) {
        existing.remove();
    }

    const data = STATE.cronograma[key];
    if (!data) return;

    const isEditing = Boolean(data.rutina);
    const initialName = (data.rutina && data.rutina.nombre) || '';
    const initialDetail = (data.rutina && data.rutina.detalle) || '';

    const overlay = el('div', {
        id: 'routine-modal-overlay',
        class: 'modal-overlay'
    });

    const card = el('div', {
        class: 'modal-card'
    });

    // Encabezado
    const header = el('div', { class: 'modal-header' });

    const headerTitle = el('div', { class: 'modal-header-title' }, [
        el('span', null, isEditing ? 'Rutina de Gimnasio' : 'Crear Rutina'),
        el(
            'span',
            { class: 'modal-header-badge' },
            day + ' ' + pad2(hour) + ':00'
        )
    ]);

    const closeBtn = el(
        'button',
        {
            class: 'modal-close-btn',
            title: 'Cerrar',
            onclick: closeModal
        },
        '✕'
    );

    header.appendChild(headerTitle);
    header.appendChild(closeBtn);
    card.appendChild(header);

    // Cuerpo
    const body = el('div', { class: 'modal-body' });

    const nameField = el('div', { class: 'modal-field' });
    nameField.appendChild(el('label', { class: 'modal-label' }, 'Nombre de la rutina'));
    const nameInput = el('input', {
        type: 'text',
        class: 'modal-input',
        placeholder: 'ej. Pecho y Bíceps, Piernas, Espalda...',
        value: initialName
    });
    nameField.appendChild(nameInput);
    body.appendChild(nameField);

    const detailField = el('div', { class: 'modal-field' });
    detailField.appendChild(el('label', { class: 'modal-label' }, 'Ejercicios / Detalle'));
    const detailTextarea = el('textarea', {
        class: 'modal-textarea',
        placeholder: 'ej.\n- Press plano 4x10\n- Press inclinado 3x12\n- Aperturas en polea 3x15\n- Curl con barra 4x10'
    });
    detailTextarea.value = initialDetail;
    detailField.appendChild(detailTextarea);
    body.appendChild(detailField);

    card.appendChild(body);

    // Pie
    const footer = el('div', { class: 'modal-footer' });

    if (isEditing) {
        const deleteBtn = el(
            'button',
            {
                class: 'modal-btn modal-btn-danger',
                onclick: () => {
                    showConfirmDeleteModal({
                        title: '¿Eliminar rutina?',
                        subtitle: `¿Estás seguro de que querés eliminar la rutina "${data.rutina.nombre || 'Rutina'}"?`,
                        onConfirm: () => {
                            delete data.rutina;
                            markDirtySoon();
                            renderCronograma();
                            closeModal();
                        }
                    });
                }
            },
            '🗑️ Eliminar rutina'
        );
        footer.appendChild(deleteBtn);
    } else {
        footer.appendChild(el('div'));
    }

    const actions = el('div', { class: 'modal-footer-actions' });

    const cancelBtn = el(
        'button',
        {
            class: 'modal-btn',
            onclick: closeModal
        },
        'Cancelar'
    );

    const saveBtn = el(
        'button',
        {
            class: 'modal-btn modal-btn-primary',
            onclick: () => {
                const nombre = nameInput.value.trim();
                const detalle = detailTextarea.value.trim();

                if (!nombre && !detalle) {
                    nameInput.focus();
                    return;
                }

                data.rutina = {
                    nombre: nombre || 'Rutina',
                    detalle: detalle
                };

                markDirtySoon();
                renderCronograma();
                closeModal();
            }
        },
        isEditing ? 'Guardar cambios' : 'Guardar rutina'
    );

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    footer.appendChild(actions);

    card.appendChild(footer);
    overlay.appendChild(card);

    function closeModal() {
        document.removeEventListener('keydown', handleKeyDown);
        overlay.remove();
    }

    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    }

    overlay.addEventListener('click', e => {
        if (e.target === overlay) {
            closeModal();
        }
    });

    document.addEventListener('keydown', handleKeyDown);

    document.body.appendChild(overlay);

    setTimeout(() => {
        nameInput.focus();
    }, 50);
}

export function showConfirmDeleteModal({ title, subtitle, onConfirm }) {

    const existing = document.getElementById('confirm-delete-overlay');
    if (existing) {
        existing.remove();
    }

    const overlay = el('div', {
        id: 'confirm-delete-overlay',
        class: 'confirm-overlay'
    });

    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(14, 20, 27, 0.65)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '10000';
    overlay.style.padding = '16px';
    overlay.style.boxSizing = 'border-box';

    const card = el('div', {
        class: 'confirm-card'
    });

    card.style.background = '#ffffff';
    card.style.borderRadius = '14px';
    card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.22)';
    card.style.width = '100%';
    card.style.maxWidth = '380px';
    card.style.padding = '24px 22px 20px';
    card.style.textAlign = 'center';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'center';

    const icon = el('div', { class: 'confirm-icon' }, '🗑️');

    const heading = el('div', { class: 'confirm-title' }, title || '¿Eliminar rutina?');
    const text = el('div', { class: 'confirm-subtitle' }, subtitle || 'Esta acción no se puede deshacer.');

    const actions = el('div', { class: 'confirm-actions' });

    const cancelBtn = el(
        'button',
        {
            class: 'confirm-btn-cancel',
            onclick: closeConfirm
        },
        'Cancelar'
    );

    const deleteBtn = el(
        'button',
        {
            class: 'confirm-btn-danger',
            onclick: () => {
                closeConfirm();
                if (onConfirm) onConfirm();
            }
        },
        [
            el('span', { class: 'confirm-btn-icon' }, '✕'),
            'Sí, eliminar'
        ]
    );

    deleteBtn.style.background = 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';
    deleteBtn.style.color = '#ffffff';
    deleteBtn.style.border = '1px solid #EF4444';
    deleteBtn.style.borderRadius = '8px';
    deleteBtn.style.padding = '9px 16px';
    deleteBtn.style.fontWeight = '600';
    deleteBtn.style.cursor = 'pointer';

    actions.appendChild(cancelBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(icon);
    card.appendChild(heading);
    card.appendChild(text);
    card.appendChild(actions);
    overlay.appendChild(card);

    function closeConfirm() {
        document.removeEventListener('keydown', handleKey);
        overlay.remove();
    }

    function handleKey(e) {
        if (e.key === 'Escape') {
            closeConfirm();
        }
    }

    overlay.addEventListener('click', e => {
        if (e.target === overlay) {
            closeConfirm();
        }
    });

    document.addEventListener('keydown', handleKey);
    document.body.appendChild(overlay);

    setTimeout(() => {
        deleteBtn.focus();
    }, 50);
}