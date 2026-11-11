import { Card, Link, Select, Table } from '@kyzarky/ui';
import { behaviorsOf, lineage, ownBehaviors, traitSources, type BirdClass, type TraitKey, type TraitSource } from '../birds/core/reflect';
import { SPECIES } from '../birds/taxonomy';
import { NavLink, Tag } from './bits';
import { CLASSES, classHref, fieldHref } from './route';

const TABLES: { key: TraitKey; title: string }[] = [
  { key: 'flight', title: 'static flight' },
  { key: 'ecology', title: 'static ecology' },
  { key: 'look', title: 'static look' },
];

/** Everything on this screen is read off the classes at runtime by reflect.ts. */
export function HierarchyView({ selected }: { selected: BirdClass }) {
  const chain = lineage(selected);
  const isSpecies = selected.taxon.rank === 'species';
  const own = ownBehaviors(selected);
  const inherited = behaviorsOf(selected).filter((b) => !own.includes(b));
  const ownTables = TABLES.map((t) => ({ ...t, fields: traitSources(selected, t.key).filter((s) => s.from === selected) })).filter((t) => t.fields.length);
  const descendants = SPECIES.filter((s) => s !== selected && lineage(s).includes(selected));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
      <nav aria-label="Class hierarchy" className="hidden rounded-2xl border border-border bg-card p-2 lg:block">
        {CLASSES.map(({ cls, depth }) => (
          <NavLink
            key={cls.taxon.name}
            href={classHref(cls)}
            current={cls === selected}
            className={`gap-2 ${cls !== selected && chain.includes(cls) ? 'bg-muted' : ''}`}
            style={{ paddingLeft: 12 + depth * 14 }}
          >
            {cls.taxon.rank === 'species' ? (
              cls.taxon.common
            ) : (
              <>
                <code>{cls.taxon.name}</code>
                <span className="truncate text-xs opacity-70">{cls.taxon.common}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="lg:hidden">
        <label htmlFor="class" className="mb-1 block text-muted-foreground text-sm">
          Class
        </label>
        <Select id="class" value={classHref(selected)} onChange={(e) => (window.location.hash = e.target.value)}>
          {CLASSES.map(({ cls, depth }) => (
            <option key={cls.taxon.name} value={classHref(cls)}>
              {'  '.repeat(depth)}
              {cls.taxon.rank === 'species' ? cls.taxon.common : cls.taxon.name}
            </option>
          ))}
        </Select>
      </div>

      <Card aria-labelledby="class-name" className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs uppercase tracking-wider">{selected.taxon.rank}</p>
          <h1 id="class-name" className="font-semibold text-2xl tracking-tight">
            {selected.taxon.name} <span className="ml-1 font-normal text-base text-muted-foreground">{selected.taxon.common}</span>
          </h1>
          <p className="font-mono text-muted-foreground text-sm">
            {[...chain].reverse().map((c, i) => (
              <span key={c.taxon.name}>
                {i > 0 && ' extends '}
                <ClassLink cls={c} />
              </span>
            ))}
          </p>
          <p className="max-w-prose leading-relaxed">{selected.taxon.note}</p>
          {isSpecies && (
            <p>
              <Link href={fieldHref(selected)}>Watch it in the field</Link>
            </p>
          )}
        </header>

        <section aria-labelledby="own-heading">
          <h2 id="own-heading" className="font-semibold text-lg">
            Defined in this class
          </h2>
          {own.length === 0 && ownTables.length === 0 && (
            <p className="mt-1 text-muted-foreground text-sm">Nothing of its own. It exists to group what is below it and pass down what is above.</p>
          )}
          <ul className="mt-3 flex flex-col gap-3">
            {own.map((b) => (
              <li key={b.key} className="rounded-xl border border-border p-3">
                <p className="flex flex-wrap items-center gap-2">
                  <code className="font-semibold">{b.key}()</code>
                  {b.declaredIn === selected ? <Tag>new behavior</Tag> : <Tag tone="warning">overrides {b.declaredIn.taxon.name}</Tag>}
                </p>
                <p className="mt-1 text-sm leading-relaxed">
                  <strong>{b.spec.label}.</strong> {b.spec.cue}
                </p>
              </li>
            ))}
          </ul>
          {ownTables.map((t) => (
            <div key={t.key} className="mt-4">
              <Table caption={<code>{t.title}</code>}>
                <tbody>
                  {t.fields.map((s) => (
                    <TraitRow key={s.field} source={s}>
                      {s.replaced && (
                        <>
                          replaces <Value value={s.replaced.value} /> from {s.replaced.from.taxon.name}
                        </>
                      )}
                    </TraitRow>
                  ))}
                </tbody>
              </Table>
            </div>
          ))}
        </section>

        {inherited.length > 0 && (
          <section aria-labelledby="inherited-heading">
            <h2 id="inherited-heading" className="mb-2 font-semibold text-lg">
              Inherited behaviors
            </h2>
            <Table>
              <tbody>
                {inherited.map((b) => (
                  <tr key={b.key}>
                    <th scope="row">
                      <code>{b.key}()</code>
                    </th>
                    <td>{b.spec.label}</td>
                    <td className="text-muted-foreground">
                      from <ClassLink cls={b.implementedIn} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </section>
        )}

        <section aria-labelledby="resolved-heading">
          <h2 id="resolved-heading" className="font-semibold text-lg">
            Resolved flight profile
          </h2>
          <p className="mt-1 mb-2 text-muted-foreground text-sm">What an instance of this class would fly with, and which ancestor had the last word on each value.</p>
          <Table>
            <tbody>
              {traitSources(selected, 'flight').map((s) => (
                <TraitRow key={s.field} source={s}>
                  {s.from === selected ? 'set here' : <ClassLink cls={s.from} />}
                </TraitRow>
              ))}
            </tbody>
          </Table>
        </section>

        {descendants.length > 0 && (
          <section aria-labelledby="species-heading">
            <h2 id="species-heading" className="font-semibold text-lg">
              Species in this group
            </h2>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {descendants.map((s) => (
                <ClassLink key={s.taxon.name} cls={s} common />
              ))}
            </p>
          </section>
        )}
      </Card>
    </div>
  );
}

function ClassLink({ cls, common }: { cls: BirdClass; common?: boolean }) {
  return <Link href={classHref(cls)}>{common ? cls.taxon.common : cls.taxon.name}</Link>;
}

function TraitRow({ source, children }: { source: TraitSource; children: React.ReactNode }) {
  return (
    <tr>
      <th scope="row" className="font-mono">
        {source.field}
      </th>
      <td className="tabular-nums">
        <Value value={source.value} />
      </td>
      <td className="text-muted-foreground">{children}</td>
    </tr>
  );
}

function Value({ value }: { value: unknown }) {
  if (typeof value === 'string' && value.startsWith('#')) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <i className="inline-block size-3 rounded-sm border border-input" style={{ background: value }} /> {value}
      </span>
    );
  }
  if (Array.isArray(value)) return <>{value.length ? value.join(', ') : '(none)'}</>;
  if (value === Infinity) return <>∞</>;
  return <>{String(value)}</>;
}
