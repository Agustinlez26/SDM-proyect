// ============================================================================
// COMPONENTE: MODAL DE PRODUCTO (Solo Add/Edit)
// ============================================================================

let isEditing = false;

document.addEventListener('DOMContentLoaded', () => {
    startWebSocket()
    setupProductModalListeners();
    fetchProductCategories();
});

function startWebSocket() {
    const socket = io()

    socket.on('new_category', () => {
        fetchCategories()
    })

    socket.on('category_deleted', () => {
        fetchCategories()
    })
}

// --- LÓGICA DE CATEGORÍAS (Para el Select) ---
async function fetchProductCategories() {
    try {
        const res = await fetch('/api/products/categories');
        const json = await res.json();

        if (json.status === 'success') {
            const formSelect = document.getElementById('prod-category');
            if (formSelect) {
                formSelect.innerHTML = '<option value="" disabled selected>Seleccionar...</option>';
                json.data.forEach(cat => {
                    formSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
                });
            }
        }
    } catch (error) { console.error('Error cargando categorías para el modal:', error); }
}

// --- LÓGICA DE PRODUCTOS ---
window.openProductModal = function () {
    isEditing = false;
    document.getElementById('product-modal-title').textContent = 'Añade un producto';
    document.getElementById('form-product').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-is-active').value = '1';
    document.getElementById('prod-img').value = '';
    document.getElementById('prod-img-preview').src = '';
    document.getElementById('modal-add-product').classList.add('active');
}

window.editProduct = async function (id) {
    try {
        const res = await fetch(`/api/products/${id}`);
        const json = await res.json();

        if (json.status === 'success') {
            const p = json.data;
            isEditing = true;
            document.getElementById('product-modal-title').textContent = 'Editar producto';

            document.getElementById('prod-id').value = p.id;
            document.getElementById('prod-name').value = p.name;
            document.getElementById('prod-code').value = p.cod_bar;
            document.getElementById('prod-category').value = p.category_id || '';
            document.getElementById('prod-desc').value = p.description;
            document.getElementById('prod-is-active').value = p.is_active ? '1' : '0';

            const previewImg = document.getElementById('prod-img-preview');
            if (p.url_img_original) {
                previewImg.src = p.url_img_original;
            } else {
                previewImg.src = '';
            }
            document.getElementById('prod-img').value = '';

            document.getElementById('modal-add-product').classList.add('active');
        }
    } catch (e) { console.error(e); alert('Error al cargar datos del producto'); }
}

const formProduct = document.getElementById('form-product');

if (formProduct) {
    formProduct.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('name', document.getElementById('prod-name').value);
        formData.append('cod_bar', document.getElementById('prod-code').value);
        formData.append('category_id', document.getElementById('prod-category').value);
        formData.append('description', document.getElementById('prod-desc').value);
        formData.append('is_active', document.getElementById('prod-is-active').value);

        const fileInput = document.getElementById('prod-img');
        if (fileInput.files.length > 0) {
            formData.append('image', fileInput.files[0]);
        }

        const id = document.getElementById('prod-id').value;
        const url = isEditing ? `/api/products/${id}` : '/api/products/';
        const method = isEditing ? 'PATCH' : 'POST';

        const btnSave = document.getElementById('btn-save-product');
        const originalText = btnSave.textContent;
        btnSave.disabled = true;
        btnSave.textContent = 'Guardando...';

        try {
            const res = await fetch(url, { method: method, body: formData });
            const json = await res.json();

            if (res.ok || json.status === 'success') {
                alert(isEditing ? 'Producto actualizado' : 'Producto creado');
                document.getElementById('modal-add-product').classList.remove('active');
                window.dispatchEvent(new CustomEvent('productSaved')); // Avisa a la vista principal para recargar
            } else {
                console.error('Error:', json);
                alert('Error al guardar: ' + (json.message || 'Revisa los datos.'));
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión con el servidor.');
        } finally {
            btnSave.disabled = false;
            btnSave.textContent = originalText;
        }
    });
}

// --- UTILIDADES UI ---
function setupProductModalListeners() {
    document.querySelectorAll('.btn-close-modal, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            if (targetId) document.getElementById(targetId).classList.remove('active');
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });
}