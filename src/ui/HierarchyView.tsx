import { useMemo } from 'react';
import {
  behaviorsOf,
  buildTree,
  lineage,
  ownBehaviors,
  traitSources,
  type BirdClass,
  type SpeciesClass,
  type TraitKey,
  type TraitSource,
  type TreeNode,
} from '../birds/core/reflect';
import { SPECIES } from '../birds/taxonomy';

interface Props {
  selected: BirdClass;
  onSelect: (cls: BirdClass) => void;
  onWatch: (species: SpeciesClass) => void;
}

const TABLES: { key: TraitKey; title: string }[] = [
  { key: 'flight', title: 'static flight' },
  { key: 'ecology', title: 'static ecology' },
  { key: 'look', title: 'static look' },
];

/** Everything on this screen is read off the classes at runtime by reflect.ts. */
export function HierarchyView({ selected, onSelect, onWatch }: Props) {
  const tree = useMemo(() => buildTree(SPECIES), []);
  const chain = lineage(selected);
  const isSpecies = selected.taxon.rank === 'species';
  const own = ownBehaviors(selected);
  const inherited = behaviorsOf(selected).filter((b) => !own.includes(b));
  const descendants = SPECIES.filter((s) => s !== selected && lineage(s).includes(selected));

  return (
    <div className="hierarchy">
      <nav className="tree" aria-label="Class hierarchy">
        <Tree node={tree} depth={0} path={chain} selected={selected} onSelect={onSelect} />
      </nav>

      <article className="detail">
        <p className="rank">{selected.taxon.rank}</p>
        <h1>
          {selected.taxon.name} <span className="common">{selected.taxon.common}</span>
        </h1>
        <p className="extends">
          {[...chain].reverse().map((c, i) => (
            <span key={c.taxon.name}>
              {i > 0 && ' extends '}
              <button className="link" onClick={() => onSelect(c)}>
                {c.taxon.name}
              </button>
            </span>
          ))}
        </p>
        <p className="note">{selected.taxon.note}</p>
        {isSpecies && (
          <button className="primary" onClick={() => onWatch(selected as SpeciesClass)}>
            Watch it in the field
          </button>
        )}

        <h2>Defined in this class</h2>
        {own.length === 0 && TABLES.every((t) => ownFields(selected, t.key).length === 0) && (
          <p className="hint">Nothing of its own. It exists to group what is below it and pass down what is above.</p>
        )}
        {own.length > 0 && (
          <ul className="defs">
            {own.map((b) => (
              <li key={b.key}>
                <code>{b.key}()</code>
                <span className={`tag ${b.declaredIn === selected ? 'new' : 'override'}`}>
                  {b.declaredIn === selected ? 'new behavior' : `overrides ${b.declaredIn.taxon.name}`}
                </span>
                <p>
                  <strong>{b.spec.label}.</strong> {b.spec.cue}
                </p>
              </li>
            ))}
          </ul>
        )}
        {TABLES.map((t) => {
          const fields = ownFields(selected, t.key);
          return (
            fields.length > 0 && (
              <div key={t.key} className="table-block">
                <h3>
                  <code>{t.title}</code>
                </h3>
                <table className="traits">
                  <tbody>
                    {fields.map((s) => (
                      <tr key={s.field}>
                        <th>{s.field}</th>
                        <td>
                          <Value value={s.value} />
                        </td>
                        <td className="origin">
                          {s.replaced && (
                            <>
                              replaces <Value value={s.replaced.value} /> from {s.replaced.from.taxon.name}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          );
        })}

        {inherited.length > 0 && (
          <>
            <h2>Inherited behaviors</h2>
            <table className="traits">
              <tbody>
                {inherited.map((b) => (
                  <tr key={b.key}>
                    <th>
                      <code>{b.key}()</code>
                    </th>
                    <td>{b.spec.label}</td>
                    <td className="origin">
                      from{' '}
                      <button className="link" onClick={() => onSelect(b.implementedIn)}>
                        {b.implementedIn.taxon.name}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>Resolved flight profile</h2>
        <p className="hint">What an instance of this class would fly with, and which ancestor had the last word on each value.</p>
        <table className="traits">
          <tbody>
            {traitSources(selected, 'flight').map((s) => (
              <tr key={s.field} className={s.from === selected ? 'mine' : ''}>
                <th>{s.field}</th>
                <td>
                  <Value value={s.value} />
                </td>
                <td className="origin">
                  <button className="link" onClick={() => onSelect(s.from)}>
                    {s.from.taxon.name}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {descendants.length > 0 && (
          <>
            <h2>Species in this group</h2>
            <p className="chips">
              {descendants.map((s) => (
                <button key={s.taxon.name} className="chip" onClick={() => onSelect(s)}>
                  {s.taxon.common}
                </button>
              ))}
            </p>
          </>
        )}
      </article>
    </div>
  );
}

function ownFields(cls: BirdClass, key: TraitKey): TraitSource[] {
  return traitSources(cls, key).filter((s) => s.from === cls);
}

function Tree({ node, depth, path, selected, onSelect }: { node: TreeNode; depth: number; path: BirdClass[]; selected: BirdClass; onSelect: (c: BirdClass) => void }) {
  const t = node.cls.taxon;
  return (
    <>
      <button
        className={`node ${t.rank} ${node.cls === selected ? 'on' : path.includes(node.cls) ? 'path' : ''}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={() => onSelect(node.cls)}
      >
        {t.rank === 'species' ? t.common : t.name}
        {t.rank !== 'species' && <span className="common"> {t.common}</span>}
      </button>
      {node.children.map((c) => (
        <Tree key={c.cls.taxon.name} node={c} depth={depth + 1} path={path} selected={selected} onSelect={onSelect} />
      ))}
    </>
  );
}

function Value({ value }: { value: unknown }) {
  if (typeof value === 'string' && value.startsWith('#')) {
    return (
      <span className="swatch">
        <i style={{ background: value }} /> {value}
      </span>
    );
  }
  if (Array.isArray(value)) return <>{value.length ? value.join(', ') : '(none)'}</>;
  if (value === Infinity) return <>∞</>;
  return <>{String(value)}</>;
}
