/* ============================================
   Галактические Пельмени — логика корзины, drawer, параллакс
   ============================================ */
(() => {
  'use strict';

  /* ---------- Мини-корзина ---------- */
  const cart = new Map(); // id -> {name, price, qty}

  const els = {
    badge: document.getElementById('cartBadge'),
    drawer: document.getElementById('cartDrawer'),
    backdrop: document.getElementById('drawerBackdrop'),
    openBtn: document.getElementById('cartTrigger'),
    closeBtn: document.getElementById('drawerClose'),
    list: document.getElementById('cartList'),
    empty: document.getElementById('cartEmpty'),
    total: document.getElementById('cartTotal'),
    checkout: document.getElementById('checkoutBtn'),
    form: document.getElementById('orderForm'),
    toast: document.getElementById('toast'),
  };

  function fmt(n) {
    return n.toLocaleString('ru-RU') + ' Br';
  }

  function updateCartUI() {
    let count = 0;
    let sum = 0;
    els.list.innerHTML = '';

    for (const [id, item] of cart) {
      count += item.qty;
      sum += item.qty * item.price;

      const li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML = `
        <div>
          <div class="cart-item__name">${item.name}</div>
          <div class="cart-item__price">${fmt(item.price)} / шт</div>
        </div>
        <div class="qty">
          <button data-act="dec" data-id="${id}" aria-label="Меньше">−</button>
          <span>${item.qty}</span>
          <button data-act="inc" data-id="${id}" aria-label="Больше">+</button>
        </div>
        <button class="cart-item__remove" data-act="del" data-id="${id}" aria-label="Удалить">✕</button>
      `;
      els.list.appendChild(li);
    }

    els.badge.hidden = count === 0;
    els.badge.textContent = count;
    els.total.textContent = fmt(sum);
    els.empty.hidden = count > 0;
    els.checkout.disabled = count === 0;
  }

  function addToCart({ id, name, price }) {
    const existing = cart.get(id);
    if (existing) existing.qty += 1;
    else cart.set(id, { name, price, qty: 1 });
    updateCartUI();
    saveCart();
  }

  document.querySelectorAll('.btn-add').forEach((btn) => {
    btn.addEventListener('click', () => {
      addToCart({
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: Number(btn.dataset.price),
      });
      btn.classList.remove('added');
      void btn.offsetWidth; // рестарт анимации
      btn.classList.add('added');
      showToast(`${btn.dataset.name} — в корзине 🛸`);
    });
  });

  // Делегирование кнопок +/-/удалить внутри списка
  els.list.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const item = cart.get(btn.dataset.id);
    if (!item) return;

    if (btn.dataset.act === 'inc') item.qty += 1;
    if (btn.dataset.act === 'dec') item.qty -= 1;
    if (btn.dataset.act === 'del' || item.qty <= 0) cart.delete(btn.dataset.id);

    updateCartUI();
    saveCart();
  });

  /* ---------- Сохранение корзины между сессиями ---------- */
  function saveCart() {
    try {
      localStorage.setItem('gp-cart', JSON.stringify([...cart.entries()]));
    } catch (_) { /* приватный режим — игнорируем */ }
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem('gp-cart');
      if (!raw) return;
      for (const [id, item] of JSON.parse(raw)) cart.set(id, item);
      updateCartUI();
    } catch (_) { /* повреждённые данные — начинаем с чистой корзины */ }
  }

  /* ---------- Выезжающая панель корзины ---------- */
  function openDrawer() {
    els.backdrop.hidden = false;
    requestAnimationFrame(() => {
      els.backdrop.classList.add('is-open');
      els.drawer.classList.add('is-open');
    });
    els.drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    els.backdrop.classList.remove('is-open');
    els.drawer.classList.remove('is-open');
    els.drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => { els.backdrop.hidden = true; }, 380);
  }

  els.openBtn.addEventListener('click', openDrawer);
  els.closeBtn.addEventListener('click', closeDrawer);
  els.backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.drawer.classList.contains('is-open')) closeDrawer();
  });

  /* ---------- Оформление заказа ---------- */
  els.form.addEventListener('submit', (e) => e.preventDefault());

  els.checkout.addEventListener('click', () => {
    let valid = true;
    els.form.querySelectorAll('input[required]').forEach((input) => {
      const ok = input.value.trim().length >= 2 &&
        (input.type !== 'tel' || input.value.replace(/\D/g, '').length >= 9);
      input.classList.toggle('invalid', !ok);
      if (!ok) valid = false;
    });

    if (!valid) {
      showToast('Проверь имя, телефон и адрес — сигнал теряет тебя в космосе 📡');
      return;
    }

    // Здесь позже подключается отправка на сервер / в Telegram-бот
    const data = Object.fromEntries(new FormData(els.form).entries());
    console.log('Заказ:', { ...data, items: [...cart.values()], total: [...cart.values()].reduce((s, i) => s + i.qty * i.price, 0) });

    cart.clear();
    updateCartUI();
    saveCart();
    els.form.reset();
    closeDrawer();
    showToast('Заказ принят! Пельменная ракета уже в пути 🚀');
  });

  // Убираем подсветку ошибки при вводе
  els.form.addEventListener('input', (e) => {
    if (e.target.matches('input')) e.target.classList.remove('invalid');
  });

  /* ---------- Toast ---------- */
  let toastTimer;
  function showToast(text) {
    els.toast.textContent = text;
    els.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('is-visible'), 2600);
  }

  /* ---------- Параллакс звёзд (лёгкий, только если нет prefers-reduced-motion) ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    const layers = document.querySelectorAll('.stars');
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        layers.forEach((layer) => {
          const speed = parseFloat(layer.dataset.parallax || '0.2');
          layer.style.transform = `translate3d(0, ${y * speed}px, 0)`;
        });
        ticking = false;
      });
    }, { passive: true });
  }

  loadCart();
})();
