export function el(tag, attrs, children) {
    const e = document.createElement(tag);

    if (attrs) {
        for (const k in attrs) {
            const v = attrs[k];

            if (v === null || v === undefined) {
                continue;
            }

            if (k === 'class') {
                e.className = v;
            } else if (k === 'html') {
                e.innerHTML = v;
            } else if (k.startsWith('on')) {
                e.addEventListener(k.slice(2), v);
            } else {
                e.setAttribute(k, v);
            }
        }
    }

    if (children) {
        (Array.isArray(children) ? children : [children]).forEach(c => {
            if (c == null) {
                return;
            }

            e.appendChild(
                typeof c === 'string'
                    ? document.createTextNode(c)
                    : c
            );
        });
    }

    return e;
}

export function debounce(fn, ms) {
    let t;

    return (...a) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...a), ms);
    };
}

export function pad2(n) {
    return String(n).padStart(2, '0');
}

export function fmtDate(d) {
    return (
        pad2(d.getDate()) +
        '/' +
        pad2(d.getMonth() + 1) +
        '/' +
        d.getFullYear()
    );
}