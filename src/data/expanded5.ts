import { Vehicle } from '@/lib/types';
import { makeVehicle, PAINT, gens, sounds, standard } from './vehicleFactory';

/** Part 5 — Rolls-Royce Motor Cars. Figures are demo estimates for
 *  developers and are not official spec.
 */

const ArcticWhite = { name: 'Arctic White', hex: '#f0f2f5' };
const EnglishWhite = { name: 'English White', hex: '#e9ebee' };
const BlackDiamond = { name: 'Black Diamond', hex: '#0c0d11' };
const DiamondBlack = { name: 'Diamond Black', hex: '#101318' };
const BespokeBlue = { name: 'Bespoke Salamanca Blue', hex: '#16294a' };
const MidnightSapphire = { name: 'Midnight Sapphire', hex: '#101d38' };
const SilverSand = { name: 'Silver Sand', hex: '#b8babd' };
const BohemianRed = { name: 'Bespoke Bohemian Red', hex: '#5c1420' };
const AndalusianWhite = { name: 'Andalusian White', hex: '#edeff2' };
const DeVilleGrey = { name: 'DeVille Grey', hex: '#6f7378' };
const Chartreuse = { name: 'Bespoke Chartreuse', hex: '#b9c94a' };
const BronzeJade = { name: 'Bronze Jade', hex: '#5d5f4c' };

export const EXPANDED_5: Vehicle[] = [
  makeVehicle({
    id: 'rolls-phantom', brand: 'rolls', model: 'Phantom', trim: 'Extended Series II', generation: 'VIII', year: 2023, body: 'sedan', emoji: '👑',
    engine: '6.75L Twin-Turbo V12', size: '6.75L', cyl: 12, hp: 563, tq: 900,
    trans: '8-speed automatic (ZF)', drive: 'RWD', acc: 5.4, vmax: 250, weight: 2560, L: 5990, W: 2018, H: 1656, wb: 3772,
    econ: '14.5 L/100 km', price: 600000,
    desc: 'The best car in the world. A 6.75-litre V12 wrapped in near-silence, with a Starlight headliner and the Planar suspension that reads the road ahead.',
    history: 'The Phantom name has crowned Rolls-Royce since 1925. The eighth generation (2017, Series II 2023) rides the bespoke Architecture of Luxury aluminium platform.',
    facts: ['The Starlight Headliner plants 1,340 fibre-optic stars hand-drilled into the roof lining.', 'Planar suspension scans the road with a camera to pre-ready the dampers.', 'The Spirit of Ecstasy can be electronically hidden — and is stolen-proof.'],
    ...standard(['Planar suspension with road-scanning camera', 'Starlight Headliner'], ['Lambswool floor mats', 'Bespoke audio 18 speakers', 'Rear theatre configuration', 'Picnic tables']),
    variants: ['Standard Wheelbase', 'Extended Wheelbase', 'Series II'],
    colors: [ArcticWhite, EnglishWhite, BlackDiamond, BespokeBlue],
    genHistory: gens(['I–VI', '1925–1990', '7.0L V12/V8', 220, 10.9, 'The carriage-built icon of the century.'], ['VII', '2003–2016', '6.75L V12', 453, 5.9, 'The BMW-era revival.'], ['VIII', '2017–', '6.75L Twin-Turbo V12', 563, 5.4, 'Architecture of Luxury. Series II 2023.']),
    sound: sounds(70, 12, 'smooth'),
  }),
  makeVehicle({
    id: 'rolls-ghost', brand: 'rolls', model: 'Ghost', trim: 'Extended', generation: 'II', year: 2024, body: 'sedan', emoji: '👑',
    engine: '6.75L Twin-Turbo V12', size: '6.75L', cyl: 12, hp: 571, tq: 850,
    trans: '8-speed automatic (ZF)', drive: 'AWD', acc: 4.8, vmax: 250, weight: 2490, L: 5699, W: 2148, H: 1550, wb: 3463,
    econ: '14.0 L/100 km', price: 400000,
    desc: 'Post-Opulence purity. The Ghost is minimalism executed at Rolls-Royce level — 571 hp, all-wheel drive and the Planar suspension of its bigger sibling.',
    history: 'Launched in 2009 as the "baby Rolls", the second generation (2021) moved to the same aluminium platform as Phantom and Cullinan.',
    facts: ['Micro-environment purification system can freshen the cabin air in three minutes.', 'Illuminated Fascia hides 850 laser-etched stars behind the dash glass — invisible when off.', 'Its door umbrellas stow inside the doors themselves.'],
    ...standard(['Planar suspension', 'Illuminated Fascia'], ['Lambswool mats', 'Bespoke 18-speaker audio', 'Rear lounge seats', 'Panoramic sliding roof']),
    variants: ['Standard', 'Extended', 'Black Badge'],
    colors: [EnglishWhite, SilverSand, MidnightSapphire, DiamondBlack],
    genHistory: gens(['I', '2009–2020', '6.6L Twin-Turbo V12', 563, 4.9, 'The baby Rolls arrives.'], ['II', '2021–', '6.75L Twin-Turbo V12', 571, 4.8, 'Planar suspension, AWD, post-opulence design.']),
    sound: sounds(72, 12, 'smooth'),
  }),
  makeVehicle({
    id: 'rolls-cullinan', brand: 'rolls', model: 'Cullinan', trim: 'Series II', generation: 'I', year: 2025, body: 'suv', emoji: '🏔️',
    engine: '6.75L Twin-Turbo V12', size: '6.75L', cyl: 12, hp: 599, tq: 900,
    trans: '8-speed automatic (ZF)', drive: 'AWD', acc: 5.2, vmax: 250, weight: 2750, L: 5341, W: 2164, H: 1835, wb: 3295,
    econ: '15.5 L/100 km', price: 420000,
    desc: 'The first SUV worthy of the double-R — 599 hp, genuine off-road ability and a Viewing Suite of fold-out seats and cocktail tables.',
    history: 'Named after the largest gem ever found, the Cullinan (2018) put Rolls-Royce into the SUV era; the 2024 Series II refreshed the front and added the Duality Twill interior option.',
    facts: ['The Viewing Suite deploys two leather chairs and tables from the tailgate — the "Viewing Suite".', 'Its single-piece rear glass hides a compartment the company calls The Recess.', 'It fords 540 mm of water and tows 3.5 tonnes — while staying whisper-quiet.'],
    ...standard(['Planar suspension', 'Off-road modes'], ['Viewing Suite', 'Duality Twill bamboo interior (option)', 'Bespoke 18-speaker audio', 'The Recess tailgate compartment']),
    variants: ['Standard', 'Extended', 'Black Badge', 'Series II'],
    colors: [AndalusianWhite, BronzeJade, DiamondBlack, BespokeBlue],
    genHistory: gens(['I', '2018–2023', '6.75L Twin-Turbo V12', 563, 5.2, 'The first Rolls SUV.'], ['Series II', '2024–', '6.75L Twin-Turbo V12', 599, 5.2, 'Redesigned front, Duality Twill.']),
    sound: sounds(74, 12, 'growl'),
  }),
  makeVehicle({
    id: 'rolls-spectre', brand: 'rolls', model: 'Spectre', trim: '', generation: 'I', year: 2024, body: 'gt', emoji: '⚡',
    engine: 'Dual-Motor Electric', size: '—', cyl: 0, hp: 585, tq: 900,
    trans: 'Single-speed', drive: 'AWD', acc: 4.5, vmax: 250, weight: 2975, L: 5453, W: 2080, H: 1559, wb: 3210,
    fuel: 'electric', econ: '~22 kWh/100km', range: 530, price: 450000,
    desc: 'The first fully-electric Rolls-Royce — a 5.5-metre electric super-coupé with 900 Nm of silent, instantaneous torque.',
    history: 'Announced in 2021 as the marque’s "first all-electric motor car", the Spectre entered production in late 2023 on the Architecture of Luxury.',
    facts: ['0–100 km/h in 4.5 seconds — in total silence.', 'Its doors close themselves at the touch of a button (Whisper Whisper actuation).', 'Starlight Doors embed 4,796 stars across the front doors and roof.'],
    ...standard(['Planar suspension', 'Starlight Doors'], ['Illuminated Fascia', 'Bespoke 18-speaker audio', 'Spirit of Ecstasy hood ornament (redesigned aero)', 'Rear wheelchair-accessible (option)']),
    variants: ['Spectre', 'Black Badge'],
    colors: [EnglishWhite, Chartreuse, MidnightSapphire, BlackDiamond],
    sound: sounds(140, 0, 'silence', true),
  }),
  makeVehicle({
    id: 'rolls-wraith', brand: 'rolls', model: 'Wraith', trim: 'Black Badge', generation: 'I', year: 2021, body: 'gt', emoji: '👑',
    engine: '6.6L Twin-Turbo V12', size: '6.6L', cyl: 12, hp: 632, tq: 870,
    trans: '8-speed automatic (ZF)', drive: 'RWD', acc: 4.4, vmax: 250, weight: 2435, L: 5269, W: 1947, H: 1507, wb: 3110,
    econ: '14.0 L/100 km', price: 380000,
    desc: 'The most powerful Rolls of its era — a fastback grand tourer with coach doors, Starlight roof and a 632-hp Black Badge V12.',
    history: 'Produced 2013–2023, the Wraith was the most powerful Rolls-Royce of its generation; Black Badge (2016) darkened it and sharpened the throttle.',
    facts: ['The fastback roofline is a nod to the 1938 Wraith of the pre-war era.', 'Satellite-Aided Transmission reads the road ahead and pre-selects the right gear.', 'The Starlight Headliner here was the first in any Rolls — 1,340 woven lights.'],
    ...standard(['Satellite-Aided Transmission', 'Starlight Headliner'], ['Black Badge dark chrome', 'Bespoke audio 18 speakers', 'Coach doors with power close', 'Carbon-fibre composite wheels (Black Badge)']),
    variants: ['Wraith', 'Black Badge', 'History of Rugby edition'],
    colors: [BlackDiamond, BohemianRed, DeVilleGrey, MidnightSapphire],
    genHistory: gens(['I', '2013–2016', '6.6L Twin-Turbo V12', 624, 4.6, 'The grand tourer era.'], ['Black Badge', '2016–2023', '6.6L Twin-Turbo V12', 632, 4.4, 'The dark alter ego.']),
    sound: sounds(76, 12, 'smooth'),
  }),
];
