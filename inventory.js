const collections = {
  amigurumi: ['Amigurumi', 'amigurumi círculo'],
  'amigurumi-brilho': ['Amigurumi Brilho', 'amigurumi brilho círculo'],
  'amigurumi-slim': ['Amigurumi Slim', 'amigurumi slim círculo'],
  barroco: ['Barroco', 'Barroco Maxcolor N.6 Círculo'],
  anne: ['Anne', 'anne círculo'],
  clea: ['Clea', 'clea círculo'],
  'clea-duplo': ['Clea Duplo', 'clea duplo círculo'],
  charme: ['Charme', 'charme círculo'],
  encanto: ['Encanto', 'encanto círculo'],
  'encanto-slim': ['Encanto Slim', 'encanto slim círculo']
};

const byId = id => document.getElementById(id);
const inventory = byId('inventory');
const statusMessage = byId('status');
const searchInput = byId('inventory-search');
const searchMessage = byId('search-message');
const sort = byId('sort');
const account = byId('account');
const loginDialog = byId('login-dialog');
const loginForm = byId('login-form');
const stockDialog = byId('stock-dialog');
const stockForm = byId('stock-form');
const quantityInput = stockForm.elements.quantity;
const stockMessage = byId('stock-message');
const numberFormat = new Intl.NumberFormat('pt-PT', { maximumSignificantDigits: 16 });
const { url, publishableKey } = window.yarnInventoryConfig ?? {};
const configured = Boolean(url || publishableKey);
const database = url && publishableKey && window.supabase
  ? window.supabase.createClient(url, publishableKey)
  : null;

let collection;
let items = [];
let loadSequence = 0;
let sorted = false;
let session;
let editing;

const tabs = Object.entries(collections).map(([key, [label]]) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', () => loadCollection(key));
  byId('collections').append(button);
  return { key, label, button };
});

function canEdit() {
  return session?.user.app_metadata?.yarn_inventory_owner === true;
}

function updateTabs() {
  const available = items.filter(item => item.stock > 0).length;
  for (const tab of tabs) {
    const active = tab.key === collection;
    tab.button.setAttribute('aria-pressed', String(active));
    tab.button.textContent = active && items.length
      ? `${tab.label} (${available}/${items.length})`
      : tab.label;
  }
}

function catalogImage(key, path) {
  const filename = path.split('/').pop();
  if (key === 'amigurumi-slim' && filename === '8001 - BRANCO.png') {
    return `images/amigurumi/${filename}`;
  }
  return `images/${key}/${filename}`;
}

async function readCollection(key) {
  if (configured) {
    if (!database) throw new Error('Supabase indisponível ou configuração incompleta.');
    const { data, error } = await database.from('yarn_inventory')
      .select('collection, position, name, color_code, image, stock')
      .eq('collection', key)
      .order('position');
    if (error) throw error;
    return data;
  }

  const response = await fetch(`./${key}.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return data.map(item => ({
    ...item,
    color_code: item.colorCode,
    image: catalogImage(key, item.image)
  }));
}

async function loadCollection(key, message = '') {
  const sequence = ++loadSequence;
  collection = key;
  items = [];
  statusMessage.textContent = 'A carregar o stock…';
  updateTabs();
  render();

  try {
    const data = await readCollection(key);
    if (sequence !== loadSequence) return;
    items = data;
    statusMessage.textContent = message || (data.length ? '' : 'Esta linha ainda não tem cores na base de dados.');
    updateTabs();
    render();
  } catch (error) {
    if (sequence !== loadSequence) return;
    console.error(error);
    statusMessage.textContent = 'Não foi possível carregar o stock. Seleciona a linha para tentar novamente.';
  }
}

function normalizeSearch(value) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function render() {
  const query = normalizeSearch(searchInput.value);
  const visibleItems = query
    ? items.filter(item =>
        normalizeSearch(item.name).includes(query)
        || normalizeSearch(String(item.color_code ?? '')).includes(query))
    : [...items];
  if (sorted) visibleItems.sort((a, b) => b.stock - a.stock);

  sort.disabled = !visibleItems.length;
  searchMessage.textContent = query && items.length && !visibleItems.length
    ? 'Nenhuma cor encontrada nesta linha.'
    : '';
  inventory.replaceChildren();

  for (const item of visibleItems) {
    const card = document.createElement('article');
    card.className = 'yarn-card';
    card.classList.toggle('no-stock', Number(item.stock) === 0);

    const image = document.createElement('img');
    image.src = './' + item.image.split('/').map(encodeURIComponent).join('/');
    image.alt = item.name;
    image.loading = 'lazy';
    const name = document.createElement('div');
    name.textContent = item.name;
    const stock = document.createElement('div');
    stock.className = 'stock';
    stock.textContent = `Stock: ${numberFormat.format(item.stock)}`;
    card.append(image, name, stock);

    if (item.color_code) {
      const search = new URL('https://www.ateliedecroche.pt/search');
      search.searchParams.set('q', `${collections[collection][1]} ${item.color_code}`);
      const link = document.createElement('a');
      link.href = search.href;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Ver na loja';
      card.append(link);
    }

    if (canEdit()) {
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = 'Editar stock';
      edit.setAttribute('aria-label', `Editar stock de ${item.name}`);
      edit.addEventListener('click', () => {
        editing = item;
        byId('stock-title').textContent = item.name;
        quantityInput.value = String(item.stock).replace('.', ',');
        stockMessage.textContent = '';
        stockDialog.showModal();
        quantityInput.select();
      });
      card.append(edit);
    }

    inventory.append(card);
  }
}

searchInput.addEventListener('input', render);

sort.addEventListener('click', () => {
  sorted = !sorted;
  sort.setAttribute('aria-pressed', String(sorted));
  render();
});

for (const dialog of [loginDialog, stockDialog]) {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', event => {
    if (dialog.querySelector('[type="submit"]').disabled) event.preventDefault();
  });
}

function setBusy(form, busy) {
  for (const field of form.elements) field.disabled = busy;
}

if (database) {
  account.hidden = false;
  database.auth.onAuthStateChange((_event, nextSession) => {
    const wasEditor = canEdit();
    session = nextSession;
    account.textContent = session ? 'Sair' : 'Entrar para editar';
    if (wasEditor !== canEdit()) render();
  });
}

account.addEventListener('click', async () => {
  if (!session) {
    byId('login-message').textContent = '';
    loginDialog.showModal();
    return;
  }

  account.disabled = true;
  try {
    const { error } = await database.auth.signOut({ scope: 'local' });
    if (error) throw error;
    statusMessage.textContent = '';
  } catch (error) {
    console.error(error);
    statusMessage.textContent = 'Não foi possível terminar a sessão. Tenta novamente.';
  } finally {
    account.disabled = false;
  }
});

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const message = byId('login-message');
  const form = new FormData(loginForm);
  setBusy(loginForm, true);
  message.textContent = 'A iniciar sessão…';

  try {
    const { error } = await database.auth.signInWithPassword({
      email: form.get('email').trim(),
      password: form.get('password')
    });
    if (error) throw error;
    loginForm.reset();
    loginDialog.close();
    statusMessage.textContent = canEdit() ? '' : 'Esta conta não tem permissão para editar o stock.';
  } catch (error) {
    console.error(error);
    message.textContent = 'Não foi possível entrar. Confirma os dados e tenta novamente.';
  } finally {
    setBusy(loginForm, false);
  }
});

stockForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!canEdit()) {
    stockMessage.textContent = 'Volta a iniciar sessão para editar o stock.';
    return;
  }

  const quantity = quantityInput.value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(quantity) || !Number.isFinite(Number(quantity))) {
    stockMessage.textContent = 'Introduz uma quantidade igual ou superior a zero, por exemplo 1,5.';
    return;
  }

  const item = editing;
  setBusy(stockForm, true);
  stockMessage.textContent = 'A guardar…';

  try {
    const { data, error } = await database.from('yarn_inventory')
      .update({ stock: quantity })
      .eq('collection', item.collection)
      .eq('position', item.position)
      .eq('stock', item.stock)
      .select('stock')
      .maybeSingle();
    if (error) throw error;

    stockDialog.close();
    if (!data) {
      await loadCollection(collection, 'O stock foi atualizado noutro dispositivo ou a edição deixou de estar disponível. Verifica o valor antes de voltar a editar.');
      return;
    }

    item.stock = data.stock;
    updateTabs();
    render();
    statusMessage.textContent = `Stock guardado: ${item.name} (${numberFormat.format(item.stock)}).`;
  } catch (error) {
    console.error(error);
    stockMessage.textContent = 'Não foi possível confirmar a gravação. Tenta novamente.';
  } finally {
    setBusy(stockForm, false);
  }
});

loadCollection('amigurumi');
