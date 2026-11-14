import { SegmentedControl, Select } from '@kyzarky/ui';
import { resolveTraits } from './birds/core/reflect';
import type { Ecology } from './birds/core/traits';
import { HABITATS } from './birds/core/World';
import { SPECIES } from './birds/taxonomy';
import { NavLink } from './ui/bits';
import { FieldView } from './ui/FieldView';
import { HierarchyView } from './ui/HierarchyView';
import { classHref, fieldHref, speciesFor, useRoute } from './ui/route';
import { MONTHS, PRESENCE, presenceOf, THIS_MONTH } from './ui/season';

/** Each habitat's species, grouped by how easy they are to find this month, likeliest first. */
const BY_HABITAT = Object.values(HABITATS).map((habitat) => {
  const here = SPECIES.filter((s) => resolveTraits<Ecology>(s, 'ecology').habitat === habitat.id);
  const levels = [3, 2, 1, 0].map((level) => ({ level, species: here.filter((s) => presenceOf(s)[THIS_MONTH] === level) }));
  return { habitat, levels: levels.filter((l) => l.species.length > 0) };
});

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
            <p className="mb-4 px-3 text-muted-foreground text-xs">Sorted by how likely you are to see each one in {MONTHS[THIS_MONTH]}.</p>
            {BY_HABITAT.map(({ habitat, levels }) => (
              <div key={habitat.id} className="mb-6">
                <h2 className="mb-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">{habitat.name}</h2>
                {levels.map(({ level, species }) => (
                  <div key={level} className="mb-2">
                    <h3 className="flex items-center gap-2 px-3 py-1 text-muted-foreground text-xs">
                      {PRESENCE[level]}
                      <span className="h-px flex-1 bg-border" />
                    </h3>
                    {species.map((s) => (
                      <NavLink key={s.taxon.name} href={fieldHref(s)} current={s === route.species} className={level === 0 && s !== route.species ? 'text-muted-foreground' : ''}>
                        {s.taxon.common}
                      </NavLink>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </nav>
          <div className="lg:hidden">
            <label htmlFor="species" className="mb-1 block text-muted-foreground text-sm">
              Species
            </label>
            <Select id="species" value={fieldHref(route.species)} onChange={(e) => (window.location.hash = e.target.value)}>
              {BY_HABITAT.map(({ habitat, levels }) =>
                levels.map(({ level, species }) => (
                  <optgroup key={`${habitat.id}-${level}`} label={`${habitat.name}: ${PRESENCE[level].toLowerCase()} in ${MONTHS[THIS_MONTH]}`}>
                    {species.map((s) => (
                      <option key={s.taxon.name} value={fieldHref(s)}>
                        {s.taxon.common}
                      </option>
                    ))}
                  </optgroup>
                )),
              )}
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
