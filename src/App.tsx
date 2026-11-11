import { SegmentedControl, Select } from '@kyzarky/ui';
import { resolveTraits } from './birds/core/reflect';
import type { Ecology } from './birds/core/traits';
import { HABITATS } from './birds/core/World';
import { SPECIES } from './birds/taxonomy';
import { NavLink } from './ui/bits';
import { FieldView } from './ui/FieldView';
import { HierarchyView } from './ui/HierarchyView';
import { classHref, fieldHref, speciesFor, useRoute } from './ui/route';

const BY_HABITAT = Object.values(HABITATS).map((habitat) => ({
  habitat,
  species: SPECIES.filter((s) => resolveTraits<Ecology>(s, 'ecology').habitat === habitat.id),
}));

export function App() {
  const route = useRoute();
  // Switching tabs keeps the subject: a species opens as its class, a class as its first species.
  const switchView = (view: 'field' | 'class') => {
    if (view === route.view) return;
    window.location.hash = route.view === 'field' ? classHref(route.species) : fieldHref(speciesFor(route.cls));
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-12">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <a href="#/" className="font-semibold text-lg">
          Bird Behaviors
        </a>
        <p className="hidden flex-1 text-muted-foreground text-sm md:block">Learn birds by what they do · Miller Peninsula, Washington</p>
        <div className="ml-auto">
          <SegmentedControl
            label="View"
            value={route.view}
            onChange={switchView}
            options={[
              { value: 'field', label: 'Field' },
              { value: 'class', label: 'Class hierarchy' },
            ]}
          />
        </div>
      </header>

      {route.view === 'field' ? (
        <main className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <nav aria-label="Species" className="hidden lg:block">
            {BY_HABITAT.map(({ habitat, species }) => (
              <div key={habitat.id} className="mb-6">
                <h2 className="mb-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">{habitat.name}</h2>
                {species.map((s) => (
                  <NavLink key={s.taxon.name} href={fieldHref(s)} current={s === route.species}>
                    {s.taxon.common}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          <div className="lg:hidden">
            <label htmlFor="species" className="mb-1 block text-muted-foreground text-sm">
              Species
            </label>
            <Select id="species" value={fieldHref(route.species)} onChange={(e) => (window.location.hash = e.target.value)}>
              {BY_HABITAT.map(({ habitat, species }) => (
                <optgroup key={habitat.id} label={habitat.name}>
                  {species.map((s) => (
                    <option key={s.taxon.name} value={fieldHref(s)}>
                      {s.taxon.common}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>
          <FieldView key={route.species.taxon.name} species={route.species} />
        </main>
      ) : (
        <main>
          <HierarchyView selected={route.cls} />
        </main>
      )}
    </div>
  );
}
