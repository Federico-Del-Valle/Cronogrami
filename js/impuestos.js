import { MONTHS } from './constants.js';
import { STATE } from './state.js';
import { el } from './utils.js';
import { markDirtySoon } from './persistence.js';
import { showConfirmDeleteModal } from './cronograma.js';

let selectedYear = new Date().getFullYear();

export function getSelectedYear() {
    return selectedYear;
}

export function setSelectedYear(year) {
    selectedYear = year;
}

function formatMonto(val) {
    if (!val) return '';
    const clean = String(val).replace(/[^0-9.,]/g, '');
    if (!clean) return '';
    return '$ ' + clean;
}

export function renderImpuestos() {
    const container = document.getElementById('panel-impuestos');
    if (!container) return;

    container.innerHTML = '';

    if (!STATE.impuestos) {
        STATE.impuestos = [];
    }

    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth() + 1; // 1 to 12

    // Intro lede
    container.appendChild(
        el(
            'p',
            { class: 'lede' },
            'Seguimiento anual de impuestos por mes. Podés registrar cada impuesto con su nombre, mes, año y el día que se pagó.'
        )
    );

    // Controles superiores: Selector de año y métricas
    const topBar = el('div', { class: 'impuestos-topbar card' });

    const yearControl = el('div', { class: 'year-nav' }, [
        el(
            'button',
            {
                class: 'year-nav-btn',
                title: 'Año anterior',
                onclick: () => {
                    selectedYear--;
                    renderImpuestos();
                }
            },
            '◀'
        ),
        el('span', { class: 'year-display' }, String(selectedYear)),
        el(
            'button',
            {
                class: 'year-nav-btn',
                title: 'Año siguiente',
                onclick: () => {
                    selectedYear++;
                    renderImpuestos();
                }
            },
            '▶'
        )
    ]);

    // Resumen anual
    const yearTaxes = STATE.impuestos.filter(i => Number(i.anio) === Number(selectedYear));
    const totalCount = yearTaxes.length;
    let totalMonto = 0;
    yearTaxes.forEach(i => {
        const num = parseFloat(String(i.monto || '0').replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) totalMonto += num;
    });

    const statsDiv = el('div', { class: 'impuestos-stats' }, [
        el('div', { class: 'impuestos-stat-chip' }, [
            el('span', { class: 'stat-chip-label' }, 'Total registrados:'),
            el('strong', { class: 'stat-chip-value' }, `${totalCount}`)
        ]),
        totalMonto > 0
            ? el('div', { class: 'impuestos-stat-chip' }, [
                  el('span', { class: 'stat-chip-label' }, 'Monto acumulado:'),
                  el(
                      'strong',
                      { class: 'stat-chip-value stat-monto' },
                      '$ ' + totalMonto.toLocaleString('es-AR')
                  )
              ])
            : null
    ].filter(Boolean));

    const addTaxBtn = el(
        'button',
        {
            class: 'btn-add-impuesto-main',
            onclick: () => {
                openImpuestoModal({
                    defaultMes: currentMonthIndex,
                    defaultAnio: selectedYear
                });
            }
        },
        [
            el('span', { class: 'btn-plus-icon' }, '+'),
            'Registrar impuesto'
        ]
    );

    topBar.appendChild(yearControl);
    topBar.appendChild(statsDiv);
    topBar.appendChild(addTaxBtn);
    container.appendChild(topBar);

    // Barra de salto rápido de meses (para pantallas móviles y tablets)
    const monthChipsNav = el('div', { class: 'month-jump-nav' });
    MONTHS.forEach((mName, idx) => {
        const mNum = idx + 1;
        const isCurrent = selectedYear === currentYear && mNum === currentMonthIndex;
        const hasTaxes = STATE.impuestos.some(
            i => Number(i.anio) === Number(selectedYear) && Number(i.mes) === mNum
        );

        const chip = el(
            'button',
            {
                class:
                    'month-jump-chip' +
                    (isCurrent ? ' current' : '') +
                    (hasTaxes ? ' has-items' : ''),
                onclick: () => {
                    const targetCard = document.getElementById(`month-card-${mNum}`);
                    if (targetCard) {
                        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetCard.classList.add('highlight-flash');
                        setTimeout(() => {
                            targetCard.classList.remove('highlight-flash');
                        }, 1200);
                    }
                }
            },
            mName.slice(0, 3)
        );
        monthChipsNav.appendChild(chip);
    });
    container.appendChild(monthChipsNav);

    // Grilla / Lista de los 12 meses
    const grid = el('div', { class: 'impuestos-grid' });

    MONTHS.forEach((monthName, idx) => {
        const monthNum = idx + 1;
        const isCurrentMonth = selectedYear === currentYear && monthNum === currentMonthIndex;

        const taxesInMonth = STATE.impuestos
            .filter(i => Number(i.anio) === Number(selectedYear) && Number(i.mes) === monthNum)
            .sort((a, b) => Number(a.diaPago || 0) - Number(b.diaPago || 0));

        const monthCard = el('div', {
            id: `month-card-${monthNum}`,
            class: 'month-card card' + (isCurrentMonth ? ' current-month-card' : '')
        });

        // Encabezado del mes
        const header = el('div', { class: 'month-card-header' });

        const titleBox = el('div', { class: 'month-card-title' }, [
            el('span', { class: 'month-name' }, monthName),
            isCurrentMonth
                ? el('span', { class: 'current-month-badge' }, 'Mes actual')
                : null,
            taxesInMonth.length > 0
                ? el(
                      'span',
                      { class: 'month-count-badge' },
                      `${taxesInMonth.length} ${taxesInMonth.length === 1 ? 'impuesto' : 'impuestos'}`
                  )
                : null
        ].filter(Boolean));

        const addBtn = el(
            'button',
            {
                class: 'month-add-btn',
                title: `Agregar impuesto en ${monthName}`,
                onclick: () => {
                    openImpuestoModal({
                        defaultMes: monthNum,
                        defaultAnio: selectedYear
                    });
                }
            },
            '+'
        );

        header.appendChild(titleBox);
        header.appendChild(addBtn);
        monthCard.appendChild(header);

        // Lista de impuestos del mes
        const list = el('div', { class: 'month-taxes-list' });

        if (taxesInMonth.length === 0) {
            const empty = el(
                'div',
                {
                    class: 'month-empty-state',
                    onclick: () => {
                        openImpuestoModal({
                            defaultMes: monthNum,
                            defaultAnio: selectedYear
                        });
                    }
                },
                [
                    el('span', { class: 'empty-plus' }, '+'),
                    el('span', null, `Sin impuestos en ${monthName}`)
                ]
            );
            list.appendChild(empty);
        } else {
            taxesInMonth.forEach(tax => {
                const taxItem = el('div', { class: 'tax-item-row' });

                const mainInfo = el('div', { class: 'tax-main-info' });

                const nameLine = el('div', { class: 'tax-name-line' }, [
                    el('span', { class: 'tax-check-icon' }, '✓'),
                    el('span', { class: 'tax-name' }, tax.nombre)
                ]);

                const metaLine = el('div', { class: 'tax-meta-line' });

                if (tax.diaPago) {
                    metaLine.appendChild(
                        el(
                            'span',
                            { class: 'tax-badge-day' },
                            `Pagado el día ${tax.diaPago}`
                        )
                    );
                }

                if (tax.monto) {
                    metaLine.appendChild(
                        el(
                            'span',
                            { class: 'tax-badge-monto' },
                            formatMonto(tax.monto)
                        )
                    );
                }

                if (tax.notas) {
                    metaLine.appendChild(
                        el(
                            'span',
                            { class: 'tax-note', title: tax.notas },
                            tax.notas
                        )
                    );
                }

                mainInfo.appendChild(nameLine);
                mainInfo.appendChild(metaLine);

                // Acciones
                const actions = el('div', { class: 'tax-actions' });

                const editBtn = el(
                    'button',
                    {
                        class: 'tax-btn-edit',
                        title: 'Editar impuesto',
                        onclick: e => {
                            e.stopPropagation();
                            openImpuestoModal({
                                impuesto: tax,
                                defaultMes: monthNum,
                                defaultAnio: selectedYear
                            });
                        }
                    },
                    '✏️'
                );

                const deleteBtn = el(
                    'button',
                    {
                        class: 'tax-btn-delete',
                        title: 'Eliminar impuesto',
                        onclick: e => {
                            e.stopPropagation();
                            showConfirmDeleteModal({
                                title: '¿Eliminar impuesto?',
                                subtitle: `¿Estás seguro de que querés eliminar el pago de "${tax.nombre}" correspondiente a ${monthName} ${selectedYear}?`,
                                onConfirm: () => {
                                    STATE.impuestos = STATE.impuestos.filter(i => i.id !== tax.id);
                                    markDirtySoon();
                                    renderImpuestos();
                                }
                            });
                        }
                    },
                    '✕'
                );

                actions.appendChild(editBtn);
                actions.appendChild(deleteBtn);

                taxItem.appendChild(mainInfo);
                taxItem.appendChild(actions);
                list.appendChild(taxItem);
            });
        }

        monthCard.appendChild(list);
        grid.appendChild(monthCard);
    });

    container.appendChild(grid);
}

export function openImpuestoModal({ impuesto, defaultMes, defaultAnio } = {}) {
    const existing = document.getElementById('impuesto-modal-overlay');
    if (existing) existing.remove();

    const isEditing = Boolean(impuesto);
    const mes = (impuesto && impuesto.mes) || defaultMes || 1;
    const anio = (impuesto && impuesto.anio) || defaultAnio || selectedYear;
    const initialNombre = (impuesto && impuesto.nombre) || '';
    const initialDia = (impuesto && impuesto.diaPago) !== undefined && impuesto.diaPago !== null ? String(impuesto.diaPago) : '';
    const initialMonto = (impuesto && impuesto.monto) || '';
    const initialNotas = (impuesto && impuesto.notas) || '';

    const overlay = el('div', {
        id: 'impuesto-modal-overlay',
        class: 'modal-overlay'
    });

    const card = el('div', { class: 'modal-card impuesto-modal-card' });

    // Encabezado
    const header = el('div', { class: 'modal-header' }, [
        el('div', { class: 'modal-header-title' }, [
            el('span', null, isEditing ? 'Editar Impuesto' : 'Registrar Impuesto'),
            el(
                'span',
                { class: 'modal-header-badge' },
                `${MONTHS[mes - 1]} ${anio}`
            )
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

    // Nombre del impuesto
    const nameField = el('div', { class: 'modal-field' }, [
        el('label', { class: 'modal-label' }, 'Nombre del impuesto *'),
        el('input', {
            type: 'text',
            class: 'modal-input',
            id: 'impuesto-name-input',
            placeholder: 'ej. Monotributo, ABL, Ingresos Brutos, Luz, Gas...',
            value: initialNombre
        })
    ]);
    body.appendChild(nameField);

    // Fila con Mes y Año
    const dateRow = el('div', { class: 'modal-fields-row' });

    const mesField = el('div', { class: 'modal-field flex-1' }, [
        el('label', { class: 'modal-label' }, 'Mes'),
        (() => {
            const sel = el('select', { class: 'modal-input' });
            MONTHS.forEach((m, idx) => {
                const opt = el('option', { value: String(idx + 1) }, m);
                if (idx + 1 === Number(mes)) opt.selected = true;
                sel.appendChild(opt);
            });
            return sel;
        })()
    ]);

    const anioField = el('div', { class: 'modal-field flex-1' }, [
        el('label', { class: 'modal-label' }, 'Año'),
        el('input', {
            type: 'number',
            class: 'modal-input',
            value: String(anio),
            min: '2020',
            max: '2035'
        })
    ]);

    dateRow.appendChild(mesField);
    dateRow.appendChild(anioField);
    body.appendChild(dateRow);

    // Fila con Día de pago y Monto
    const payRow = el('div', { class: 'modal-fields-row' });

    const diaField = el('div', { class: 'modal-field flex-1' }, [
        el('label', { class: 'modal-label' }, 'Día que se pagó *'),
        el('input', {
            type: 'number',
            class: 'modal-input',
            placeholder: 'ej. 10 (del 1 al 31)',
            value: initialDia,
            min: '1',
            max: '31'
        })
    ]);

    const montoField = el('div', { class: 'modal-field flex-1' }, [
        el('label', { class: 'modal-label' }, 'Monto pagado ($ opcional)'),
        el('input', {
            type: 'text',
            class: 'modal-input',
            placeholder: 'ej. 12500',
            value: initialMonto
        })
    ]);

    payRow.appendChild(diaField);
    payRow.appendChild(montoField);
    body.appendChild(payRow);

    // Notas / Comentarios
    const notasField = el('div', { class: 'modal-field' }, [
        el('label', { class: 'modal-label' }, 'Notas / Detalle (opcional)'),
        el('input', {
            type: 'text',
            class: 'modal-input',
            placeholder: 'ej. Pago por Mercado Pago / Débito automático',
            value: initialNotas
        })
    ]);
    body.appendChild(notasField);

    card.appendChild(body);

    // Pie
    const footer = el('div', { class: 'modal-footer' });

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
                const nameInput = card.querySelector('#impuesto-name-input');
                const mesSelect = mesField.querySelector('select');
                const anioInput = anioField.querySelector('input');
                const diaInput = diaField.querySelector('input');
                const montoInput = montoField.querySelector('input');
                const notasInput = notasField.querySelector('input');

                const nombre = nameInput.value.trim();
                const m = parseInt(mesSelect.value, 10);
                const a = parseInt(anioInput.value, 10) || selectedYear;
                const dia = diaInput.value.trim() ? parseInt(diaInput.value.trim(), 10) : null;
                const monto = montoInput.value.trim();
                const notas = notasInput.value.trim();

                if (!nombre) {
                    nameInput.focus();
                    nameInput.classList.add('input-error');
                    return;
                }

                if (isEditing) {
                    impuesto.nombre = nombre;
                    impuesto.mes = m;
                    impuesto.anio = a;
                    impuesto.diaPago = dia;
                    impuesto.monto = monto;
                    impuesto.notas = notas;
                } else {
                    const newImpuesto = {
                        id: 'imp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                        nombre,
                        mes: m,
                        anio: a,
                        diaPago: dia,
                        monto,
                        notas
                    };
                    STATE.impuestos.push(newImpuesto);
                }

                selectedYear = a;
                markDirtySoon();
                renderImpuestos();
                closeModal();
            }
        },
        isEditing ? 'Guardar cambios' : 'Registrar impuesto'
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
        const input = card.querySelector('#impuesto-name-input');
        if (input) input.focus();
    }, 50);
}
