const firebaseConfig = {
  apiKey: "AIzaSyAVgOscvlM0tcLmkAsKBCciqkC5O3AAIOU",
  authDomain: "mk-tech-3d536.firebaseapp.com",
  projectId: "mk-tech-3d536",
  storageBucket: "mk-tech-3d536.firebasestorage.app",
  messagingSenderId: "419394180062",
  appId: "1:419394180062:web:b59e2536800babf657034f",
  measurementId: "G-SF1YS17QXH"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let allOrders = [];
let allProducts = [];

auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('dashboardScreen').classList.remove('hidden');
        document.getElementById('profileEmail').innerText = user.email;
        fetchData();
    } else {
        document.getElementById('dashboardScreen').classList.add('hidden');
        document.getElementById('authScreen').classList.remove('hidden');
    }
});

function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    auth.signInWithEmailAndPassword(email, password).catch(err => {
        const box = document.getElementById('loginError');
        box.innerText = "❌ " + err.message;
        box.classList.remove('hidden');
    });
}

function handleLogout() { auth.signOut(); }

function switchTab(tabId) {
    document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${tabId}`).classList.add('active');

    const titles = { dashboard: 'Dashboard', orders: 'Customer Orders', products: 'Live Inventory', add: 'Add Product', users: 'Users & Profile' };
    document.getElementById('screenTitle').innerText = titles[tabId];

    document.querySelectorAll('.nav-btn').forEach(b => {
        if (b.dataset.tab === tabId) {
            b.className = 'nav-btn active flex flex-col items-center gap-1 text-slate-900';
        } else {
            b.className = 'nav-btn flex flex-col items-center gap-1 text-slate-400 hover:text-slate-900';
        }
    });
    window.scrollTo(0,0);
}

function toggleAdminSubCategory() {
    const cat = document.getElementById('pCategory').value;
    const subContainer = document.getElementById('adminSubCatContainer');
    if (cat === 'computeraccessories') {
        subContainer.classList.remove('hidden');
    } else {
        subContainer.classList.add('hidden');
    }
}

function fetchData() {
    db.collection("orders").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        allOrders = [];
        snapshot.forEach(doc => allOrders.push({ docId: doc.id, ...doc.data() }));
        renderOrders(allOrders);
        updateStats();
    });

    db.collection("products").onSnapshot((snapshot) => {
        allProducts = [];
        snapshot.forEach(doc => allProducts.push({ docId: doc.id, ...doc.data() }));
        renderProductsGrid(allProducts);
        updateStats();
    });
}

function updateStats() {
    const totalRev = allOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const pending = allOrders.filter(o => o.status === 'pending').length;
    document.getElementById('statRevenue').innerText = `Rs. ${totalRev.toLocaleString()}`;
    document.getElementById('statOrders').innerText = allOrders.length;
    document.getElementById('statPending').innerText = pending;
    document.getElementById('statProducts').innerText = allProducts.length;
    document.getElementById('orderCountBadge').innerText = `${allOrders.length} Orders`;
}

// Fixed Product Add with Automatic ID and compression protection
function handleAddProduct(e) {
    e.preventDefault();
    const file = document.getElementById('pImageFile').files[0];
    if (!file) return;

    const saveBtn = document.getElementById('saveProdBtn');
    saveBtn.innerText = "Uploading & Saving...";
    saveBtn.disabled = true;

    const category = document.getElementById('pCategory').value;
    const subCategory = (category === 'computeraccessories') ? document.getElementById('pSubCategory').value : '';
    const rawIdInput = document.getElementById('pId').value;
    const productId = rawIdInput ? Number(rawIdInput) : Date.now(); // Auto generate unique numeric ID if empty

    const reader = new FileReader();
    reader.onload = function(evt) {
        const newProd = {
            id: productId,
            name: document.getElementById('pName').value.trim(),
            price: Number(document.getElementById('pPrice').value),
            category: category,
            subCategory: subCategory,
            stock: Number(document.getElementById('pStock').value),
            image: evt.target.result,
            description: document.getElementById('pDesc').value.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection("products").add(newProd).then(() => {
            alert("⚡ Product added successfully!");
            document.getElementById('addProductForm').reset();
            document.getElementById('adminSubCatContainer').classList.add('hidden');
            saveBtn.innerText = "Save Product to Firestore";
            saveBtn.disabled = false;
            switchTab('products');
        }).catch((err) => {
            alert("❌ Error adding product: " + err.message);
            saveBtn.innerText = "Save Product to Firestore";
            saveBtn.disabled = false;
        });
    };
    reader.readAsDataURL(file);
}

function deleteProduct(event, docId) {
    event.stopPropagation();
    if(confirm("Delete item?")) {
        db.collection("products").doc(docId).delete().catch(err => alert("Error deleting: " + err.message));
    }
}

function openProductModal(docId) {
    const p = allProducts.find(item => item.docId === docId);
    if(!p) return;

    document.getElementById('editDocId').value = p.docId;
    document.getElementById('editName').value = p.name || '';
    document.getElementById('editPrice').value = p.price || 0;
    document.getElementById('editStock').value = p.stock || 0;
    document.getElementById('editCategory').value = p.category || 'watches';
    document.getElementById('editDesc').value = p.description || '';
    document.getElementById('editImagePreview').src = p.image || '';

    const matchedOrders = allOrders.filter(o => (o.items || []).some(i => i.id === p.id || i.name === p.name));
    const ordContainer = document.getElementById('productOrdersList');
    ordContainer.innerHTML = '';

    if(matchedOrders.length === 0) {
        ordContainer.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">No orders for this product yet.</p>`;
    } else {
        matchedOrders.forEach(o => {
            const c = o.customerInfo || {};
            ordContainer.insertAdjacentHTML('beforeend', `
                <div onclick="openOrderModal('${o.docId}')" class="bg-white p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 space-y-1">
                    <div class="flex justify-between font-bold text-slate-900">
                        <span>${o.orderId}</span>
                        <span class="text-emerald-600">Rs. ${(o.totalAmount || 0).toLocaleString()}</span>
                    </div>
                    <p class="text-[11px] text-slate-600"><strong>Customer:</strong> ${c.name || 'N/A'} (${c.phone || 'N/A'})</p>
                </div>
            `);
        });
    }
    document.getElementById('productDetailModal').classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('productDetailModal').classList.add('hidden');
}

function handleUpdateProduct(e) {
    e.preventDefault();
    const docId = document.getElementById('editDocId').value;
    const updatedData = {
        name: document.getElementById('editName').value.trim(),
        price: Number(document.getElementById('editPrice').value),
        stock: Number(document.getElementById('editStock').value),
        category: document.getElementById('editCategory').value,
        description: document.getElementById('editDesc').value.trim()
    };

    db.collection("products").doc(docId).update(updatedData).then(() => {
        alert("⚡ Product updated successfully!");
        closeProductModal();
    });
}

function openOrderModal(docId) {
    const o = allOrders.find(item => item.docId === docId);
    if(!o) return;
    const c = o.customerInfo || {};

    document.getElementById('modalOrderIdTitle').innerText = `Order: ${o.orderId || 'N/A'}`;
    document.getElementById('mCustName').innerText = c.name || 'N/A';
    document.getElementById('mCustPhone').innerText = c.phone || 'N/A';
    document.getElementById('mCustWhatsapp').innerText = c.whatsapp || 'N/A';
    document.getElementById('mCustCity').innerText = c.city || 'N/A';
    document.getElementById('mCustArea').innerText = c.area || 'N/A';
    document.getElementById('mCustAddress').innerText = c.address || 'N/A';
    document.getElementById('mCustLandmark').innerText = c.landmark || 'None';
    document.getElementById('mOrderTotal').innerText = `Rs. ${(o.totalAmount || 0).toLocaleString()}`;

    const itemsContainer = document.getElementById('mOrderItemsList');
    itemsContainer.innerHTML = '';
    (o.items || []).forEach(i => {
        itemsContainer.insertAdjacentHTML('beforeend', `
            <div class="flex justify-between py-1.5">
                <span>${i.name} (x${i.qty})</span>
                <span class="font-bold">Rs. ${(i.price * i.qty).toLocaleString()}</span>
            </div>
        `);
    });
    document.getElementById('orderDetailModal').classList.remove('hidden');
}

function closeOrderModal() {
    document.getElementById('orderDetailModal').classList.add('hidden');
}

function renderOrders(orders) {
    const container = document.getElementById('ordersList');
    container.innerHTML = '';
    if(orders.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">No orders found</p>`;
        return;
    }

    orders.forEach(o => {
        const c = o.customerInfo || {};
        const itemsList = (o.items || []).map(i => `${i.name} (x${i.qty})`).join(', ');

        container.insertAdjacentHTML('beforeend', `
            <div onclick="openOrderModal('${o.docId}')" class="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs cursor-pointer hover:bg-slate-100/80 transition">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-slate-900">${o.orderId || 'N/A'}</span>
                    <span class="font-bold text-emerald-600">Rs. ${(o.totalAmount || 0).toLocaleString()}</span>
                </div>
                <div class="text-[11px] text-slate-600 space-y-0.5">
                    <p><strong>Customer:</strong> ${c.name || 'N/A'} (${c.phone || 'N/A'})</p>
                    <p><strong>Address:</strong> ${c.address || 'N/A'}, ${c.city || 'N/A'}</p>
                    <p><strong>Items:</strong> ${itemsList}</p>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-slate-200/60" onclick="event.stopPropagation()">
                    <span class="text-[10px] text-slate-400">${o.createdAt ? new Date(o.createdAt.toDate ? o.createdAt.toDate() : o.createdAt).toLocaleString() : ''}</span>
                    <select onchange="updateOrderStatus('${o.docId}', this.value)" class="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 focus:outline-none">
                        <option value="pending" ${o.status==='pending'?'selected':''}>Pending</option>
                        <option value="processing" ${o.status==='processing'?'selected':''}>Processing</option>
                        <option value="shipped" ${o.status==='shipped'?'selected':''}>Shipped</option>
                        <option value="delivered" ${o.status==='delivered'?'selected':''}>Delivered</option>
                    </select>
                </div>
            </div>
        `);
    });
    lucide.createIcons();
}

function updateOrderStatus(docId, newStatus) {
    db.collection("orders").doc(docId).update({ status: newStatus });
}

function renderProductsGrid(prods) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';
    if(prods.length === 0) {
        grid.innerHTML = `<p class="text-xs text-slate-400 text-center py-6 col-span-2">No products added yet</p>`;
        return;
    }

    prods.forEach(p => {
        grid.insertAdjacentHTML('beforeend', `
            <div onclick="openProductModal('${p.docId}')" class="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-1.5 relative group cursor-pointer hover:bg-slate-100 transition">
                <div class="w-full aspect-square rounded-xl overflow-hidden bg-slate-200">
                    <img src="${p.image}" class="w-full h-full object-cover">
                </div>
                <h4 class="text-xs font-bold text-slate-800 truncate">${p.name}</h4>
                <div class="flex justify-between items-center">
                    <span class="text-xs font-semibold text-slate-900">Rs. ${(p.price || 0).toLocaleString()}</span>
                    <button onclick="deleteProduct(event, '${p.docId}')" class="p-1 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>
            </div>
        `);
    });
    lucide.createIcons();
}
