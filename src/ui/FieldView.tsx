import { useMemo, useState } from 'react';
import { behaviorsOf, lineage, traitSources, type BirdClass, type SpeciesClass } from '../birds/core/reflect';
import type { Ecology, FlightProfile } from '../birds/core/traits';
import { HABITATS, World } from '../birds/core/World';
import { Stage } from './Stage';

const BARS: { field: keyof FlightProfile; label: string }[] = [
  { field: 'power', label: 'Power' },
  { field: 'agility', label: 'Agility' },
  { field: 'braking', label: 'Braking' },
  { field: 'hover', label: 'Hover' },
  { field: 'glide', label: 'Glide' },
];

const SPEEDS = [
  { value: 0, label: 'Pause' },
  { value: 0.25, label: '¼×' },
  { value: 0.5, label: '½×' },
  { value: 1, label: '1×' },
];

interface Props {
  species: SpeciesClass;
  onOpenClass: (cls: BirdClass) => void;
}

export function FieldView({ species, onOpenClass }: Props) {
  const bird = useMemo(() => new species(new World(HABITATS[resolveHabitat(species)])), [species]);
  const behaviors = useMemo(() => behaviorsOf(species).reverse(), [species]);
  const flight = useMemo(() => new Map(traitSources(species, 'flight').map((s) => [s.field, s])), [species]);
  const [current, setCurrent] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [closeUp, setCloseUp] = useState(false);

  const shown = behaviors.find((b) => b.key === (current ?? lastKey));
  const perform = (key: string) => {
    bird.perform(key);
    setLastKey(key);
    if (speed === 0) setSpeed(1);
  };
  const f = bird.flight;

  return (
    <div className="field">
      <section className="stage-column">
        <header className="title">
          <h1>{species.taxon.common}</h1>
          <span className="sci">{species.taxon.name}</span>
          <nav className="crumbs" aria-label="Classification">
            {lineage(species).slice(0, -1).map((c) => (
              <button key={c.taxon.name} className="link" onClick={() => onOpenClass(c)}>
                {c.taxon.name}
              </button>
            ))}
          </nav>
        </header>

        <Stage bird={bird} speed={speed} closeUp={closeUp} onBehaviorChange={setCurrent} />

        <div className="toolbar">
          <span className="habitat">{bird.world.habitat.name}</span>
          <div className="seg" role="group" aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <button key={s.value} className={speed === s.value ? 'on' : ''} onClick={() => setSpeed(s.value)}>
                {s.label}
              </button>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={closeUp} onChange={(e) => setCloseUp(e.target.checked)} /> Close-up
          </label>
        </div>

        <p className="cue" aria-live="polite">
          {shown ? (
            <>
              <strong>{shown.spec.label}.</strong> {shown.spec.cue}
            </>
          ) : (
            <>Pick a behavior to watch. {species.taxon.note}</>
          )}
        </p>
      </section>

      <aside className="panel">
        <h2>Behaviors</h2>
        <p className="hint">Each is tagged with the class that defines it.</p>
        <ul className="behaviors">
          {behaviors.map((b) => (
            <li key={b.key}>
              <button className={`behavior ${current === b.key ? 'on' : ''}`} onClick={() => perform(b.key)}>
                {b.spec.label}
              </button>
              <span className="origin">
                <button className="link" onClick={() => onOpenClass(b.declaredIn)}>
                  {b.declaredIn.taxon.name}
                </button>
                {b.implementedIn !== b.declaredIn && (
                  <>
                    {' → overridden in '}
                    <button className="link" onClick={() => onOpenClass(b.implementedIn)}>
                      {b.implementedIn.taxon.name}
                    </button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>

        <h2>Flight profile</h2>
        <p className="hint">The numbers the shared flight routine reads, and the class that set each.</p>
        <table className="profile">
          <tbody>
            {BARS.map(({ field, label }) => (
              <tr key={field}>
                <th>{label}</th>
                <td>
                  <div className="bar">
                    <div style={{ width: `${(f[field] as number) * 100}%` }} />
                  </div>
                </td>
                <td className="origin">{flight.get(field)!.from.taxon.name}</td>
              </tr>
            ))}
            <tr>
              <th>Cruise</th>
              <td>{f.cruiseSpeed} m/s</td>
              <td className="origin">{flight.get('cruiseSpeed')!.from.taxon.name}</td>
            </tr>
            <tr>
              <th>Wingbeat</th>
              <td>
                {f.flapRate}/s, {describeRhythm(f)}
              </td>
              <td className="origin">{flight.get('flapDuty')!.from.taxon.name}</td>
            </tr>
            <tr>
              <th>Endurance</th>
              <td>{Number.isFinite(f.endurance) ? `${f.endurance} s` : 'sustained'}</td>
              <td className="origin">{flight.get('endurance')!.from.taxon.name}</td>
            </tr>
          </tbody>
        </table>

        <h2>Field notes</h2>
        <p className="note">{species.taxon.note}</p>
        <dl className="facts">
          <dt>On the ground</dt>
          <dd>{describeGait(bird.ecology)}</dd>
          <dt>Call</dt>
          <dd>{bird.ecology.call}</dd>
          {bird.ecology.song && (
            <>
              <dt>Song</dt>
              <dd>{bird.ecology.song}</dd>
            </>
          )}
        </dl>
      </aside>
    </div>
  );
}

function resolveHabitat(cls: BirdClass) {
  return traitSources(cls, 'ecology').find((s) => s.field === 'habitat')!.value as Ecology['habitat'];
}

function describeRhythm(f: FlightProfile) {
  if (f.flapDuty >= 0.95) return 'continuous';
  const rest = f.restPose === 'folded' ? 'bounds with wings shut' : 'glides';
  return `flaps ${Math.round(f.flapDuty * 100)}% then ${rest}`;
}

function describeGait(e: Ecology) {
  return { walk: 'Walks', run: 'Runs in bursts', hop: 'Hops', none: 'Cannot walk; feet only grip a perch' }[e.gait];
}
