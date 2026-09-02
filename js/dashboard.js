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
            'org.sys ▸ semana ' +
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

    STATE.deadlines.forEach((d, index) => {

        const row = el('div', {
            class: 'deadline-row'
        });

        row.appendChild(
            el(
                'input',
                {
                    type: 'date',
                    value: d.fecha,
                    onchange: (e) => {
                        d.fecha = e.target.value;
                        markDirtySoon();
                    }
                }
            )
        );

        row.appendChild(
            el(
                'input',
                {
                    type: 'text',
                    value: d.label,
                    oninput: (e) => {
                        d.label = e.target.value;
                        markDirtySoon();
                    }
                }
            )
        );

        row.appendChild(
            el(
                'button',
                {
                    class: 'btn-delete-deadline',
                    title: 'Eliminar',
                    onclick: () => {

                        STATE.deadlines.splice(index, 1);

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

function addDeadline() {

    STATE.deadlines.push({
        fecha: '',
        label: ''
    });

    markDirtySoon();

    renderDashboard();
}