import { el } from './utils.js';
import { getCurrentUser, signIn, signUp, signOut } from './supabase.js';

let onAuthChangedCallback = null;

export function setOnAuthChanged(cb) {
    onAuthChangedCallback = cb;
}

export async function renderAuthSection() {
    const container = document.getElementById('authSection');
    if (!container) return;

    container.innerHTML = '';

    const user = await getCurrentUser();

    if (user) {
        const userCard = el('div', { class: 'auth-user-card' });

        const emailEl = el('div', {
            class: 'auth-user-email',
            title: user.email
        }, [
            el('span', { class: 'auth-dot-online' }),
            user.email
        ]);

        const logoutBtn = el('button', {
            class: 'auth-btn-logout',
            title: 'Cerrar sesión',
            onclick: async () => {
                if (confirm('¿Deseás cerrar sesión?')) {
                    await signOut();
                    await renderAuthSection();
                    if (onAuthChangedCallback) {
                        await onAuthChangedCallback(null);
                    }
                }
            }
        }, 'Salir');

        userCard.appendChild(emailEl);
        userCard.appendChild(logoutBtn);
        container.appendChild(userCard);

    } else {
        const loginBtn = el('button', {
            class: 'auth-btn-login',
            onclick: () => {
                openAuthModal();
            }
        }, [
            el('span', null, '☁️'),
            'Iniciar sesión / Cuenta'
        ]);

        container.appendChild(loginBtn);
    }
}

export function openAuthModal() {
    const existing = document.getElementById('auth-modal-overlay');
    if (existing) {
        existing.remove();
    }

    let isRegisterMode = false;

    const overlay = el('div', {
        id: 'auth-modal-overlay',
        class: 'modal-overlay'
    });

    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(14, 20, 27, 0.7)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '10000';
    overlay.style.padding = '16px';
    overlay.style.boxSizing = 'border-box';

    const card = el('div', {
        class: 'modal-card'
    });
    card.style.maxWidth = '400px';

    // Header
    const header = el('div', { class: 'modal-header' });
    const headerTitle = el('div', { class: 'modal-header-title' }, [
        el('span', null, '☁️ Sincronización en la Nube')
    ]);
    const closeBtn = el('button', {
        class: 'modal-close-btn',
        title: 'Cerrar',
        onclick: closeModal
    }, '✕');
    header.appendChild(headerTitle);
    header.appendChild(closeBtn);
    card.appendChild(header);

    // Body
    const body = el('div', { class: 'modal-body' });

    const desc = el('p', {
        class: 'auth-desc'
    }, 'Iniciá sesión o creá tu cuenta para tener tu cronograma siempre sincronizado en tu compu y en tu celular.');
    body.appendChild(desc);

    // Toggle Ingresar / Registrarse
    const toggleContainer = el('div', { class: 'auth-toggle-bar' });
    const tabLogin = el('button', {
        class: 'auth-toggle-tab active',
        onclick: () => switchMode(false)
    }, 'Ingresar');
    const tabRegister = el('button', {
        class: 'auth-toggle-tab',
        onclick: () => switchMode(true)
    }, 'Crear cuenta');
    toggleContainer.appendChild(tabLogin);
    toggleContainer.appendChild(tabRegister);
    body.appendChild(toggleContainer);

    // Form
    const form = el('form', {
        class: 'auth-form',
        onsubmit: handleSubmit
    });

    const emailField = el('div', { class: 'modal-field' });
    emailField.appendChild(el('label', { class: 'modal-label' }, 'Correo electrónico'));
    const emailInput = el('input', {
        type: 'email',
        class: 'modal-input',
        placeholder: 'tu@email.com',
        required: true,
        autocomplete: 'email'
    });
    emailField.appendChild(emailInput);
    form.appendChild(emailField);

    const passField = el('div', { class: 'modal-field' });
    passField.appendChild(el('label', { class: 'modal-label' }, 'Contraseña'));
    const passInput = el('input', {
        type: 'password',
        class: 'modal-input',
        placeholder: 'Mínimo 6 caracteres',
        required: true,
        autocomplete: 'current-password'
    });
    passField.appendChild(passInput);
    form.appendChild(passField);

    // Error alert
    const errorMsg = el('div', { class: 'auth-error-alert' });
    errorMsg.style.display = 'none';
    form.appendChild(errorMsg);

    // Submit button
    const submitBtn = el('button', {
        type: 'submit',
        class: 'modal-btn modal-btn-primary auth-submit-btn'
    }, 'Ingresar');
    form.appendChild(submitBtn);

    body.appendChild(form);

    // Guest link
    const guestBtn = el('button', {
        type: 'button',
        class: 'auth-btn-guest',
        onclick: closeModal
    }, 'Continuar sin cuenta (solo modo local)');
    body.appendChild(guestBtn);

    card.appendChild(body);
    overlay.appendChild(card);

    function switchMode(register) {
        isRegisterMode = register;
        errorMsg.style.display = 'none';
        errorMsg.textContent = '';

        if (isRegisterMode) {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            submitBtn.textContent = 'Crear cuenta';
            passInput.setAttribute('autocomplete', 'new-password');
        } else {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            submitBtn.textContent = 'Ingresar';
            passInput.setAttribute('autocomplete', 'current-password');
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passInput.value;

        if (!email || !password) return;

        errorMsg.style.display = 'none';
        errorMsg.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando…';

        try {
            if (isRegisterMode) {
                const { data, error } = await signUp(email, password);
                if (error) throw error;

                // Si no requiere confirmación de email, data.user ya está logueado
                if (data && data.user) {
                    closeModal();
                    await renderAuthSection();
                    if (onAuthChangedCallback) {
                        await onAuthChangedCallback(data.user);
                    }
                } else {
                    alert('Cuenta creada. Ya podés ingresar.');
                    switchMode(false);
                }

            } else {
                const { data, error } = await signIn(email, password);
                if (error) throw error;

                if (data && data.user) {
                    closeModal();
                    await renderAuthSection();
                    if (onAuthChangedCallback) {
                        await onAuthChangedCallback(data.user);
                    }
                }
            }

        } catch (err) {
            console.error('Error de autenticación:', err);
            errorMsg.style.display = 'block';
            let msg = err.message || 'Ocurrió un error.';
            if (msg.includes('Invalid login credentials')) {
                msg = 'Email o contraseña incorrectos.';
            } else if (msg.includes('Password should be at least')) {
                msg = 'La contraseña debe tener al menos 6 caracteres.';
            } else if (msg.includes('User already registered')) {
                msg = 'Ya existe un usuario con este correo.';
            }
            errorMsg.textContent = msg;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isRegisterMode ? 'Crear cuenta' : 'Ingresar';
        }
    }

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
        emailInput.focus();
    }, 50);
}
