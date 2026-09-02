import { STATE } from './state.js';

export function prepareExportSnapshot() {
    document
        .querySelectorAll('input')
        .forEach(input => {
            input.setAttribute(
                'value',
                input.value
            );
        });
}

export function exportCopy() {

    const stateScript =
        document.getElementById(
            'embeddedState'
        );

    if (stateScript) {
        stateScript.textContent =
            'window.__EMBEDDED_STATE__ = ' +
            JSON.stringify(STATE) +
            ';';
    }

    prepareExportSnapshot();

    const html =
        '<!DOCTYPE html>\n' +
        document.documentElement.outerHTML;

    const blob =
        new Blob(
            [html],
            {
                type: 'text/html'
            }
        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement('a');

    const d = new Date();

    a.href = url;

    a.download =
        'organizacion-cuatrimestre-' +
        d.toISOString().slice(0, 10) +
        '.html';

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}