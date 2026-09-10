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

let cronogramaViewMode = 'auto'; // 'auto' | 'vertical' | 'table'
const expandedDays = new Set();

export function setCronogramaViewMode(mode) {
    cronogramaViewMode = mode;
    renderCronograma();
}

export function getBlocksForDay(day) {
    const blocks = [];
    let currentBlock = null;

    for (let h = 0; h < 24; h++) {
        const key = cellKey(day, h);
        const data = STATE.cronograma[key];

        if (!data) {
            if (currentBlock) {
                blocks.push(currentBlock);
                currentBlock = null;
            }
            continue;
        }

        const sameCat = currentBlock && currentBlock.cat === data.cat;
        const sameText = currentBlock && (currentBlock.text || '') === (data.text || '');
        const currentRutinaName = currentBlock && currentBlock.rutina ? currentBlock.rutina.nombre : '';
        const dataRutinaName = data.rutina ? data.rutina.nombre : '';
        const sameRutina = currentBlock && currentRutinaName === dataRutinaName;

        if (currentBlock && sameCat && sameText && sameRutina) {
            currentBlock.endHour = h + 1;
            currentBlock.hours.push(h);
        } else {
            if (currentBlock) {
                blocks.push(currentBlock);
            }
            currentBlock = {
                day,
                startHour: h,
                endHour: h + 1,
                hours: [h],
                cat: data.cat,
                text: data.text || '',
                rutina: data.rutina ? { ...data.rutina } : null
            };
        }
    }

    if (currentBlock) {
        blocks.push(currentBlock);
    }

    return blocks;
}

export function renderCronograma() {
    const c = document.getElementById('panel-cronograma');
    if (!c) return;

    c.innerHTML = '';
    c.classList.remove('force-vertical-view', 'force-table-view');
    if (cronogramaViewMode === 'vertical') {
        c.classList.add('force-vertical-view');
    } else if (cronogramaViewMode === 'table') {
        c.classList.add('force-table-view');
    }

    // Encabezado superior con modo de visualización y lede
    const topBar = el('div', { class: 'cronograma-header-bar' });

    const lede = el(
        'p',
        { class: 'lede cron-lede' },
        'Organizá tus horarios de la semana. En vista vertical podés ver cada día ordenado hacia abajo, o cambiar a la grilla horaria tradicional.'
    );

    const viewSwitcher = el('div', { class: 'cron-view-switcher' }, [
        el(
            'button',
            {
                class: 'cron-switch-btn' + (cronogramaViewMode === 'vertical' ? ' active' : ''),
                title: 'Ver días en columna vertical (ideal celulares)',
                onclick: () => setCronogramaViewMode('vertical')
            },
            '📱 Vista vertical'
        ),
        el(
            'button',
            {
                class: 'cron-switch-btn' + (cronogramaViewMode === 'table' ? ' active' : ''),
                title: 'Ver tabla semanal completa (24hs)',
                onclick: () => setCronogramaViewMode('table')
            },
            '▦ Vista tabla'
        )
    ]);

    topBar.appendChild(lede);
    topBar.appendChild(viewSwitcher);
    c.appendChild(topBar);

    // 1. Vista de Tabla Tradicional (para Desktop / cuando se fuerza)
    const desktopView = buildDesktopView();
    c.appendChild(desktopView);

    // 2. Vista Vertical por Días (para Móvil como Samsung S24 / cuando se fuerza)
    const verticalView = buildVerticalView();
    c.appendChild(verticalView);
}

function buildDesktopView() {
    const card = el('div', { class: 'cronograma-desktop-view card' });

    const scroller = el('div', { class: 'week-scroll' });
    const table = el('table', { class: 'weekgrid' });

    const colgroup = el('colgroup');
    colgroup.appendChild(el('col', { class: 'hourcol' }));
    DAYS.forEach(() => colgroup.appendChild(el('col')));
    table.appendChild(colgroup);

    const thead = el(
        'thead',
        null,
        el(
            'tr',
            null,
            [
                el('th', null, 'Hora'),
                ...DAYS.map(day => el('th', null, day))
            ]
        )
    );
    table.appendChild(thead);

    const tbody = el('tbody');
    for (let h = 0; h < 24; h++) {
        const tr = el('tr');
        tr.appendChild(
            el(
                'td',
                { class: 'hourcell' },
                pad2(h) + ':00–' + pad2(h + 1 === 24 ? 0 : h + 1) + ':00'
            )
        );

        DAYS.forEach(day => {
            tr.appendChild(renderCell(day, h));
        });

        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    scroller.appendChild(table);
    card.appendChild(scroller);

    // Leyenda de categorías
    const legend = el('div', { class: 'legend' });
    CATS.forEach(cat => {
        legend.appendChild(
            el(
                'div',
                { class: 'legend-item' },
                [
                    el('span', { class: 'legend-dot cat-' + cat.key }),
                    cat.label
                ]
            )
        );
    });
    card.appendChild(legend);

    return card;
}

function buildVerticalView() {
    const wrap = el('div', { class: 'cronograma-vertical-view' });

    // Barra de salto rápido de días (Lun, Mar, Mié, ...)
    const dayNav = el('div', { class: 'cron-day-jump-nav' });
    DAYS.forEach(day => {
        const blocks = getBlocksForDay(day);
        const hasAct = blocks.length > 0;
        const chip = el(
            'button',
            {
                class: 'cron-day-chip' + (hasAct ? ' has-items' : ''),
                onclick: () => {
                    const target = document.getElementById(`vday-${day}`);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        target.classList.add('highlight-flash');
                        setTimeout(() => target.classList.remove('highlight-flash'), 1200);
                    }
                }
            },
            day.slice(0, 3)
        );
        dayNav.appendChild(chip);
    });
    wrap.appendChild(dayNav);

    // Tarjetas por cada día
    DAYS.forEach(day => {
        const blocks = getBlocksForDay(day);
        const totalHours = blocks.reduce((acc, b) => acc + b.hours.length, 0);

        const card = el('div', {
            id: `vday-${day}`,
            class: 'vday-card card'
        });

        // Encabezado del día
        const header = el('div', { class: 'vday-header' });
        const left = el('div', { class: 'vday-title-box' }, [
            el('span', { class: 'vday-title' }, day),
            el(
                'span',
                { class: 'vday-badge-hours' },
                totalHours > 0 ? `${totalHours} hs asignadas` : 'Sin actividades'
            )
        ]);

        const addBtn = el(
            'button',
            {
                class: 'btn-add-activity',
                title: `Agregar actividad a ${day}`,
                onclick: () => {
                    openActivityModal({ defaultDay: day });
                }
            },
            [
                el('span', { class: 'btn-plus-icon' }, '+'),
                'Agregar actividad'
            ]
        );

        header.appendChild(left);
        header.appendChild(addBtn);
        card.appendChild(header);

        // Lista de actividades
        const list = el('div', { class: 'vday-activities-list' });

        if (blocks.length === 0) {
            const empty = el(
                'div',
                {
                    class: 'vday-empty-state',
                    onclick: () => openActivityModal({ defaultDay: day })
                },
                [
                    el('span', { class: 'empty-plus' }, '+'),
                    el('span', null, `Sin actividades cargadas para el ${day}`)
                ]
            );
            list.appendChild(empty);
        } else {
            blocks.forEach(block => {
                const info = catInfo(block.cat);
                const item = el('div', {
                    class: `vactivity-card cat-${block.cat}`
                });

                // Horario y duración
                const timeCol = el('div', { class: 'vactivity-time-col' }, [
                    el(
                        'div',
                        { class: 'vactivity-time-range' },
                        `${pad2(block.startHour)}:00 – ${pad2(block.endHour)}:00`
                    ),
                    el(
                        'div',
                        { class: 'vactivity-duration' },
                        `${block.hours.length} ${block.hours.length === 1 ? 'hora' : 'horas'}`
                    )
                ]);

                // Contenido central: Categoría, Título y Rutina
                const centerCol = el('div', { class: 'vactivity-center-col' });
                const catTag = el(
                    'div',
                    { class: 'vactivity-cat-tag' },
                    info ? info.label : block.cat
                );
                centerCol.appendChild(catTag);

                if (block.text) {
                    centerCol.appendChild(
                        el('div', { class: 'vactivity-title' }, block.text)
                    );
                }

                // Rutina de Gimnasio
                if (block.cat === 'gimnasio') {
                    const gymRow = el('div', { class: 'vactivity-gym-row' });
                    if (block.rutina) {
                        const routineTag = el(
                            'button',
                            {
                                class: 'gym-routine-tag',
                                title: 'Ver o editar rutina',
                                onclick: (e) => {
                                    e.stopPropagation();
                                    openRoutineModal(cellKey(day, block.hours[0]), day, block.hours[0]);
                                }
                            },
                            `🏋️ ${block.rutina.nombre || 'Rutina'}`
                        );
                        gymRow.appendChild(routineTag);
                    } else {
                        const addRoutineBtn = el(
                            'button',
                            {
                                class: 'vactivity-btn-add-routine',
                                title: 'Crear rutina de gimnasio',
                                onclick: (e) => {
                                    e.stopPropagation();
                                    openRoutineModal(cellKey(day, block.hours[0]), day, block.hours[0]);
                                }
                            },
                            '+ Crear rutina'
                        );
                        gymRow.appendChild(addRoutineBtn);
                    }
                    centerCol.appendChild(gymRow);
                }

                // Acciones: Editar y Eliminar
                const actionsCol = el('div', { class: 'vactivity-actions-col' });

                const editBtn = el(
                    'button',
                    {
                        class: 'vactivity-btn-action',
                        title: 'Editar actividad',
                        onclick: (e) => {
                            e.stopPropagation();
                            openActivityModal({ defaultDay: day, block });
                        }
                    },
                    '✏️'
                );

                const delBtn = el(
                    'button',
                    {
                        class: 'vactivity-btn-action vactivity-btn-delete',
                        title: 'Eliminar actividad',
                        onclick: (e) => {
                            e.stopPropagation();
                            showConfirmDeleteModal({
                                title: '¿Eliminar actividad?',
                                subtitle: `¿Estás seguro de que querés eliminar "${block.text || (info ? info.label : 'Actividad')}" de ${day} (${pad2(block.startHour)}:00 a ${pad2(block.endHour)}:00)?`,
                                onConfirm: () => {
                                    block.hours.forEach(h => {
                                        delete STATE.cronograma[cellKey(day, h)];
                                    });
                                    markDirtySoon();
                                    renderCronograma();
                                }
                            });
                        }
                    },
                    '✕'
                );

                actionsCol.appendChild(editBtn);
                actionsCol.appendChild(delBtn);

                item.appendChild(timeCol);
                item.appendChild(centerCol);
                item.appendChild(actionsCol);
                list.appendChild(item);
            });
        }

        card.appendChild(list);

        // Desglose de 24 horas (opcional)
        const isExpanded = expandedDays.has(day);
        const toggleAccordionBtn = el(
            'button',
            {
                class: 'vday-toggle-breakdown-btn' + (isExpanded ? ' expanded' : ''),
                onclick: () => {
                    if (isExpanded) {
                        expandedDays.delete(day);
                    } else {
                        expandedDays.add(day);
                    }
                    renderCronograma();
                }
            },
            isExpanded
                ? '▴ Ocultar desglose de 24 horas'
                : '▾ Ver desglose de 24 horas (00:00 – 24:00)'
        );
        card.appendChild(toggleAccordionBtn);

        if (isExpanded) {
            const breakdownContainer = el('div', { class: 'vday-breakdown-container' });
            for (let h = 0; h < 24; h++) {
                const hourRow = el('div', { class: 'vday-hour-row' });
                hourRow.appendChild(
                    el('div', { class: 'vday-hour-label' }, `${pad2(h)}:00`)
                );
                const cellWrap = el('div', { class: 'vday-hour-cell-wrap' });
                cellWrap.appendChild(renderCell(day, h));
                hourRow.appendChild(cellWrap);
                breakdownContainer.appendChild(hourRow);
            }
            card.appendChild(breakdownContainer);
        }

        wrap.appendChild(card);
    });

    return wrap;
}

export function openActivityModal({ defaultDay, block } = {}) {
    const existing = document.getElementById('activity-modal-overlay');
    if (existing) existing.remove();

    const isEditing = Boolean(block);
    let currentDay = block ? block.day : (defaultDay || 'Lunes');
    let startHour = block ? block.startHour : 9;
    let endHour = block ? block.endHour : 10;
    let selectedCat = block ? block.cat : 'facultad';
    let currentText = block ? block.text : '';

    const overlay = el('div', {
        id: 'activity-modal-overlay',
        class: 'modal-overlay'
    });

    const card = el('div', { class: 'modal-card activity-modal-card' });

    // Encabezado
    const header = el('div', { class: 'modal-header' }, [
        el('div', { class: 'modal-header-title' }, [
            el('span', null, isEditing ? 'Editar Actividad' : 'Agregar Actividad'),
            el('span', { class: 'modal-header-badge' }, currentDay)
        ]),
        el(
            'button',
            {
                class: 'modal-close-btn',
                title: 'Cerrar',
                onclick: closeModal
            },
            '✕'
        )
    ]);
    card.appendChild(header);

    // Cuerpo
    const body = el('div', { class: 'modal-body' });

    // Selector de día
    const dayField = el('div', { class: 'modal-field' }, [
        el('label', { class: 'modal-label' }, 'Día de la semana'),
        (() => {
            const sel = el('select', { class: 'modal-input', id: 'activity-day-select' });
            DAYS.forEach(d => {
                const opt = el('option', { value: d }, d);
                if (d === currentDay) opt.selected = true;
                sel.appendChild(opt);
            });
            sel.onchange = (e) => {
                currentDay = e.target.value;
                const badge = card.querySelector('.modal-header-badge');
                if (badge) badge.textContent = currentDay;
            };
            return sel;
        })()
    ]);
    body.appendChild(dayField);

    // Selector de Horario (Desde / Hasta)
    const timeRow = el('div', { class: 'modal-fields-row' });

    const fromField = el('div', { class: 'modal-field flex-1' }, [
        el('label', { class: 'modal-label' }, 'Hora desde'),
        (() => {
            const sel = el('select', { class: 'modal-input', id: 'activity-start-hour' });
            for (let h = 0; h < 24; h++) {
                const opt = el('option', { value: String(h) }, `${pad2(h)}:00`);
                if (h === startHour) opt.selected = true;
                sel.appendChild(opt);
            }
            sel.onchange = (e) => {
                startHour = parseInt(e.target.value, 10);
                if (endHour <= startHour) {
                    endHour = Math.min(24, startHour + 1);
                    const toSel = card.querySelector('#activity-end-hour');
                    if (toSel) toSel.value = String(endHour);
                }
            };
            return sel;
        })()
    ]);

    const toField = el('div', { class: 'modal-field flex-1' }, [
        el('label', { class: 'modal-label' }, 'Hora hasta'),
        (() => {
            const sel = el('select', { class: 'modal-input', id: 'activity-end-hour' });
            for (let h = 1; h <= 24; h++) {
                const opt = el('option', { value: String(h) }, `${pad2(h === 24 ? 0 : h)}:00`);
                if (h === endHour) opt.selected = true;
                sel.appendChild(opt);
            }
            sel.onchange = (e) => {
                endHour = parseInt(e.target.value, 10);
            };
            return sel;
        })()
    ]);

    timeRow.appendChild(fromField);
    timeRow.appendChild(toField);
    body.appendChild(timeRow);

    // Selector de Categoría
    const catField = el('div', { class: 'modal-field' }, [
        el('label', { class: 'modal-label' }, 'Categoría')
    ]);

    const catPills = el('div', { class: 'activity-cat-selector' });
    CATS.forEach(cat => {
        const isSelected = cat.key === selectedCat;
        const btn = el(
            'button',
            {
                type: 'button',
                class: `activity-cat-pill cat-${cat.key}` + (isSelected ? ' active' : ''),
                onclick: () => {
                    selectedCat = cat.key;
                    catPills.querySelectorAll('.activity-cat-pill').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const textInput = card.querySelector('#activity-text-input');
                    if (textInput) {
                        textInput.placeholder = cat.placeholder || (cat.key === 'gimnasio' || cat.key === 'trabajo' ? '(Sin texto requerido)' : 'Detalle...');
                    }
                }
            },
            [
                el('span', { class: 'cat-pill-dot' }),
                cat.label
            ]
        );
        catPills.appendChild(btn);
    });
    catField.appendChild(catPills);
    body.appendChild(catField);

    // Texto de la actividad
    const currentCatInfo = catInfo(selectedCat);
    const textField = el('div', { class: 'modal-field' }, [
        el('label', { class: 'modal-label' }, 'Detalle / Materia / Nombre'),
        el('input', {
            type: 'text',
            class: 'modal-input',
            id: 'activity-text-input',
            placeholder: currentCatInfo && currentCatInfo.placeholder ? currentCatInfo.placeholder : 'Detalle...',
            value: currentText
        })
    ]);
    body.appendChild(textField);

    card.appendChild(body);

    // Footer
    const footer = el('div', { class: 'modal-footer' });

    if (isEditing) {
        const deleteBtn = el(
            'button',
            {
                class: 'modal-btn modal-btn-danger',
                onclick: () => {
                    showConfirmDeleteModal({
                        title: '¿Eliminar actividad?',
                        subtitle: `¿Estás seguro de que querés eliminar esta actividad de ${block.day}?`,
                        onConfirm: () => {
                            block.hours.forEach(h => {
                                delete STATE.cronograma[cellKey(block.day, h)];
                            });
                            markDirtySoon();
                            renderCronograma();
                            closeModal();
                        }
                    });
                }
            },
            '🗑️ Eliminar'
        );
        footer.appendChild(deleteBtn);
    } else {
        footer.appendChild(el('div'));
    }

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
                const daySelect = card.querySelector('#activity-day-select');
                const startSelect = card.querySelector('#activity-start-hour');
                const endSelect = card.querySelector('#activity-end-hour');
                const textInput = card.querySelector('#activity-text-input');

                const targetDay = daySelect ? daySelect.value : currentDay;
                const sHour = parseInt(startSelect.value, 10);
                const eHour = parseInt(endSelect.value, 10);
                const textVal = textInput.value.trim();

                if (eHour <= sHour) {
                    alert('La hora de fin debe ser posterior a la hora de inicio.');
                    return;
                }

                if (isEditing && block) {
                    block.hours.forEach(h => {
                        delete STATE.cronograma[cellKey(block.day, h)];
                    });
                }

                for (let h = sHour; h < eHour; h++) {
                    const key = cellKey(targetDay, h);
                    const existingRutina = isEditing && block && block.rutina ? block.rutina : undefined;
                    STATE.cronograma[key] = {
                        cat: selectedCat,
                        text: textVal,
                        ...(existingRutina ? { rutina: existingRutina } : {})
                    };
                }

                markDirtySoon();
                renderCronograma();
                closeModal();
            }
        },
        isEditing ? 'Guardar cambios' : 'Guardar actividad'
    );

    const actions = el('div', { class: 'modal-footer-actions' }, [cancelBtn, saveBtn]);
    footer.appendChild(actions);
    card.appendChild(footer);

    overlay.appendChild(card);

    function closeModal() {
        document.removeEventListener('keydown', handleKeyDown);
        overlay.remove();
    }

    function handleKeyDown(e) {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            saveBtn.click();
        }
    }

    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', handleKeyDown);
    document.body.appendChild(overlay);

    setTimeout(() => {
        const textInput = card.querySelector('#activity-text-input');
        if (textInput) textInput.focus();
    }, 50);
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