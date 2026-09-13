import { Vehicle } from '@/lib/types';
import { VEHICLES } from '@/data';

/**
 * CARVERSE AI — context-aware rule-based assistant (no external API).
 * All answers derive from the local database. Clearly a prototype, not an LLM.
 */

function brand(v: Vehicle): string {
  return v.brand.charAt(0).toUpperCase() + v.brand.slice(1);
}

function money(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

export interface AiReply {
  text: string;
  jumpToId?: string; // vehicle to navigate to
}

export function askCarverseAi(question: string, ctx: Vehicle): AiReply {
  const q = question.toLowerCase();

  const mentioned = VEHICLES.find((v) => {
    const name = `${v.brand} ${v.model}`.toLowerCase();
    return name.includes(q) || q.includes(v.model.toLowerCase());
  });
  const other = mentioned && mentioned.id !== ctx.id ? mentioned : null;

  if (other) {
    const verdict =
      other.acceleration < ctx.acceleration
        ? `${other.model} is faster to 100 ( ${other.acceleration}s vs ${ctx.acceleration}s).`
        : ctx.acceleration < other.acceleration
        ? `${ctx.model} is faster to 100 ( ${ctx.acceleration}s vs ${other.acceleration}s).`
        : 'They accelerate identically on paper.';
    return {
      text: `Comparing **${ctx.model}** vs **${other.model}**: ${verdict} Power: ${ctx.horsepower} hp vs ${other.horsepower} hp. Price: ${money(ctx.price)} vs ${money(other.price)}.`,
      jumpToId: other.id,
    };
  }

  if (/\b(faster|quicker|acceleration|0-100|0–100|speed)\b/.test(q)) {
    const faster = VEHICLES.filter((v) => v.acceleration < ctx.acceleration).length;
    return {
      text: `**${ctx.model}** does 0–100 in ${ctx.acceleration}s (top speed ${ctx.topSpeed} km/h). ${faster} cars in the database are quicker on paper. Want me to compare it with a rival?`,
    };
  }

  if (/\b(cheaper|price|cost|budget|afford)\b/.test(q)) {
    const cheaper = VEHICLES.filter((v) => v.price < ctx.price).slice(-3);
    return {
      text: `${ctx.model} is listed around ${money(ctx.price)} (demo figure). Cheaper alternatives: ${cheaper
        .map((v) => `${v.model} (${money(v.price)})`)
        .join(', ')}.`,
    };
  }

  if (/\b(famil|practical|boot|trunk|luggage|space|daily|commute|comfort)\b/.test(q)) {
    const practical = ctx.seats >= 4 && ctx.bootCapacity >= 400;
    return {
      text: practical
        ? `**${ctx.model}** is genuinely practical: ${ctx.seats} seats, ${ctx.bootCapacity} L of boot space, ${ctx.fuelType === 'electric' ? `${ctx.electricRange} km range` : ctx.fuelEconomy}. Daily driving: no problem.`
        : `**${ctx.model}** is a ${ctx.seats}-seater with ${ctx.bootCapacity} L of boot — built for enjoyment, not errands. A practical daily needs 4+ seats and 400+ L.`,
    };
  }

  if (/\b(long.?distance|road.?trip|touring|highway|motorway)\b/.test(q)) {
    const gt = ctx.bodyType === 'gt' || ctx.seats >= 4;
    return {
      text: gt
        ? `Yes — with ${ctx.seats} seats and a long-range fuel tank/battery, the ${ctx.model} is a proper grand tourer.`
        : `The ${ctx.model} is usable on trips, but a dedicated GT (S-Class, AMG GT) or a long-range EV (Model S) will pamper you more.`,
    };
  }

  if (/\b(power|hp|horsepower|torque)\b/.test(q)) {
    return {
      text: `**${ctx.model}** produces ${ctx.horsepower} hp and ${ctx.torque} Nm from its ${ctx.engine}. That's about ${(ctx.horsepower / (ctx.weight / 1000)).toFixed(0)} hp per tonne.`,
    };
  }

  if (/\b(electric|ev|range|charge)\b/.test(q)) {
    return {
      text:
        ctx.fuelType === 'electric'
          ? `The ${ctx.model} is fully electric with ~${ctx.electricRange} km of range.`
          : `The ${ctx.model} is ${ctx.fuelType}-powered${ctx.electricRange > 0 ? ` with ~${ctx.electricRange} km of electric range` : ''}. For pure EVs, check the Tesla Model S (600 km) or Taycan (630 km).`,
    };
  }

  if (/\b(sound|noise|exhaust|loud)\b/.test(q)) {
    return {
      text: `Open the **SOUND** mode to hear a demo synthesised from the ${ctx.engine} profile. Real engine recordings can be plugged into the database per car.`,
    };
  }

  if (/\b(best|recommend|which car|suggest)\b/.test(q)) {
    const fastest = VEHICLES.reduce((a, b) => (b.acceleration < a.acceleration ? b : a));
    const cheapest = VEHICLES.reduce((a, b) => (b.price < a.price ? b : a));
    return {
      text: `In this database: fastest is the **${fastest.model}** (${fastest.acceleration}s), best value is the **${cheapest.model}** (${money(cheapest.price)}). Ask me “is this practical?” while viewing any car for a tailored answer.`,
    };
  }

  return {
    text: `I'm a demo assistant running on the local CARVERSE database. Ask me about the **${ctx.model}** — its speed, price, practicality, sound — or name another car (e.g. “Compare this with the Model S”).`,
  };
}
