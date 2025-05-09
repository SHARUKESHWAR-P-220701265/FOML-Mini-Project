// Fetch and display medicines
function loadMedicines() {
  fetch('/api/medicines')
    .then(res => res.json())
    .then(medicines => {
      const list = document.getElementById('medicines');
      list.innerHTML = '';
      medicines.forEach(med => {
        const li = document.createElement('li');
        li.innerHTML = `<span><b>${med.name}</b> <small>(${med.condition})</small> - $${med.price}</span> <button onclick="addToCart(${med.id})">Add</button>`;
        list.appendChild(li);
      });
    });
}

function addToCart(id) {
  fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
    .then(res => res.json())
    .then(() => loadCart());
}

function loadCart() {
  fetch('/api/cart')
    .then(res => res.json())
    .then(cart => {
      const list = document.getElementById('cart');
      list.innerHTML = '';
      cart.forEach(med => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span><b>${med.name}</b> - $${med.price} &times; <span class="qty">${med.quantity}</span></span>
          <span>
            <button onclick="incrementCart(${med.medicine_id})">+</button>
            <button onclick="decrementCart(${med.medicine_id})">-</button>
          </span>
        `;
        list.appendChild(li);
      });
    });
}

window.incrementCart = function(id) {
  fetch('/api/cart/increment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
    .then(res => res.json())
    .then(() => loadCart());
};

window.decrementCart = function(id) {
  fetch('/api/cart/decrement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
    .then(res => res.json())
    .then(() => loadCart());
};

document.getElementById('purchase-btn').onclick = function() {
  fetch('/api/purchase', { method: 'POST' })
    .then(res => res.json())
    .then(result => {
      const msg = document.getElementById('purchase-result');
      if (result.success) {
        msg.textContent = `Order placed! Total: $${result.purchase.total}`;
        loadCart();
        // Show receipt popup
        if (result.receipt) {
          document.getElementById('receipt-text').textContent = result.receipt;
          document.getElementById('receipt-modal').style.display = 'flex';
        }
      } else {
        msg.textContent = result.message || 'Could not place order.';
      }
      setTimeout(() => { msg.textContent = ''; }, 4000);
    });
};

document.getElementById('close-receipt').onclick = function() {
  document.getElementById('receipt-modal').style.display = 'none';
};

// Initial load
loadMedicines();
loadCart(); 