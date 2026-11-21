import { Combobox, Input, NavLink, SegmentedControl } from '@kyzarky/ui';
import { useState } from 'react';
import { SPECIES } from './birds/taxonomy';
import { FieldView } from './ui/FieldView';
import { HierarchyView } from './ui/HierarchyView';
import { classHref, fieldHref, speciesFor, useRoute } from './ui/route';
import { groupsIn, inScene, levelIn, MONTHS, PRESENCE, THIS_MONTH } from './ui/season';

export function App() {
  const route = useRoute();
  const [query, setQuery] = useState('');
  // Which presence groups are expanded. Choosing another bird or scene resets it to just the current bird's group.
  const [expanded, setExpanded] = useState({ key: '', levels: new Set<number>() });
  const matches = (s: (typeof SPECIES)[number]) => `${s.taxon.common} ${s.taxon.name}`.toLowerCase().includes(query.trim().toLowerCase());
  // Switching tabs keeps the subject: a species opens as its class, a class as its first species.
  const switchView = (view: 'field' | 'class') => {
    if (view === route.view) return;
    window.location.hash = route.view === 'field' ? classHref(route.species) : fieldHref(speciesFor(route.cls));
  };

  const scene = route.view === 'field' ? route.scene : 'yard';
  const groups = groupsIn(scene);
  const key = route.view === 'field' ? `${route.species.taxon.name}/${scene}` : '';
  const open = expanded.key === key ? expanded.levels : new Set(route.view === 'field' ? [levelIn(route.species, scene)] : []);
  const toggle = (level: number) => {
    const levels = new Set(open);
    if (!levels.delete(level)) levels.add(level);
    setExpanded({ key, levels });
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
            <Input type="search" aria-label="Filter species by name" placeholder="Filter by name" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-4" />
            {groups.map(({ level, species }) => ({ level, species: species.filter(matches) })).filter((g) => g.species.length > 0).map(({ level, species }) => {
              // While searching, every group with a match stays open.
              const isOpen = query.trim() !== '' || open.has(level);
              return (
                <details key={level} open={isOpen} className="mb-2">
                  <summary
                    className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-muted-foreground text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden"
                    onClick={(e) => {
                      e.preventDefault();
                      toggle(level);
                    }}
                  >
                    <span aria-hidden className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                    {PRESENCE[level]}
                    <span className="h-px flex-1 bg-border" />
                    {species.length}
                  </summary>
                  {species.map((s) => (
                    <NavLink key={s.taxon.name} href={fieldHref(s, scene)} current={s === route.species} className={level === 0 && s !== route.species ? 'text-muted-foreground' : ''}>
                      {s.taxon.common}
                    </NavLink>
                  ))}
                </details>
              );
            })}
          </nav>
          <div className="lg:hidden">
            <label htmlFor="species" className="mb-1 block text-muted-foreground text-sm">
              Species
            </label>
            {/* Type to narrow the list: scrolling a couple hundred birds on a phone is slow. */}
            <Combobox
              id="species"
              placeholder="Type a bird's name"
              value={fieldHref(route.species, scene)}
              onChange={(href) => (window.location.hash = href)}
              options={[
                ...groups.flatMap(({ level, species }) =>
                  species.map((s) => ({ value: fieldHref(s, scene), label: s.taxon.common, keywords: s.taxon.name, group: `${PRESENCE[level]} in ${MONTHS[THIS_MONTH]}` })),
                ),
                // So a bird overhead can be found from any scene; picking one opens its own habitat.
                ...SPECIES.filter((s) => !inScene(s, scene)).map((s) => ({ value: fieldHref(s), label: s.taxon.common, keywords: s.taxon.name, group: 'In other scenes' })),
              ]}
            />
          </div>
          <FieldView key={key} species={route.species} scene={scene} />
        </main>
      ) : (
        <main>
          <HierarchyView selected={route.cls} />
        </main>
      )}
    </div>
  );
}
