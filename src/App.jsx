import { useMemo, useState } from 'react'

const APP_TYPES = [
  {
    id: 'budget',
    label: 'Suivi budget',
    description: 'Suivre revenus, dépenses et objectifs d’épargne.',
    firstScreen: 'Un tableau de bord avec le solde, les dernières opérations et un bouton “Ajouter”.',
  },
  {
    id: 'todo',
    label: 'To-do simple',
    description: 'Gérer une liste de tâches claire et rapide.',
    firstScreen: 'Une liste de tâches avec filtres “À faire / Fait” et un formulaire ultra simple.',
  },
  {
    id: 'notes',
    label: 'Bloc-notes',
    description: 'Prendre des notes rapides sans friction.',
    firstScreen: 'Une grille de notes avec recherche, création et édition immédiate.',
  },
]

const NEXT_STEPS = [
  'choisir exactement le type d’app à construire',
  'définir le premier écran avant d’ajouter des fonctions',
  'coder petit morceau par petit morceau',
  'tester après chaque étape pour éviter un nouveau blocage',
]

function IdeaCard({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`idea-card${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect(option.id)}
    >
      <span className="idea-card__title">{option.label}</span>
      <span className="idea-card__description">{option.description}</span>
    </button>
  )
}

export default function App() {
  const [projectName, setProjectName] = useState('Notre app')
  const [selectedType, setSelectedType] = useState(APP_TYPES[0].id)

  const selectedApp = useMemo(
    () => APP_TYPES.find((option) => option.id === selectedType) ?? APP_TYPES[0],
    [selectedType],
  )

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Nouveau départ</p>
        <h1>On repart de zéro avec une base propre.</h1>
        <p className="hero__text">
          J’ai remplacé l’ancienne interface par une app minimale et stable pour qu’on puisse enfin construire
          ensemble, étape par étape, sans repartir sur un écran blanc.
        </p>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>1. Nom du projet</h2>
          <p>On peut déjà personnaliser la base avant de construire la suite.</p>
        </div>

        <label className="field">
          <span>Nom affiché</span>
          <input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value || 'Notre app')}
            placeholder="Ex. Mon app budget"
          />
        </label>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>2. Choisir ce qu’on construit</h2>
          <p>J’ai préparé trois directions simples pour démarrer sans complexité inutile.</p>
        </div>

        <div className="idea-grid">
          {APP_TYPES.map((option) => (
            <IdeaCard
              key={option.id}
              option={option}
              selected={option.id === selectedType}
              onSelect={setSelectedType}
            />
          ))}
        </div>
      </section>

      <section className="panel preview-panel">
        <div className="panel__header">
          <h2>3. Aperçu de la base</h2>
          <p>Voilà la direction actuelle de l’app reconstruite.</p>
        </div>

        <div className="preview-card">
          <div className="preview-card__badge">Prévisualisation</div>
          <h3>{projectName}</h3>
          <p>{selectedApp.description}</p>
          <div className="preview-card__block">
            <strong>Premier écran recommandé</strong>
            <span>{selectedApp.firstScreen}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>4. Comment on avance maintenant</h2>
          <p>On garde une méthode simple pour éviter de retomber dans quelque chose de cassé.</p>
        </div>

        <ol className="steps-list">
          {NEXT_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </main>
  )
}
