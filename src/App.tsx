import { useState } from 'react';
import { resolveTraits, type BirdClass, type SpeciesClass } from './birds/core/reflect';
import type { Ecology } from './birds/core/traits';
import { HABITATS } from './birds/core/World';
import { SPECIES } from './birds/taxonomy';
import { FieldView } from './ui/FieldView';
import { HierarchyView } from './ui/HierarchyView';

const BY_HABITAT = Object.values(HABITATS).map((h) => ({
  habitat: h,
  species: SPECIES.filter((s) => resolveTraits<Ecology>(s, 'ecology').habitat === h.id),
}));

export function App() {
  const [view, setView] = useState<'field' | 'hierarchy'>('field');
  const [species, setSpecies] = useState<SpeciesClass>(() => SPECIES[0]);
  const [inspected, setInspected] = useState<BirdClass>(() => SPECIES[0]);

  // Classes are functions, so they go through the updater form or React would call them.
  const inspect = (cls: BirdClass) => {
    setInspected(() => cls);
    setView('hierarchy');
  };
  const watch = (s: SpeciesClass) => {
    setSpecies(() => s);
    setInspected(() => s);
    setView('field');
  };

  return (
    <div className="app">
      <header className="top">
        <strong className="brand">Bird Behaviors</strong>
        <span className="tagline">Learn birds by what they do · Miller Peninsula, Washington</span>
        <div className="seg tabs" role="tablist">
          <button role="tab" aria-selected={view === 'field'} className={view === 'field' ? 'on' : ''} onClick={() => setView('field')}>
            Field
          </button>
          <button role="tab" aria-selected={view === 'hierarchy'} className={view === 'hierarchy' ? 'on' : ''} onClick={() => setView('hierarchy')}>
            Class hierarchy
          </button>
        </div>
      </header>

      {view === 'field' ? (
        <main className="field-layout">
          <nav className="species" aria-label="Species">
            {BY_HABITAT.map(({ habitat, species: list }) => (
              <div key={habitat.id}>
                <h2>{habitat.name}</h2>
                {list.map((s) => (
                  <button key={s.taxon.name} className={s === species ? 'on' : ''} onClick={() => watch(s)}>
                    {s.taxon.common}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <FieldView key={species.taxon.name} species={species} onOpenClass={inspect} />
        </main>
      ) : (
        <main>
          <HierarchyView selected={inspected} onSelect={(c) => setInspected(() => c)} onWatch={watch} />
        </main>
      )}
    </div>
  );
}
