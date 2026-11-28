import { Button, Card, Checkbox, Link, SegmentedControl, Select, Tag } from '@kyzarky/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { behaviorsOf, lineage, variantsOf, type BirdClass, type SpeciesClass } from '../birds/core/reflect';
import type { Ecology, HabitatId, Variant } from '../birds/core/traits';
import { HABITATS, World } from '../birds/core/World';
import { classHref, fieldHref } from './route';
import { inScene, levelIn, likeliestIn, MONTHS, PRESENCE, THIS_MONTH } from './season';
import { Stage } from './Stage';

export function FieldView({ species, scene }: { species: SpeciesClass; scene: HabitatId }) {
  const [variant, setVariant] = useState<Variant>('adult');
  const plumages = useMemo(() => {
    const v = variantsOf(species);
    // The default look is the male only when the species has a separate female.
    const name = { adult: v.includes('female') ? 'Male' : 'Adult', female: 'Female', juvenile: 'Juvenile' };
    return v.map((value) => ({ value, label: name[value] }));
  }, [species]);
  const bird = useMemo(() => new species(new World(HABITATS[scene]), true, variant), [species, scene, variant]);
  const behaviors = useMemo(() => behaviorsOf(species).reverse(), [species]);
  const [current, setCurrent] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);
  // On phones the controls fold into a drawer, so the behaviors list peeks above the fold.
  const [drawer, setDrawer] = useState(false);
  // A phone's stage is small, so it starts zoomed in on the bird.
  const [closeUp, setCloseUp] = useState(() => window.matchMedia('(max-width: 640px)').matches);
  const [auto, setAuto] = useState(false);
  bird.auto = auto;
  const stageRef = useRef<HTMLElement>(null);
  // A new bird or scene was picked, possibly from far down the list: bring the stage back into view.
  useEffect(() => {
    stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);
  // Keep the bird if it visits the new scene; otherwise show the likeliest bird there.
  const changeScene = (to: HabitatId) => (window.location.hash = fieldHref(inScene(species, to) ? species : likeliestIn(to), to));

  const shown = behaviors.find((b) => b.key === (current ?? lastKey));
  const why = (key: string) => {
    const lack = bird.missing(key);
    return lack && `Needs ${lack}, which ${bird.world.habitat.name} does not have.`;
  };
  const perform = (key: string) => {
    // On a narrow screen the buttons sit below the stage; bring it back into view.
    stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    bird.perform(key);
    setLastKey(key);
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section ref={stageRef} aria-labelledby="species-name" className="flex flex-col gap-3">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 id="species-name" className="font-semibold text-2xl tracking-tight">
            {species.taxon.common}
          </h1>
          <span className="text-muted-foreground italic">{species.taxon.name}</span>
          <nav aria-label="Classification" className="flex flex-wrap gap-x-2 text-sm sm:ml-auto">
            {lineage(species).slice(0, -1).map((c, i) => (
              <span key={c.taxon.name}>
                {i > 0 && <span className="mr-2 text-muted-foreground">›</span>}
                <ClassLink cls={c} />
              </span>
            ))}
          </nav>
        </header>

        <Stage bird={bird} closeUp={closeUp} onBehaviorChange={setCurrent} />

        <button
          type="button"
          aria-expanded={drawer}
          aria-controls="stage-controls"
          onClick={() => setDrawer(!drawer)}
          className="flex min-h-11 items-center justify-between rounded-xl border border-border bg-card px-4 text-sm sm:hidden"
        >
          <span className="truncate">
            <span className="font-medium">Scene and settings</span>
            {!drawer && <span className="text-muted-foreground"> · {HABITATS[scene].name}</span>}
          </span>
          <span aria-hidden="true" className={`ml-2 transition-transform ${drawer ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>
        {/* A drawer on phones, always open from sm up. */}
        <div id="stage-controls" className={`${drawer ? 'flex' : 'hidden'} flex-col items-start gap-3 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4`}>
          <Select aria-label="Scene" value={scene} onChange={(e) => changeScene(e.target.value as HabitatId)} className="w-full sm:w-auto">
            {Object.values(HABITATS).map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </Select>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            {plumages.length > 1 && <SegmentedControl label="Plumage" value={variant} onChange={setVariant} options={plumages} />}
            <Checkbox label="Close-up" checked={closeUp} onChange={(e) => setCloseUp(e.target.checked)} />
            <Checkbox label="Auto" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          </div>
        </div>

        <p aria-live="polite" className="min-h-24 rounded-xl border border-border border-l-4 border-l-primary bg-card p-4 leading-relaxed">
          {shown ? (
            <>
              <strong>{shown.spec.label}.</strong> {shown.spec.cue}
            </>
          ) : (
            <>
              {/* Below xl the behaviors card sits under the stage, often off screen; link to it. */}
              <button
                type="button"
                className="text-primary underline underline-offset-2 xl:hidden"
                onClick={() => document.getElementById('behaviors-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                Pick a behavior (below)
              </button>
              <span className="hidden xl:inline">Pick a behavior</span> to watch, or turn on Auto and let the bird choose. {species.taxon.note}
            </>
          )}
        </p>
      </section>

      <div className="flex flex-col gap-6">
        <Card aria-labelledby="behaviors-heading">
          <h2 id="behaviors-heading" className="font-semibold text-lg">
            Behaviors
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">Each is tagged with the class that defines it.</p>
          <ul className="mt-3 flex flex-col gap-3">
            {behaviors.map((b) => (
              <li key={b.key}>
                <Button
                  variant={current === b.key ? 'default' : 'outline'}
                  aria-pressed={current === b.key}
                  // aria-disabled rather than disabled, so the tooltip still shows on hover.
                  aria-disabled={!!why(b.key)}
                  title={why(b.key) ?? undefined}
                  className={`w-full ${why(b.key) ? 'cursor-not-allowed opacity-45 hover:!bg-transparent active:!bg-transparent' : ''}`}
                  onClick={() => !why(b.key) && perform(b.key)}
                >
                  {b.spec.label}
                </Button>
                <p className="mt-1 px-1 text-muted-foreground text-xs">
                  {why(b.key) && <span className="block text-warning">{why(b.key)}</span>}
                  {b.spec.feeding && <Tag>Feeding</Tag>} <ClassLink cls={b.declaredIn} />
                  {b.implementedIn !== b.declaredIn && (
                    <>
                      , overridden in <ClassLink cls={b.implementedIn} />
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card aria-labelledby="notes-heading">
          <h2 id="notes-heading" className="font-semibold text-lg">
            Field notes
          </h2>
          <p className="mt-2 leading-relaxed">{species.taxon.note}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{MONTHS[THIS_MONTH]}</dt>
            <dd>{PRESENCE[levelIn(species, scene)]} in this scene</dd>
            <dt className="text-muted-foreground">Here through the year</dt>
            <dd>
              <Calendar levels={MONTHS.map((_, m) => levelIn(species, scene, m))} />
            </dd>
            <dt className="text-muted-foreground">On the ground</dt>
            <dd>{describeGait(bird.ecology)}</dd>
            <dt className="text-muted-foreground">Call</dt>
            <dd>{bird.ecology.call}</dd>
            {bird.ecology.song && (
              <>
                <dt className="text-muted-foreground">Song</dt>
                <dd>{bird.ecology.song}</dd>
              </>
            )}
          </dl>
        </Card>
      </div>
    </div>
  );
}

function ClassLink({ cls }: { cls: BirdClass }) {
  return <Link href={classHref(cls)}>{cls.taxon.name}</Link>;
}

/** Twelve bars, January to December, as tall as the bird is easy to find. This month is filled in the primary color. */
function Calendar({ levels }: { levels: readonly number[] }) {
  const months = levels.map((level, m) => `${MONTHS[m]}: ${PRESENCE[level].toLowerCase()}`);
  return (
    <span role="img" aria-label={months.join(', ')} className="flex h-6 max-w-48 items-end gap-0.5">
      {levels.map((level, m) => (
        <span
          key={m}
          title={months[m]}
          className={`flex-1 rounded-sm ${m === THIS_MONTH ? 'bg-primary' : 'bg-muted-foreground/40'}`}
          style={{ height: `${10 + level * 30}%` }}
        />
      ))}
    </span>
  );
}

function describeGait(e: Ecology) {
  return { walk: 'Walks', run: 'Runs in bursts', hop: 'Hops', none: 'Cannot walk; feet only grip a perch' }[e.gait];
}
