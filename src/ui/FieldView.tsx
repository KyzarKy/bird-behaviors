import { Button, Card, Link, List, ListRow, Meter, SegmentedControl } from '@kyzarky/ui';
import { useMemo, useRef, useState } from 'react';
import { behaviorsOf, lineage, resolveTraits, traitSources, type BirdClass, type SpeciesClass } from '../birds/core/reflect';
import type { Ecology, FlightProfile } from '../birds/core/traits';
import { HABITATS, World } from '../birds/core/World';
import { classHref } from './route';
import { Stage } from './Stage';

const BARS: { field: keyof FlightProfile; label: string }[] = [
  { field: 'power', label: 'Power' },
  { field: 'agility', label: 'Agility' },
  { field: 'braking', label: 'Braking' },
  { field: 'hover', label: 'Hover' },
  { field: 'glide', label: 'Glide' },
];

const SPEEDS = [
  { value: '0', label: 'Pause' },
  { value: '0.25', label: '¼×' },
  { value: '0.5', label: '½×' },
  { value: '1', label: '1×' },
] as const;

export function FieldView({ species }: { species: SpeciesClass }) {
  const bird = useMemo(() => new species(new World(HABITATS[resolveTraits<Ecology>(species, 'ecology').habitat])), [species]);
  const behaviors = useMemo(() => behaviorsOf(species).reverse(), [species]);
  const flight = useMemo(() => new Map(traitSources(species, 'flight').map((s) => [s.field, s.from])), [species]);
  const [current, setCurrent] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]['value']>('1');
  // A phone's stage is small, so it starts zoomed in on the bird.
  const [closeUp, setCloseUp] = useState(() => window.matchMedia('(max-width: 640px)').matches);
  const stageRef = useRef<HTMLElement>(null);

  const shown = behaviors.find((b) => b.key === (current ?? lastKey));
  const perform = (key: string) => {
    bird.perform(key);
    setLastKey(key);
    if (speed === '0') setSpeed('1');
    // On a narrow screen the buttons sit below the stage; bring it back into view.
    stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const f = bird.flight;
  const from = (field: keyof FlightProfile) => <ClassLink cls={flight.get(field)!} />;

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

        <Stage bird={bird} speed={Number(speed)} closeUp={closeUp} onBehaviorChange={setCurrent} />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex-1 text-muted-foreground text-sm">{bird.world.habitat.name}</span>
          <SegmentedControl label="Playback speed" value={speed} onChange={setSpeed} options={SPEEDS} />
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={closeUp} onChange={(e) => setCloseUp(e.target.checked)} />
            Close-up
          </label>
        </div>

        <p aria-live="polite" className="min-h-24 rounded-xl border border-border border-l-4 border-l-primary bg-card p-4 leading-relaxed">
          {shown ? (
            <>
              <strong>{shown.spec.label}.</strong> {shown.spec.cue}
            </>
          ) : (
            <>Pick a behavior to watch. {species.taxon.note}</>
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
                <Button variant={current === b.key ? 'default' : 'outline'} aria-pressed={current === b.key} className="w-full" onClick={() => perform(b.key)}>
                  {b.spec.label}
                </Button>
                <p className="mt-1 px-1 text-muted-foreground text-xs">
                  <ClassLink cls={b.declaredIn} />
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

        <Card aria-labelledby="flight-heading">
          <List heading={<h2 id="flight-heading">Flight profile</h2>} description="The numbers the shared flight routine reads, and the class that set each.">
            {BARS.map(({ field, label }) => (
              <ListRow key={field} label={label} detail={<>{(f[field] as number).toFixed(2)} · {from(field)}</>}>
                <Meter value={f[field] as number} />
              </ListRow>
            ))}
            <ListRow label="Cruise speed" detail={<>{f.cruiseSpeed} m/s · {from('cruiseSpeed')}</>} />
            <ListRow label={`Wingbeat: ${describeRhythm(f)}`} detail={<>{f.flapRate}/s · {from('flapDuty')}</>} />
            <ListRow label="Endurance" detail={<>{Number.isFinite(f.endurance) ? `${f.endurance} s` : 'sustained'} · {from('endurance')}</>} />
          </List>
        </Card>

        <Card aria-labelledby="notes-heading">
          <h2 id="notes-heading" className="font-semibold text-lg">
            Field notes
          </h2>
          <p className="mt-2 leading-relaxed">{species.taxon.note}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
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

function describeRhythm(f: FlightProfile) {
  if (f.flapDuty >= 0.95) return 'continuous';
  return `flaps ${Math.round(f.flapDuty * 100)}%, then ${f.restPose === 'folded' ? 'bounds with wings shut' : 'glides'}`;
}

function describeGait(e: Ecology) {
  return { walk: 'Walks', run: 'Runs in bursts', hop: 'Hops', none: 'Cannot walk; feet only grip a perch' }[e.gait];
}
