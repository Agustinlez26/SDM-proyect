const form = document.getElementById('login-form')
const passInput = document.getElementById('password')
const viewPass = document.getElementById('view-password')
const inputsWrappers = document.querySelectorAll('.login-form__input-wrapper')

inputsWrappers.forEach(wrapper => {
    wrapper.addEventListener('click', (e) => {
        const wrapper = e.target.closest('.login-form__input-wrapper')
        if (wrapper) {
            const input = wrapper.querySelector('.login-form__input')
            if (input) input.focus()
        }
    })
})

viewPass.addEventListener('click', (e) => {
    e.preventDefault()
    viewPass.classList.toggle('view-password-visibility-off')
    passInput.type === 'password' ? passInput.type = 'text' : passInput.type = 'password'
})

form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(form)
    const data = Object.fromEntries(formData.entries())

    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify(data)
    })

    if (response.ok) {
        // Redirigir al dashboard
        window.location.href = '/'
    } else {
        const error = await response.json()
        if(error.status === 429) alert('Demasiados intentos fallidos, intenta de nuevo mas tarde.')
        alert('Usuario o contraseña incorrectos.')
        form.reset()
    }
})
