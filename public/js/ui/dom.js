// Kleine DOM-hulpjes: elementen maken, meldingen en dialoogvensters.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv;
      }
    }
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

export function toast(msg, kind = 'info', ms = 3200) {
  const box = document.getElementById('toasts');
  const t = h('div', { class: `toast toast-${kind}`, role: 'status' }, msg);
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
  while (box.children.length > 3) box.firstChild.remove();
}

export function modal({ title, body, buttons }) {
  const root = document.getElementById('modal');
  root.innerHTML = '';
  const close = () => { root.classList.remove('open'); root.innerHTML = ''; };
  const card = h('div', { class: 'card modal-card', role: 'dialog', 'aria-modal': 'true' },
    title ? h('h2', {}, title) : null,
    typeof body === 'string' ? h('p', {}, body) : body,
    h('div', { class: 'modal-buttons' }, buttons.map((b) => h('button', {
      class: `btn ${b.cls || ''}`,
      onclick: () => { if (!b.keepOpen) close(); if (b.onClick) b.onClick(); },
    }, b.label))));
  root.appendChild(h('div', { class: 'modal-backdrop', onclick: close }));
  root.appendChild(card);
  root.classList.add('open');
  return close;
}

export function isModalOpen() {
  return document.getElementById('modal').classList.contains('open');
}
