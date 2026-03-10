const formFirstPassword = document.getElementById('form-first-password');
const passError = document.getElementById('pass-error');
const newPass = document.getElementById('new-password')
const confirmPass = document.getElementById('confirm-password')
const viewPass = document.querySelectorAll('.view-password')

viewPass.forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault()
        const buttonClick = e.target
        const container = buttonClick.closest('.login-form__input-wrapper')
        const inputAssociated = container.querySelector('.login-form__input')
        buttonClick.classList.toggle('view-password-visibility-off')
        inputAssociated.type === 'password' ? inputAssociated.type = 'text' : inputAssociated.type = 'password'
    })
})

formFirstPassword.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(formFirstPassword);
    const data = Object.fromEntries(formData.entries());

    if (data.newPassword !== data.confirmPassword) {
        passError.style.display = 'block';
        return;
    }

    passError.style.display = 'none';

    try {
        const response = await fetch('/api/users/change-password', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                password: data.newPassword,
                confirm_password: data.confirmPassword
            })
        });

        if (response.ok) {
            alert("¡Contraseña actualizada con éxito!");
            window.location.href = '/';
        } else {
            const error = await response.json();
            alert("Error al actualizar: " + error.message);
        }
    } catch (err) {
        console.error("Error:", err);
        alert("No se pudo conectar con el servidor.");
    }
});
