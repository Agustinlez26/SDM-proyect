let state={orders:[],branches:[],catalogs:{},appRole:'seller',area:'retail',channel:window.ORDER_CHANNEL}
let items=[]
const $=id=>document.getElementById(id)
const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))
const channelLabel=value=>({mercado_libre:'Mercado Libre',tienda_nube:'Tienda Nube',mayorista:'Mayorista',merchandising:'Merchandising',showroom:'Showroom'}[value]||value)
const statusLabel=value=>({reserved:'Reservado',completed:'Completado',cancelled:'Cancelado'}[value]||value)
const request=async(url,options={})=>{const response=await fetch(url,{headers:{'Content-Type':'application/json'},...options});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.message||'No se pudo completar la operación');return body.data}
const notify=(message,error=false)=>{$('orders-message').textContent=message;$('orders-message').className=`orders-message ${error?'error':'success'}`;setTimeout(()=>$('orders-message').classList.add('hidden'),4500)}
const selectedBranchId=()=>Number($('order-branch').value)
const selectedBranch=()=>state.branches.find(branch=>Number(branch.id)===selectedBranchId())

const loadCatalogs=async()=>{
    const entries=await Promise.all(state.branches.map(async branch=>[branch.id,await request(`/api/orders/catalog?channel=${state.channel}&branch_id=${branch.id}`)]))
    state.catalogs=Object.fromEntries(entries)
    renderProductOptions()
}
const renderProductOptions=()=>{
    const catalog=state.catalogs[selectedBranchId()]||[]
    $('order-product').innerHTML='<option value="">Seleccionar producto</option>'+catalog.filter(p=>Number(p.available)>0).map(p=>`<option value="${p.id}">${esc(p.name)} (${esc(p.sku)}) — físico ${p.physical}, reservado ${p.reserved}, disponible ${p.available}</option>`).join('')
    renderAvailability()
}
const renderAvailability=()=>{
    const productId=Number($('order-product').value)
    if(!productId){$('branch-availability').innerHTML='Seleccioná un producto para comparar el stock físico, reservado y disponible.';return}
    $('branch-availability').innerHTML=state.branches.map(branch=>{
        const product=(state.catalogs[branch.id]||[]).find(p=>Number(p.id)===productId)
        return `<div><strong>${esc(branch.name)}</strong><span>Físico: ${product?.physical||0}</span><span>Reservado: ${product?.reserved||0}</span><span>Disponible: ${product?.available||0}</span></div>`
    }).join('')
}
const renderItems=()=>{
    $('order-items').innerHTML=items.length?items.map((item,index)=>`<div><span>${esc(item.name)} x${item.quantity}<small>${esc(item.branch_name)}</small></span><button type="button" data-remove="${index}">Quitar</button></div>`).join(''):'<small>Todavía no agregaste productos.</small>'
    document.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',()=>{items.splice(Number(button.dataset.remove),1);renderItems()}))
}
const render=()=>{
    $('orders-summary').innerHTML=[['Reservados',state.orders.filter(o=>o.status==='reserved').length],['Completados',state.orders.filter(o=>o.status==='completed').length],['Cancelados',state.orders.filter(o=>o.status==='cancelled').length],['Canal',channelLabel(state.channel)]].map(([label,value])=>`<article><strong>${esc(value)}</strong><span>${label}</span></article>`).join('')
    const canConfirm=state.channel!=='mayorista'||['admin','stock_manager'].includes(state.appRole)
    $('orders-list').innerHTML=state.orders.map(o=>`<tr><td><strong>${esc(o.order_number)}</strong></td><td>${esc(channelLabel(o.channel))}</td><td>${esc(o.customer_reference)}</td><td>${esc(o.branch_name)}</td><td>${esc(o.items)}</td><td><span class="order-status ${o.status}">${esc(statusLabel(o.status))}</span></td><td>${o.status==='reserved'?`${canConfirm?`<button data-complete="${o.id}">Confirmar retiro</button>`:''}<button class="danger" data-cancel="${o.id}">Cancelar</button>`:''}</td></tr>`).join('')||'<tr><td colspan="7">Todavía no hay pedidos en este canal.</td></tr>'
    $('order-branch').innerHTML=state.branches.map((branch,index)=>`<option value="${branch.id}" ${index===0?'selected':''}>${esc(branch.name)}</option>`).join('')
    $('order-branch-group').hidden=state.branches.length===1
}
const load=async()=>{
    try{state={...state,...await request(`/api/orders?channel=${state.channel}`)};render();await loadCatalogs()}
    catch(error){notify(`${error.message}. Ejecutá la migración de roles y pedidos.`,true)}
}

$('order-branch').addEventListener('change',renderProductOptions)
$('order-product').addEventListener('change',renderAvailability)
$('order-add-item').addEventListener('click',()=>{
    const product=(state.catalogs[selectedBranchId()]||[]).find(p=>Number(p.id)===Number($('order-product').value));const quantity=Number($('order-quantity').value);const branch=selectedBranch()
    if(!product||!branch||!Number.isInteger(quantity)||quantity<1)return notify('Elegí producto, ubicación y cantidad válida.',true)
    if(items.some(item=>Number(item.product_id)===Number(product.id)&&Number(item.branch_id)===Number(branch.id)))return notify('Ese producto y ubicación ya están agregados.',true)
    if(quantity>Number(product.available))return notify(`Solo hay ${product.available} unidades disponibles en ${branch.name}.`,true)
    items.push({product_id:product.id,branch_id:branch.id,branch_name:branch.name,quantity,name:product.name});renderItems()
})
$('order-form').addEventListener('submit',async event=>{event.preventDefault();try{if(!items.length)throw new Error('Agregá al menos un producto');await request('/api/orders',{method:'POST',body:JSON.stringify({channel:state.channel,customer_reference:$('order-reference').value,notes:$('order-notes').value,items})});event.target.reset();items=[];renderItems();notify('Pedido creado y stock reservado');await load()}catch(error){notify(error.message,true)}})
$('orders-list').addEventListener('click',async event=>{try{if(event.target.dataset.complete){if(!confirm('Se descontará el stock físico de cada ubicación y quedará registrada la confirmación. ¿Continuar?'))return;await request(`/api/orders/${event.target.dataset.complete}/complete`,{method:'POST'});notify('Retiro confirmado y movimientos registrados')}if(event.target.dataset.cancel){if(!confirm('¿Cancelar el pedido y liberar sus reservas?'))return;await request(`/api/orders/${event.target.dataset.cancel}/cancel`,{method:'POST'});notify('Pedido cancelado y reservas liberadas')}if(event.target.dataset.complete||event.target.dataset.cancel)await load()}catch(error){notify(error.message,true)}})
load()
