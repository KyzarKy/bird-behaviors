// Contact sheets: how every feeding behavior looks, one PNG per bird, scene and behavior.
//   npm run sheets -- <outdir> [regex] [--peek]
// The regex is matched against "Common name scene key", e.g. "Pewee" or "Creeper yard|Kingfisher beach hoverHunt".
// Each sheet starts with a map of the whole scene: the bird's path (blue), the food's site (dashed orange box), every take (red X),
// and where the hunted animal was drawn (green dots). The path turns magenta where the bird moves backward, against the way it
// faces, on foot, on the water or under it.
// --peek starts each behavior with the food showing in a peek (green ring on the map), to check that the bird goes for that one
// and the animal doesn't jump somewhere else before it is taken.
// After the map come up to 29 frames following the bird, always including the frame at each take. Each frame has the same overlays.
// meta.json in <outdir> has the label, description, length and takes of every sheet, plus `backward` (seconds moving backward)
// and, with --peek, `peek`: "taken" (the one that showed), "ignored" (it hid and the bird went for another) or "jumped".
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const args = process.argv.slice(2);
const withPeek = args.includes('--peek');
const [out, filter = ''] = args.filter((a) => a !== '--peek');
if (!out) throw new Error('usage: npm run sheets -- <outdir> [regex]');
mkdirSync(out, { recursive: true });
const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(server.resolvedUrls.local[0]);
const list = await page.evaluate(async () => {
  const { SPECIES } = await import('/src/birds/taxonomy/index.ts');
  const { behaviorsOf } = await import('/src/birds/core/reflect.ts');
  const { HABITATS } = await import('/src/birds/core/World.ts');
  const { inScene } = await import('/src/ui/season.ts');
  const rows = [];
  for (const cls of SPECIES)
    for (const scene of Object.keys(HABITATS).filter((h) => inScene(cls, h)))
      for (const b of behaviorsOf(cls).filter((b) => b.spec.feeding)) rows.push([cls.taxon.common, scene, b.key]);
  return rows;
});
const todo = list.filter((r) => new RegExp(filter, 'i').test(r.join(' ')));
console.log(todo.length, 'sheets');
const meta = [];
try {
for (const [name, scene, key] of todo) {
  const res = await page.evaluate(
    async ([name, scene, key, withPeek]) => {
      const { SPECIES } = await import('/src/birds/taxonomy/index.ts');
      const { behaviorsOf } = await import('/src/birds/core/reflect.ts');
      const { HABITATS, World, STAGE, peekSpot } = await import('/src/birds/core/World.ts');
      const { eatsIn, FOODS } = await import('/src/birds/core/food.ts');
      const { drawBird } = await import('/src/render/drawBird.ts');
      const { drawFoodBack, drawFoodFront } = await import('/src/render/drawFood.ts');
      const { drawBackdrop, drawForeground } = await import('/src/render/drawWorld.ts');
      const cls = SPECIES.find((c) => c.taxon.common === name);
      const spec = behaviorsOf(cls).find((b) => b.key === key).spec;
      const kind = eatsIn(spec, scene);
      const bird = new cls(new World(HABITATS[scene]));
      if (bird.missing(key)) return null;
      const W = 330, H = 205, ZOOM = 2.6;
      const HEIGHT = STAGE.top - STAGE.bottom;
      const path = [];
      const takes = [];
      // Where the hunted animal was drawn each frame, and where a peek showed it at the start.
      const preyPath = [];
      let peekAt = null;
      let t = 0;
      const eat = bird.world.eat.bind(bird.world);
      bird.world.eat = (k, at) => (takes.push([+t.toFixed(2), +at.x.toFixed(1), +at.y.toFixed(1)]), eat(k, at));

      // The food's site, the path so far and the takes so far, in world units (`px` is one screen pixel).
      const overlay = (ctx, px, upTo) => {
        const site = bird.meal?.site;
        ctx.lineWidth = 1.5 * px;
        if (site) {
          const s = site.spread ?? 0;
          ctx.strokeStyle = '#e8870e';
          ctx.setLineDash([4 * px, 3 * px]);
          ctx.strokeRect(site.x[0], site.y - s - 0.3, site.x[1] - site.x[0], 2 * s + 0.6);
          ctx.setLineDash([]);
        }
        const shown = path.filter((p) => p.t <= upTo);
        for (let i = 1; i < shown.length; i++) {
          ctx.strokeStyle = shown[i].back ? 'rgba(220,0,200,0.9)' : 'rgba(30,90,220,0.7)';
          ctx.beginPath();
          ctx.moveTo(shown[i - 1].x, shown[i - 1].y);
          ctx.lineTo(shown[i].x, shown[i].y);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(20,150,40,0.8)';
        for (const p of preyPath.filter((p) => p.t <= upTo)) ctx.fillRect(p.x - px, p.y - px, 2 * px, 2 * px);
        if (peekAt) {
          ctx.strokeStyle = 'rgba(20,150,40,0.9)';
          ctx.beginPath();
          ctx.arc(peekAt.x, peekAt.y, 5 * px, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.strokeStyle = '#e01010';
        ctx.lineWidth = 2 * px;
        for (const [tt, x, y] of takes.filter(([tt]) => tt <= upTo)) {
          const r = 4 * px;
          ctx.beginPath();
          ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x - r, y + r); ctx.lineTo(x + r, y - r);
          ctx.stroke();
        }
      };
      const scene_ = (ctx) => {
        drawBackdrop(ctx, bird.world);
        drawFoodBack(ctx, bird.world);
        drawBird(ctx, bird);
        for (const o of bird.party) drawBird(ctx, o);
        drawFoodFront(ctx, bird.world);
        drawForeground(ctx, bird.world);
      };
      const caption = (ctx, text) => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(0, 0, W, 16);
        ctx.fillStyle = '#000';
        ctx.font = '11px sans-serif';
        ctx.fillText(text, 4, 12);
      };
      const frames = [];
      const snap = (take = false) => {
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const ctx = c.getContext('2d');
        const halfW = STAGE.width / 2 / ZOOM, halfH = HEIGHT / 2 / ZOOM;
        const cx = Math.max(halfW, Math.min(STAGE.width - halfW, bird.pos.x));
        // Centered on the bird, or between its back and its bill when the bill reaches down past its feet (an upend, a dive).
        const low = Math.min(bird.pos.y, bird.billTip().y);
        const cy = Math.max(STAGE.bottom + halfH, Math.min(STAGE.top - halfH, (bird.pos.y + bird.size + low) / 2));
        const k = (W / STAGE.width) * ZOOM;
        ctx.setTransform(k, 0, 0, -k, W / 2 - cx * k, H / 2 + cy * k);
        scene_(ctx);
        overlay(ctx, 1 / k, t);
        const q = bird.world.prey;
        caption(ctx, `${t.toFixed(1)}s ${bird.pose.carry ? 'holds ' + bird.pose.carry : ''} ${q ? 'prey ' + q.x.toFixed(0) + ',' + q.y.toFixed(1) : ''} x=${bird.pos.x.toFixed(0)}`);
        frames.push({ c, t, take });
      };

      bird.update(1 / 60);
      if (withPeek && FOODS[kind]?.hidden) {
        bird.world.stock([kind]);
        const f = bird.world.food.find((f) => f.kind === kind);
        const u = f?.units[Math.floor(Math.random() * f.units.length)];
        if (f) {
          bird.world.peek = { kind, x: u ? u.x : f.site.x[0] + Math.random() * (f.site.x[1] - f.site.x[0]), y: u ? u.y : f.site.y, t: 0.6, seconds: 2 };
          peekAt = peekSpot(bird.world.peek, bird.world.habitat);
        }
      }
      bird.perform(key);
      let peek = peekAt ? 'pending' : undefined;
      let backward = 0;
      let frame = 0;
      let taken = 0;
      snap();
      while (bird.current !== null && frame < 60 * 90) {
        const x0 = bird.pos.x;
        const before = takes.length;
        bird.world.step(1 / 60);
        bird.update(1 / 60);
        t += 1 / 60;
        // Backward: against the way it faces, while walking, swimming or diving (not in the air, where it can hover and drift).
        const back = !bird.airborne && (bird.pos.x - x0) * bird.pose.facing < -0.01;
        if (back) backward += 1 / 60;
        path.push({ t, x: bird.pos.x, y: bird.pos.y + bird.size * 0.3, back });
        const q = bird.world.prey;
        const last = preyPath[preyPath.length - 1];
        if (peek === 'pending' && takes.length > before) peek = 'taken';
        else if (peek === 'pending' && q) peek = Math.hypot(q.x - peekAt.x, q.y - peekAt.y) < 2 ? 'seen' : 'ignored';
        else if (peek === 'seen' && takes.length > before) peek = 'taken';
        else if (peek === 'seen' && (!q || (last && Math.hypot(q.x - last.x, q.y - last.y) > 2))) peek = 'jumped';
        if (q) preyPath.push({ t, x: q.x, y: q.y });
        // Every 0.2 s, and always the frame of a take.
        if (++frame % 12 === 0 || takes.length > taken) snap(takes.length > taken);
        taken = takes.length;
      }
      snap();

      // The whole scene, with the full path and every take.
      const map = document.createElement('canvas');
      map.width = W;
      map.height = H;
      const mctx = map.getContext('2d');
      const mk = Math.min(W / STAGE.width, H / HEIGHT);
      mctx.fillStyle = '#fff';
      mctx.fillRect(0, 0, W, H);
      mctx.setTransform(mk, 0, 0, -mk, (W - STAGE.width * mk) / 2, H / 2 + ((STAGE.bottom + STAGE.top) / 2) * mk);
      scene_(mctx);
      overlay(mctx, 1 / mk, Infinity);
      caption(mctx, `map: ${takes.length} take(s)${backward > 0.1 ? `, BACKWARD ${backward.toFixed(1)}s` : ''}${peek ? `, peek ${peek}` : ''}`);

      // 29 frames at most: every take frame, then evenly spaced fill.
      const keep = new Set(frames.filter((f) => f.take));
      for (let i = 0; keep.size < Math.min(29, frames.length) && i < 29; i++) keep.add(frames[Math.round((i * (frames.length - 1)) / 28)]);
      const pick = [{ c: map }, ...frames.filter((f) => keep.has(f)).slice(0, 29)];
      const cols = 6, rows = Math.ceil(pick.length / cols);
      const sheet = document.createElement('canvas');
      sheet.width = cols * W;
      sheet.height = rows * H + 40;
      const s = sheet.getContext('2d');
      s.fillStyle = '#fff';
      s.fillRect(0, 0, sheet.width, sheet.height);
      s.fillStyle = '#000';
      s.font = 'bold 16px sans-serif';
      s.fillText(`${name} (${scene}): ${spec.label} [${key}] eats ${kind} -> ${FOODS[kind].item}   ${t.toFixed(1)}s`, 6, 18);
      s.font = '12px sans-serif';
      s.fillText(spec.cue.slice(0, 250), 6, 34);
      pick.forEach(({ c }, i) => s.drawImage(c, (i % cols) * W, 40 + Math.floor(i / cols) * H));
      return { url: sheet.toDataURL('image/png'), takes, secs: +t.toFixed(1), label: spec.label, kind, cue: spec.cue, backward: +backward.toFixed(1), peek };
    },
    [name, scene, key, withPeek],
  );
  if (!res) continue;
  const file = `${name.replace(/[^A-Za-z]+/g, '')}-${scene}-${key}.png`;
  writeFileSync(`${out}/${file}`, Buffer.from(res.url.split(',')[1], 'base64'));
  meta.push({ file, name, scene, key, label: res.label, kind: res.kind, cue: res.cue, secs: res.secs, takes: res.takes, backward: res.backward, peek: res.peek });
  process.stdout.write('.');
}
writeFileSync(`${out}/meta.json`, JSON.stringify(meta, null, 1));
} finally {
  await browser.close();
  await server.close();
}
console.log('\ndone');
