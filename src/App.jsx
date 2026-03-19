import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'budget-app-data-v1'
const DEFAULT_ACCOUNTS = [
  { id: 'budget_ca', label: 'Budget Canada', devise: 'CAD', flag: '🍁' },
  { id: 'epargne_ca', label: 'Épargne Canada', devise: 'CAD', flag: '🍁' },
  { id: 'joint_fr', label: 'Compte joint FR', devise: 'EUR', flag: '🇫🇷' },
  { id: 'livret_fr', label: 'Livret A', devise: 'EUR', flag: '🇫🇷' },
]
const DEFAULT_OPENINGS = { budget_ca: 2100, epargne_ca: 15000, joint_fr: 2000, livret_fr: 8000 }
const DEFAULT_FIXES = [
  { id: 1, nom: 'Loyer / Hypothèque', montant: 1500 },
  { id: 2, nom: 'Téléphones', montant: 90 },
  { id: 3, nom: 'Assurances', montant: 100 },
  { id: 4, nom: 'Abonnements', montant: 30 },
  { id: 5, nom: 'Chat', montant: 60 },
]
const DEFAULT_DATA = {
  comptes: DEFAULT_ACCOUNTS,
  ouvertures: DEFAULT_OPENINGS,
  depenses: [],
  revenus: [],
  virements: [],
  fixes: DEFAULT_FIXES,
  taux: 1.46,
}
const CATEGORIES = [
  'Alimentation',
  'Restaurants',
  'Transport',
  'Santé',
  'Vêtements',
  'Loisirs',
  'Voyages',
  'Sport',
  'Cadeaux',
  'Hygiène',
  'Culture',
  'Divers',
]
const TABS = [
  { key: 'accueil', icon: '⌂', label: 'Accueil' },
  { key: 'depense', icon: '－', label: 'Dépense' },
  { key: 'argent', icon: '+', label: 'Argent' },
  { key: 'reglages', icon: '⚙', label: 'Réglages' },
]

const pageStyles = {
  app: {
    minHeight: '100vh',
    background: '#F0F2F5',
    color: '#10202D',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    display: 'flex',
    justifyContent: 'center',
    padding: '0 12px',
  },
  shell: {
    width: '100%',
    maxWidth: 430,
    paddingBottom: 92,
    position: 'relative',
  },
  section: {
    padding: '18px 0 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    background: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 8px 24px rgba(13, 27, 42, 0.06)',
  },
  hero: {
    background: '#0D1B2A',
    color: '#FFFFFF',
    borderRadius: 24,
    padding: '22px 20px',
    boxShadow: '0 16px 32px rgba(13, 27, 42, 0.24)',
  },
  input: {
    width: '100%',
    borderRadius: 10,
    border: '1.5px solid #E8E8E8',
    padding: '12px 14px',
    fontSize: 15,
    outlineColor: '#0F7A5A',
    boxSizing: 'border-box',
    background: '#FFFFFF',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontSize: 13,
    color: '#4B5B68',
    fontWeight: 600,
  },
  button: {
    border: 'none',
    borderRadius: 12,
    background: '#0D1B2A',
    color: '#FFFFFF',
    padding: '13px 16px',
    fontWeight: 700,
    fontSize: 15,
  },
}

const formatters = {
  CAD: new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }),
  EUR: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
}

function formatMoney(value, currency = 'CAD') {
  const formatter = formatters[currency] ?? formatters.CAD
  return formatter.format(Math.round(Number(value || 0)))
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isCurrentMonth(value) {
  if (!value) return false
  const date = new Date(`${value}T00:00:00`)
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

function getMonthName() {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date())
}

function loadData() {
  if (typeof window === 'undefined') return DEFAULT_DATA
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_DATA
  try {
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_DATA,
      ...parsed,
      comptes: parsed.comptes?.length ? parsed.comptes : DEFAULT_ACCOUNTS,
      ouvertures: { ...DEFAULT_OPENINGS, ...(parsed.ouvertures || {}) },
      fixes: parsed.fixes?.length ? parsed.fixes : DEFAULT_FIXES,
      depenses: parsed.depenses || [],
      revenus: parsed.revenus || [],
      virements: parsed.virements || [],
      taux: Number(parsed.taux) || DEFAULT_DATA.taux,
    }
  } catch {
    return DEFAULT_DATA
  }
}

function convertAmount(amount, fromCurrency, toCurrency, rate) {
  const numeric = Number(amount || 0)
  if (fromCurrency === toCurrency) return numeric
  if (fromCurrency === 'EUR' && toCurrency === 'CAD') return numeric * rate
  if (fromCurrency === 'CAD' && toCurrency === 'EUR') return numeric / rate
  return numeric
}

function computeBalances(data) {
  return data.comptes.reduce((acc, account) => {
    const revenusTotal = data.revenus
      .filter((item) => item.compte === account.id)
      .reduce((sum, item) => sum + Number(item.montantNatif || 0), 0)
    const transferIn = data.virements
      .filter((item) => item.dest === account.id)
      .reduce((sum, item) => sum + Number(item.montant || 0), 0)
    const transferOut = data.virements
      .filter((item) => item.source === account.id)
      .reduce((sum, item) => sum + Number(item.montant || 0), 0)
    const expenses = data.depenses
      .filter((item) => item.compte === account.id)
      .reduce((sum, item) => sum + Number(item.montant || 0), 0)
    acc[account.id] = Number(data.ouvertures[account.id] || 0) + revenusTotal + transferIn - transferOut - expenses
    return acc
  }, {})
}

function Toasts({ items }) {
  return (
    <div style={{ position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 398, zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((toast) => (
        <div key={toast.id} style={{ background: toast.type === 'success' ? '#0F7A5A' : '#0D1B2A', color: '#FFFFFF', padding: '12px 14px', borderRadius: 12, boxShadow: '0 10px 24px rgba(13,27,42,0.18)' }}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}

function BottomSheet({ expense, accountLabel, onClose, onDelete }) {
  if (!expense) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13, 27, 42, 0.38)', zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: 430, background: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '18px 18px 28px', boxSizing: 'border-box' }}>
        <div style={{ width: 48, height: 5, borderRadius: 999, background: '#D5DCE3', margin: '0 auto 18px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: '#667988', fontWeight: 700, textTransform: 'uppercase' }}>Détail de la dépense</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{expense.desc}</div>
          <div style={{ color: '#4B5B68' }}>{expense.date}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: '#4B5B68' }}>Catégorie</span>
            <strong>{expense.cat || 'Non définie'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: '#4B5B68' }}>Compte</span>
            <strong>{accountLabel}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: '#4B5B68' }}>Montant</span>
            <strong style={{ color: '#A32D2D' }}>{formatMoney(expense.montant, 'CAD')}</strong>
          </div>
        </div>
        <button onClick={() => onDelete(expense.id)} style={{ ...pageStyles.button, width: '100%', marginTop: 20, background: '#A32D2D' }}>Supprimer la dépense</button>
      </div>
    </div>
  )
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{ background: '#E6EBEF', borderRadius: 14, padding: 4, display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 4 }}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button key={option.value} onClick={() => onChange(option.value)} style={{ border: 'none', borderRadius: 10, padding: '10px 8px', background: active ? '#FFFFFF' : 'transparent', color: active ? '#0F7A5A' : '#516471', fontWeight: 700, fontSize: 13, boxShadow: active ? '0 4px 14px rgba(13,27,42,0.08)' : 'none' }}>
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default function App() {
  const [data, setData] = useState(loadData)
  const [tab, setTab] = useState('accueil')
  const [moneyMode, setMoneyMode] = useState('revenu')
  const [settingsMode, setSettingsMode] = useState('comptes')
  const [toasts, setToasts] = useState([])
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [expenseForm, setExpenseForm] = useState({ date: isoToday(), desc: '', cat: '', montant: '', compte: DEFAULT_ACCOUNTS[0].id })
  const [incomeForm, setIncomeForm] = useState({ date: isoToday(), desc: '', montant: '', devise: 'CAD', taux: DEFAULT_DATA.taux, compte: DEFAULT_ACCOUNTS[0].id })
  const [transferForm, setTransferForm] = useState({ date: isoToday(), desc: '', source: DEFAULT_ACCOUNTS[0].id, dest: DEFAULT_ACCOUNTS[1].id, montant: '' })
  const [accountDraft, setAccountDraft] = useState({ comptes: data.comptes, ouvertures: data.ouvertures })
  const [newAccount, setNewAccount] = useState({ flag: '🏦', label: '', devise: 'CAD' })
  const [fixedDraft, setFixedDraft] = useState(data.fixes)
  const [rateDraft, setRateDraft] = useState(data.taux)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setAccountDraft({ comptes: data.comptes, ouvertures: data.ouvertures })
    setFixedDraft(data.fixes)
    setRateDraft(data.taux)
    setExpenseForm((current) => ({ ...current, compte: data.comptes[0]?.id || '' }))
    setIncomeForm((current) => ({ ...current, compte: current.compte && data.comptes.some((item) => item.id === current.compte) ? current.compte : data.comptes[0]?.id || '' }))
    setTransferForm((current) => ({
      ...current,
      source: current.source && data.comptes.some((item) => item.id === current.source) ? current.source : data.comptes[0]?.id || '',
      dest: current.dest && data.comptes.some((item) => item.id === current.dest) ? current.dest : data.comptes[1]?.id || data.comptes[0]?.id || '',
    }))
  }, [data])

  const pushToast = (message, type = 'success') => {
    const id = uid('toast')
    setToasts((current) => [...current, { id, message, type }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 2200)
  }

  const balances = useMemo(() => computeBalances(data), [data])
  const budgetAccountId = data.comptes.find((item) => item.id === 'budget_ca')?.id || data.comptes[0]?.id || ''
  const budgetAccount = data.comptes.find((item) => item.id === budgetAccountId)
  const currentMonthExpenses = data.depenses.filter((item) => isCurrentMonth(item.date))
  const variableBudgetMonth = currentMonthExpenses.filter((item) => item.compte === budgetAccountId).reduce((sum, item) => sum + Number(item.montant || 0), 0)
  const currentMonthReceived = data.virements.filter((item) => item.dest === budgetAccountId && isCurrentMonth(item.date)).reduce((sum, item) => sum + Number(item.montant || 0), 0)
  const monthlyFixed = data.fixes.reduce((sum, item) => sum + Number(item.montant || 0), 0)
  const monthlyBalance = currentMonthReceived - monthlyFixed - variableBudgetMonth
  const categoryTotals = CATEGORIES.map((cat) => ({ cat, total: currentMonthExpenses.filter((item) => item.cat === cat).reduce((sum, item) => sum + Number(item.montant || 0), 0) })).filter((item) => item.total > 0)
  const lastExpenses = [...data.depenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  const totalCAD = data.comptes.filter((item) => item.devise === 'CAD').reduce((sum, item) => sum + (balances[item.id] || 0), 0)
  const totalEUR = data.comptes.filter((item) => item.devise === 'EUR').reduce((sum, item) => sum + (balances[item.id] || 0), 0)
  const patrimoineCAD = totalCAD + totalEUR * Number(data.taux || 0)
  const patrimoineEUR = data.taux ? patrimoineCAD / Number(data.taux) : 0
  const selectedAccountLabel = data.comptes.find((item) => item.id === selectedExpense?.compte)?.label
  const incomePreviewCad = incomeForm.devise === 'EUR' ? Number(incomeForm.montant || 0) * Number(incomeForm.taux || data.taux || 0) : Number(incomeForm.montant || 0)

  const saveExpense = (event) => {
    event.preventDefault()
    if (!expenseForm.desc.trim() || !expenseForm.montant || !expenseForm.compte) return
    setData((current) => ({
      ...current,
      depenses: [{ ...expenseForm, id: uid('depense'), montant: Number(expenseForm.montant) }, ...current.depenses],
    }))
    setExpenseForm({ date: isoToday(), desc: '', cat: '', montant: '', compte: data.comptes[0]?.id || '' })
    pushToast('Dépense enregistrée')
    setTab('accueil')
  }

  const saveIncome = (event) => {
    event.preventDefault()
    if (!incomeForm.desc.trim() || !incomeForm.montant || !incomeForm.compte) return
    const account = data.comptes.find((item) => item.id === incomeForm.compte)
    const nativeAmount = convertAmount(incomeForm.montant, incomeForm.devise, account?.devise || incomeForm.devise, Number(incomeForm.taux || data.taux || 1))
    const cadAmount = convertAmount(incomeForm.montant, incomeForm.devise, 'CAD', Number(incomeForm.taux || data.taux || 1))
    setData((current) => ({
      ...current,
      revenus: [{
        id: uid('revenu'),
        date: incomeForm.date,
        desc: incomeForm.desc,
        montant: cadAmount,
        montantNatif: nativeAmount,
        devise: incomeForm.devise,
        taux: Number(incomeForm.taux || data.taux),
        compte: incomeForm.compte,
      }, ...current.revenus],
    }))
    setIncomeForm({ date: isoToday(), desc: '', montant: '', devise: 'CAD', taux: data.taux, compte: data.comptes[0]?.id || '' })
    pushToast('Revenu enregistré')
    setTab('accueil')
  }

  const saveTransfer = (event) => {
    event.preventDefault()
    if (!transferForm.source || !transferForm.dest || transferForm.source === transferForm.dest || !transferForm.montant) return
    setData((current) => ({
      ...current,
      virements: [{ ...transferForm, id: uid('virement'), montant: Number(transferForm.montant) }, ...current.virements],
    }))
    setTransferForm({ date: isoToday(), desc: '', source: data.comptes[0]?.id || '', dest: data.comptes[1]?.id || data.comptes[0]?.id || '', montant: '' })
    pushToast('Virement enregistré')
    setTab('accueil')
  }

  const deleteExpense = (expenseId) => {
    setData((current) => ({ ...current, depenses: current.depenses.filter((item) => item.id !== expenseId) }))
    setSelectedExpense(null)
    pushToast('Dépense supprimée')
  }

  const saveAccounts = () => {
    setData((current) => ({ ...current, comptes: accountDraft.comptes, ouvertures: accountDraft.ouvertures }))
    pushToast('Comptes mis à jour')
  }

  const addAccount = () => {
    if (!newAccount.label.trim()) return
    const account = { id: uid('compte'), ...newAccount }
    setData((current) => ({
      ...current,
      comptes: [...current.comptes, account],
      ouvertures: { ...current.ouvertures, [account.id]: 0 },
    }))
    setNewAccount({ flag: '🏦', label: '', devise: 'CAD' })
    pushToast('Compte ajouté')
  }

  const deleteAccount = (accountId) => {
    if (data.comptes.length === 1) return
    setData((current) => {
      const nextAccounts = current.comptes.filter((item) => item.id !== accountId)
      const nextOpenings = { ...current.ouvertures }
      delete nextOpenings[accountId]
      return {
        ...current,
        comptes: nextAccounts,
        ouvertures: nextOpenings,
        depenses: current.depenses.filter((item) => item.compte !== accountId),
        revenus: current.revenus.filter((item) => item.compte !== accountId),
        virements: current.virements.filter((item) => item.source !== accountId && item.dest !== accountId),
      }
    })
    pushToast('Compte supprimé')
  }

  const saveFixed = () => {
    setData((current) => ({ ...current, fixes: fixedDraft.map((item) => ({ ...item, montant: Number(item.montant || 0) })) }))
    pushToast('Charges fixes enregistrées')
  }

  const saveRate = () => {
    setData((current) => ({ ...current, taux: Number(rateDraft || current.taux) }))
    pushToast('Taux enregistré')
  }

  return (
    <div style={pageStyles.app}>
      <Toasts items={toasts} />
      <BottomSheet expense={selectedExpense} accountLabel={selectedAccountLabel} onClose={() => setSelectedExpense(null)} onDelete={deleteExpense} />
      <div style={pageStyles.shell}>
        <main style={pageStyles.section}>
          {tab === 'accueil' && (
            <>
              <section style={pageStyles.hero}>
                <div style={{ fontSize: 14, opacity: 0.76 }}>Patrimoine total</div>
                <div style={{ fontSize: 36, fontWeight: 800, marginTop: 10 }}>{formatMoney(patrimoineCAD, 'CAD')}</div>
                <div style={{ marginTop: 8, color: '#D9E4EF' }}>{formatMoney(patrimoineEUR, 'EUR')}</div>
                <div style={{ marginTop: 18, textTransform: 'capitalize', fontWeight: 700 }}>{getMonthName()}</div>
              </section>

              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                {data.comptes.map((account) => (
                  <article key={account.id} style={{ ...pageStyles.card, padding: 14 }}>
                    <div style={{ fontSize: 24 }}>{account.flag}</div>
                    <div style={{ marginTop: 12, fontSize: 13, color: '#627381', minHeight: 32 }}>{account.label}</div>
                    <div style={{ marginTop: 8, fontWeight: 800, color: account.devise === 'EUR' ? '#854F0B' : '#0D1B2A' }}>
                      {formatMoney(balances[account.id], account.devise)}
                    </div>
                  </article>
                ))}
              </section>

              <section style={pageStyles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#627381', fontWeight: 700 }}>Solde ce mois</div>
                    <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: monthlyBalance >= 0 ? '#0F7A5A' : '#A32D2D' }}>
                      {formatMoney(monthlyBalance, budgetAccount?.devise || 'CAD')}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#627381', textAlign: 'right' }}>{budgetAccount?.label || 'Compte budget'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
                  {[
                    { label: 'Reçus', value: currentMonthReceived, color: '#0F7A5A' },
                    { label: 'Fixes', value: monthlyFixed, color: '#854F0B' },
                    { label: 'Variables', value: variableBudgetMonth, color: '#A32D2D' },
                  ].map((item) => (
                    <div key={item.label} style={{ background: '#F3F6F8', borderRadius: 999, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: '#627381' }}>{item.label}</div>
                      <div style={{ marginTop: 4, fontWeight: 800, color: item.color }}>{formatMoney(item.value, budgetAccount?.devise || 'CAD')}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section style={pageStyles.card}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>Dépenses par catégorie</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {categoryTotals.length === 0 ? (
                    <div style={{ color: '#627381' }}>Aucune dépense ce mois-ci.</div>
                  ) : categoryTotals.map((item) => (
                    <div key={item.cat} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>{item.cat}</span>
                      <strong style={{ color: '#A32D2D' }}>{formatMoney(item.total, 'CAD')}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section style={pageStyles.card}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>Dernières dépenses</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {lastExpenses.length === 0 ? (
                    <div style={{ color: '#627381' }}>Ajoutez une première dépense pour la voir ici.</div>
                  ) : lastExpenses.map((expense) => (
                    <button key={expense.id} onClick={() => setSelectedExpense(expense)} style={{ border: 'none', background: '#F6F8FA', borderRadius: 14, padding: '12px 14px', textAlign: 'left', display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{expense.desc}</div>
                        <div style={{ color: '#627381', fontSize: 13 }}>{expense.cat || 'Sans catégorie'} · {expense.date}</div>
                      </div>
                      <strong style={{ color: '#A32D2D' }}>{formatMoney(expense.montant, 'CAD')}</strong>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {tab === 'depense' && (
            <form onSubmit={saveExpense} style={{ ...pageStyles.card, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={{ margin: 0 }}>Ajouter une dépense</h2>
              <label style={pageStyles.label}>Date<input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm((current) => ({ ...current, date: event.target.value }))} style={pageStyles.input} /></label>
              <label style={pageStyles.label}>Description<input required value={expenseForm.desc} onChange={(event) => setExpenseForm((current) => ({ ...current, desc: event.target.value }))} style={pageStyles.input} placeholder="Ex. Épicerie" /></label>
              <label style={pageStyles.label}>Catégorie<select value={expenseForm.cat} onChange={(event) => setExpenseForm((current) => ({ ...current, cat: event.target.value }))} style={pageStyles.input}><option value="">Sélectionner</option>{CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label style={pageStyles.label}>Montant (CAD)<input required type="number" min="0" step="0.01" value={expenseForm.montant} onChange={(event) => setExpenseForm((current) => ({ ...current, montant: event.target.value }))} style={pageStyles.input} /></label>
              <label style={pageStyles.label}>Compte prélevé<select value={expenseForm.compte} onChange={(event) => setExpenseForm((current) => ({ ...current, compte: event.target.value }))} style={pageStyles.input}>{data.comptes.map((item) => <option key={item.id} value={item.id}>{item.flag} {item.label}</option>)}</select></label>
              <button type="submit" style={pageStyles.button}>Enregistrer</button>
            </form>
          )}

          {tab === 'argent' && (
            <section style={{ ...pageStyles.card, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={{ margin: 0 }}>Ajouter de l'argent</h2>
              <SegmentedControl value={moneyMode} onChange={setMoneyMode} options={[{ value: 'revenu', label: 'Revenu / Salaire' }, { value: 'virement', label: 'Virement' }]} />

              {moneyMode === 'revenu' ? (
                <form onSubmit={saveIncome} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <label style={pageStyles.label}>Date<input type="date" value={incomeForm.date} onChange={(event) => setIncomeForm((current) => ({ ...current, date: event.target.value }))} style={pageStyles.input} /></label>
                  <label style={pageStyles.label}>Description<input required value={incomeForm.desc} onChange={(event) => setIncomeForm((current) => ({ ...current, desc: event.target.value }))} style={pageStyles.input} placeholder="Ex. Salaire" /></label>
                  <label style={pageStyles.label}>Montant<input required type="number" min="0" step="0.01" value={incomeForm.montant} onChange={(event) => setIncomeForm((current) => ({ ...current, montant: event.target.value }))} style={pageStyles.input} /></label>
                  <label style={pageStyles.label}>Devise<select value={incomeForm.devise} onChange={(event) => setIncomeForm((current) => ({ ...current, devise: event.target.value }))} style={pageStyles.input}><option value="CAD">CAD</option><option value="EUR">EUR</option></select></label>
                  {incomeForm.devise === 'EUR' && (
                    <>
                      <label style={pageStyles.label}>Taux EUR → CAD<input type="number" min="0" step="0.01" value={incomeForm.taux} onChange={(event) => setIncomeForm((current) => ({ ...current, taux: event.target.value }))} style={pageStyles.input} /></label>
                      <div style={{ background: '#F7F1E8', color: '#854F0B', borderRadius: 12, padding: 12, fontWeight: 700 }}>Aperçu CAD : {formatMoney(incomePreviewCad, 'CAD')}</div>
                    </>
                  )}
                  <label style={pageStyles.label}>Compte destination<select value={incomeForm.compte} onChange={(event) => setIncomeForm((current) => ({ ...current, compte: event.target.value }))} style={pageStyles.input}>{data.comptes.map((item) => <option key={item.id} value={item.id}>{item.flag} {item.label}</option>)}</select></label>
                  <button type="submit" style={pageStyles.button}>Enregistrer le revenu</button>
                </form>
              ) : (
                <form onSubmit={saveTransfer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <label style={pageStyles.label}>Date<input type="date" value={transferForm.date} onChange={(event) => setTransferForm((current) => ({ ...current, date: event.target.value }))} style={pageStyles.input} /></label>
                  <label style={pageStyles.label}>Description<input value={transferForm.desc} onChange={(event) => setTransferForm((current) => ({ ...current, desc: event.target.value }))} style={pageStyles.input} placeholder="Ex. Virement vers budget" /></label>
                  <label style={pageStyles.label}>Compte source<select value={transferForm.source} onChange={(event) => setTransferForm((current) => ({ ...current, source: event.target.value }))} style={pageStyles.input}>{data.comptes.map((item) => <option key={item.id} value={item.id}>{item.flag} {item.label}</option>)}</select></label>
                  <label style={pageStyles.label}>Compte destination<select value={transferForm.dest} onChange={(event) => setTransferForm((current) => ({ ...current, dest: event.target.value }))} style={pageStyles.input}>{data.comptes.map((item) => <option key={item.id} value={item.id}>{item.flag} {item.label}</option>)}</select></label>
                  <label style={pageStyles.label}>Montant<input required type="number" min="0" step="0.01" value={transferForm.montant} onChange={(event) => setTransferForm((current) => ({ ...current, montant: event.target.value }))} style={pageStyles.input} /></label>
                  {transferForm.source === transferForm.dest && <div style={{ color: '#A32D2D', fontWeight: 700 }}>Le compte source et destination doivent être différents.</div>}
                  <button type="submit" style={pageStyles.button}>Enregistrer le virement</button>
                </form>
              )}
            </section>
          )}

          {tab === 'reglages' && (
            <section style={{ ...pageStyles.card, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={{ margin: 0 }}>Réglages</h2>
              <SegmentedControl value={settingsMode} onChange={setSettingsMode} options={[{ value: 'comptes', label: 'Comptes' }, { value: 'fixes', label: 'Fixes' }, { value: 'taux', label: 'Taux' }]} />

              {settingsMode === 'comptes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {[{ label: 'Dépenses', value: data.depenses.length }, { label: 'Revenus', value: data.revenus.length }, { label: 'Virements', value: data.virements.length }].map((item) => (
                      <div key={item.label} style={{ background: '#F5F8FA', borderRadius: 14, padding: 12, textAlign: 'center' }}>
                        <div style={{ color: '#627381', fontSize: 12 }}>{item.label}</div>
                        <div style={{ fontWeight: 800, marginTop: 6 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  {accountDraft.comptes.map((account) => (
                    <div key={account.id} style={{ background: '#F9FBFC', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <strong>{account.label || 'Nouveau compte'}</strong>
                        <span style={{ color: '#627381', fontSize: 13 }}>Solde actuel : {formatMoney(balances[account.id], account.devise)}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr', gap: 10 }}>
                        <input value={account.flag} onChange={(event) => setAccountDraft((current) => ({ ...current, comptes: current.comptes.map((item) => item.id === account.id ? { ...item, flag: event.target.value } : item) }))} style={pageStyles.input} />
                        <input value={account.label} onChange={(event) => setAccountDraft((current) => ({ ...current, comptes: current.comptes.map((item) => item.id === account.id ? { ...item, label: event.target.value } : item) }))} style={pageStyles.input} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <select value={account.devise} onChange={(event) => setAccountDraft((current) => ({ ...current, comptes: current.comptes.map((item) => item.id === account.id ? { ...item, devise: event.target.value } : item) }))} style={pageStyles.input}>
                          <option value="CAD">CAD</option>
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                        </select>
                        <input type="number" step="0.01" value={accountDraft.ouvertures[account.id] ?? 0} onChange={(event) => setAccountDraft((current) => ({ ...current, ouvertures: { ...current.ouvertures, [account.id]: event.target.value } }))} style={pageStyles.input} placeholder="Solde d'ouverture" />
                      </div>
                      <button type="button" onClick={() => deleteAccount(account.id)} disabled={data.comptes.length === 1} style={{ ...pageStyles.button, background: data.comptes.length === 1 ? '#AAB6BE' : '#A32D2D' }}>Supprimer</button>
                    </div>
                  ))}
                  <div style={{ background: '#F9FBFC', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <strong>+ Ajouter un compte</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 10 }}>
                      <input value={newAccount.flag} onChange={(event) => setNewAccount((current) => ({ ...current, flag: event.target.value }))} style={pageStyles.input} />
                      <input value={newAccount.label} onChange={(event) => setNewAccount((current) => ({ ...current, label: event.target.value }))} style={pageStyles.input} placeholder="Nom du compte" />
                    </div>
                    <select value={newAccount.devise} onChange={(event) => setNewAccount((current) => ({ ...current, devise: event.target.value }))} style={pageStyles.input}>
                      <option value="CAD">CAD</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                    <button type="button" onClick={addAccount} style={pageStyles.button}>Ajouter ce compte</button>
                  </div>
                  <button type="button" onClick={saveAccounts} style={pageStyles.button}>Enregistrer les comptes</button>
                </div>
              )}

              {settingsMode === 'fixes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {fixedDraft.map((item) => (
                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 44px', gap: 8 }}>
                      <input value={item.nom} onChange={(event) => setFixedDraft((current) => current.map((row) => row.id === item.id ? { ...row, nom: event.target.value } : row))} style={pageStyles.input} placeholder="Nom" />
                      <input type="number" min="0" step="0.01" value={item.montant} onChange={(event) => setFixedDraft((current) => current.map((row) => row.id === item.id ? { ...row, montant: event.target.value } : row))} style={pageStyles.input} placeholder="Montant" />
                      <button type="button" onClick={() => setFixedDraft((current) => current.filter((row) => row.id !== item.id))} style={{ ...pageStyles.button, background: '#A32D2D', padding: 0 }}>✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setFixedDraft((current) => [...current, { id: Date.now(), nom: '', montant: 0 }])} style={{ ...pageStyles.button, background: '#FFFFFF', color: '#0D1B2A', border: '1.5px dashed #C9D4DD' }}>Ajouter une ligne</button>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total</span><strong>{formatMoney(fixedDraft.reduce((sum, item) => sum + Number(item.montant || 0), 0), 'CAD')}</strong></div>
                  <button type="button" onClick={saveFixed} style={pageStyles.button}>Enregistrer</button>
                </div>
              )}

              {settingsMode === 'taux' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={pageStyles.label}>EUR → CAD<input type="number" min="0" step="0.01" value={rateDraft} onChange={(event) => setRateDraft(event.target.value)} style={pageStyles.input} /></label>
                  <div style={{ background: '#F7F1E8', borderRadius: 14, padding: 14, color: '#854F0B', fontWeight: 700 }}>1 EUR = {Number(rateDraft || 0).toFixed(2)} CAD</div>
                  <button type="button" onClick={saveRate} style={pageStyles.button}>Enregistrer</button>
                </div>
              )}
            </section>
          )}
        </main>

        <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 24px)', maxWidth: 430, background: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, boxShadow: '0 -12px 30px rgba(13,27,42,0.1)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '10px 8px calc(env(safe-area-inset-bottom, 6px) + 10px)', zIndex: 30 }}>
          {TABS.map((item) => {
            const active = tab === item.key
            return (
              <button key={item.key} onClick={() => setTab(item.key)} style={{ border: 'none', background: 'transparent', color: active ? '#0F7A5A' : '#687986', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 4px' }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontSize: 12, fontWeight: active ? 800 : 600 }}>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
