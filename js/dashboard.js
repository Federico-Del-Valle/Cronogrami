import { CATS } from './constants.js';
import { STATE } from './state.js';
import { el } from './utils.js';
import { markDirtySoon } from './persistence.js';

export function renderDashboard() {
    const c = document.getElementById('panel-dashboard');
    c.innerHTML = '';

    const today = new Date();
    const start = new Date(2026, 7, 17);
    const end = new Date(2026, 11, 30);

    const totalWeeks =
        Math.ceil((end - start) / (7 * 86400000));

    let weekNum =
        Math.floor((today - start) / (7 * 86400000)) + 1;

    if (weekNum < 1) weekNum = 1;
    if (weekNum > totalWeeks) weekNum = totalWeeks;

    const daysLeft =
        Math.max(
            0,
            Math.round((end - today) / 86400000)
        );

    const sl =
        document.getElementById('statusline');

    if (sl) {
        sl.innerHTML =
            'Cronogrami ▸ semana ' +
            weekNum +
            '/' +
            totalWeeks +
            ' ▸ ' +
            daysLeft +
            ' días al 30/12' +
            '<span class="cursor"></span>';
    }

    const grid =
        el('div', { class: 'grid-2' });

    // Aseguramos que deadlines esté ordenado cronológicamente y tenga IDs
    if (!STATE.deadlines) {
        STATE.deadlines = [];
    }
    STATE.deadlines.forEach((d, idx) => {
        if (!d.id) {
            d.id = 'dl_' + idx + '_' + Math.random().toString(36).substr(2, 5);
        }
    });
    sortDeadlines();

    // Deadlines
    const ddCard = el('div', {
        class: 'card'
    });

    const ddHeader = el('div', {
        class: 'deadline-header'
    });

    ddHeader.appendChild(
        el(
            'div',
            {
                class: 'card-title'
            },
            'Próximos deadlines'
        )
    );

    ddHeader.appendChild(
        el(
            'button',
            {
                class: 'btn-add-deadline',
                onclick: () => {
                    addDeadline();
                }
            },
            '+ Agregar fecha'
        )
    );

    ddCard.appendChild(ddHeader);

    STATE.deadlines.forEach((d) => {

        const row = el('div', {
            class: 'deadline-row',
            'data-deadline-id': d.id
        });

        const handleDateChange = (newVal) => {
            if (d.fecha === newVal) return;
            d.fecha = newVal;
            sortDeadlines();
            markDirtySoon();
            renderDashboard();

            // Foco en el input de texto del mismo deadline para escribir fluido
            setTimeout(() => {
                const targetRow = document.querySelector(`[data-deadline-id="${d.id}"]`);
                if (targetRow) {
                    const txt = targetRow.querySelector('input[type="text"]');
                    if (txt) txt.focus();
                }
            }, 50);
        };

        row.appendChild(
            el(
                'input',
                {
                    type: 'date',
                    value: d.fecha,
                    onchange: (e) => handleDateChange(e.target.value),
                    onblur: (e) => handleDateChange(e.target.value)
                }
            )
        );

        row.appendChild(
            el(
                'input',
                {
                    type: 'text',
                    value: d.label,
                    placeholder: 'Descripción del deadline...',
                    oninput: (e) => {
                        d.label = e.target.value;
                        markDirtySoon();
                    },
                    onkeydown: (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addDeadline();
                        }
                    }
                }
            )
        );

        row.appendChild(
            el(
                'button',
                {
                    class: 'btn-delete-deadline',
                    title: 'Eliminar deadline',
                    onclick: () => {
                        STATE.deadlines = STATE.deadlines.filter(item => item.id !== d.id);
                        markDirtySoon();
                        renderDashboard();
                    }
                },
                '×'
            )
        );

        ddCard.appendChild(row);
    });

    grid.appendChild(ddCard);

    // Resumen semanal
    const sumCard =
        el('div', { class: 'card' });

    sumCard.appendChild(
        el(
            'div',
            { class: 'card-title' },
            'Resumen semanal (horas cargadas)'
        )
    );

    const counts = {};

    CATS.forEach(cat => {
        counts[cat.key] = 0;
    });

    Object.values(STATE.cronograma)
        .forEach(cell => {
            if (cell && cell.cat) {
                counts[cell.cat] =
                    (counts[cell.cat] || 0) + 1;
            }
        });

    CATS.forEach(cat => {

        const row =
            el('div', {
                class: 'stat-line'
            });

        row.appendChild(
            el('span', {
                class:
                    'stat-dot cat-' + cat.key
            })
        );

        row.appendChild(
            el(
                'span',
                { class: 'stat-label' },
                cat.label
            )
        );

        row.appendChild(
            el(
                'span',
                { class: 'stat-value' },
                counts[cat.key] + ' hs'
            )
        );

        sumCard.appendChild(row);
    });

    grid.appendChild(sumCard);

    c.appendChild(grid);

    c.appendChild(
        el(
            'p',
            { class: 'footnote' },
            'Este resumen cuenta las horas que ya cargaste en el Cronograma para cada categoría (semana tipo, no fechas puntuales).'
        )
    );
}

export function sortDeadlines() {
    if (!STATE || !STATE.deadlines) return;
    STATE.deadlines.sort((a, b) => {
        const fechaA = (a.fecha || '').trim();
        const fechaB = (b.fecha || '').trim();

        if (!fechaA && !fechaB) return 0;
        if (!fechaA) return 1;
        if (!fechaB) return -1;

        const cmp = fechaA.localeCompare(fechaB);
        if (cmp !== 0) return cmp;
        return (a.label || '').localeCompare(b.label || '');
    });
}

function addDeadline() {
    const newDl = {
        id: 'dl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        fecha: '',
        label: ''
    };

    STATE.deadlines.push(newDl);
    sortDeadlines();
    markDirtySoon();
    renderDashboard();

    setTimeout(() => {
        const rowEl = document.querySelector(`[data-deadline-id="${newDl.id}"]`);
        if (rowEl) {
            const dateInput = rowEl.querySelector('input[type="date"]');
            if (dateInput) {
                dateInput.focus();
                if (typeof dateInput.showPicker === 'function') {
                    try { dateInput.showPicker(); } catch (_) {}
                }
            }
        }
    }, 50);
}