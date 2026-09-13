import { Vehicle } from '@/lib/types';
import { makeVehicle, PAINT, gens, sounds, standard } from './vehicleFactory';

/** Part 4 — Indian market: Maruti Suzuki, Tata, Mahindra.
 *  Figures are demo estimates for developers and are not official spec.
 */

const IndiBlue = { name: 'Pearl Arctic White', hex: '#eef0f4' };
const SplendidSilver = { name: 'Splendid Silver', hex: '#a9adb3' };
const SizzlingRed = { name: 'Sizzling Red', hex: '#b3232b' };
const NexonBlue = { name: 'Creative Ocean Blue', hex: '#1e4f8f' };
const PristineBronze = { name: 'Pristine Bronze', hex: '#7d6547' };
const EverestWhite = { name: 'Everest White', hex: '#eceef2' };
const DeepForest = { name: 'Deep Forest', hex: '#22402f' };
const RedRage = { name: 'Red Rage', hex: '#b01e24' };
const MysticCopper = { name: 'Mystic Copper', hex: '#8a5a3a' };
const EverestBlack = { name: 'Everest Black', hex: '#0e1013' };
const ThunderBlack = { name: 'Thunder Black', hex: '#101216' };
const DazzlingSilver = { name: 'Dazzling Silver', hex: '#b6bac0' };
const TangoRed = { name: 'Tango Red', hex: '#c22730' };
const AutumnBronze = { name: 'Autumn Bronze', hex: '#7a5c3c' };

export const EXPANDED_4: Vehicle[] = [
  /* ================= MARUTI SUZUKI ================= */
  makeVehicle({
    id: 'maruti-swift', brand: 'maruti', model: 'Swift', trim: 'ZXi+', generation: 'Gen 4', year: 2024, body: 'hot-hatch', emoji: '🚗',
    engine: '1.2L Z-Series 3-Cyl Petrol', size: '1.2L', cyl: 3, hp: 82, tq: 112,
    trans: '5-speed manual / AMT', drive: 'FWD', acc: 12.4, vmax: 165, weight: 935, L: 3860, W: 1735, H: 1520, wb: 2450,
    econ: '5.0 L/100 km', price: 13500,
    desc: 'India’s favourite hatchback for two decades — featherweight, frugal and everywhere. The fourth gen adds a peppy new Z-series engine.',
    history: 'Launched in 2005 and redefining the premium hatch, the Swift has topped Indian sales charts across four generations.',
    facts: ['Over 3 million Swifts have been sold in India since 2005.', 'The fourth-gen Z12E engine is a 3-cylinder tuned for efficiency.', 'It is built at Maruti’s Manesar plant and exported to 100+ countries.'],
    ...standard([], ['Fabric seats', '9-inch SmartPlay Pro+ display', 'Wireless charging', '6 airbags (2024+)']),
    variants: ['LXi', 'VXi', 'ZXi+', 'ZXi+ AMT'],
    colors: [IndiBlue, SizzlingRed, SplendidSilver, EverestBlack],
    genHistory: gens(['Gen 1', '2005–2010', '1.3L K-series', 87, 12.0, 'The hatch that changed India.'], ['Gen 2', '2011–2017', '1.2L K-series', 86, 11.8, 'Bigger, safer, still fun.'], ['Gen 3', '2018–2023', '1.2L Dualjet', 90, 11.5, 'SHVS mild-hybrid arrives.'], ['Gen 4', '2024–', '1.2L Z12E', 82, 12.4, 'Three cylinders, new era.']),
    sound: sounds(95, 3, 'buzz'),
  }),
  makeVehicle({
    id: 'maruti-baleno', brand: 'maruti', model: 'Baleno', trim: 'Alpha', generation: 'Gen 2', year: 2024, body: 'hot-hatch', emoji: '🚗',
    engine: '1.2L K-Series 4-Cyl Petrol', size: '1.2L', cyl: 4, hp: 90, tq: 113,
    trans: '5-speed manual / AMT', drive: 'FWD', acc: 11.9, vmax: 170, weight: 965, L: 3990, W: 1745, H: 1500, wb: 2520,
    econ: '5.0 L/100 km', price: 15000,
    desc: 'The premium Nexa hatchback — a class-up cabin, light kerb weight and the smooth K12 four-cylinder.',
    history: 'Introduced in 2015 as Maruti’s premium offering through the NEXA retail channel; the second gen (2022) brought the CNG option and more tech.',
    facts: ['The Baleno is sold in Africa and Asia as the Suzuki Glanza and Toyota Starlet.', 'It was the first Maruti with a 360-degree camera in class.', 'Built on the lightweight Heartect platform.'],
    ...standard([], ['Premium fabric seats', '9-inch display', 'Head-up display', 'Arkamys audio']),
    variants: ['Sigma', 'Delta', 'Zeta', 'Alpha'],
    colors: [IndiBlue, SplendidSilver, SizzlingRed, EverestWhite],
    genHistory: gens(['Gen 1', '2015–2021', '1.2L K12', 83, 12.3, 'NEXA’s first hatch.'], ['Gen 2', '2022–', '1.2L K12 Dualjet', 90, 11.9, 'More tech, CNG option.']),
    sound: sounds(90, 4, 'flat'),
  }),
  makeVehicle({
    id: 'maruti-dzire', brand: 'maruti', model: 'Dzire', trim: 'ZXi+', generation: 'Gen 4', year: 2025, body: 'sedan', emoji: '🚗',
    engine: '1.2L Z-Series 3-Cyl Petrol', size: '1.2L', cyl: 3, hp: 82, tq: 112,
    trans: '5-speed manual / AMT', drive: 'FWD', acc: 12.7, vmax: 165, weight: 985, L: 3995, W: 1735, H: 1515, wb: 2450,
    econ: '4.9 L/100 km', price: 14000,
    desc: 'India’s best-selling compact sedan — Swift bones with a boot, five-star safety and segment-first sunroof.',
    history: 'Spun off the Swift since 2008, the Dzire has been the default family sedan of middle India across four generations.',
    facts: ['The fourth gen (2024) scored 5 stars in Global NCAP — a first for the nameplate.', 'It got a segment-first electric sunroof.', 'The boot adds 315 litres over the Swift.'],
    ...standard([], ['Fabric seats', '9-inch SmartPlay Pro+', 'Electric sunroof', 'Rear AC vents']),
    variants: ['LXi', 'VXi', 'ZXi', 'ZXi+'],
    colors: [IndiBlue, SplendidSilver, SizzlingRed, EverestWhite],
    genHistory: gens(['Gen 1', '2008–2016', '1.2L K12', 87, 12.9, 'Swift with a boot.'], ['Gen 2', '2017–2023', '1.2L Dualjet', 90, 12.1, 'SHVS mild-hybrid.'], ['Gen 4', '2024–', '1.2L Z12E', 82, 12.7, '5-star safety era.']),
    sound: sounds(92, 3, 'buzz'),
  }),
  makeVehicle({
    id: 'maruti-fronx', brand: 'maruti', model: 'Fronx', trim: 'Turbo Delta+', generation: '—', year: 2024, body: 'suv', emoji: '🚙',
    engine: '1.0L Boosterjet Turbo 3-Cyl', size: '1.0L', cyl: 3, hp: 100, tq: 148,
    trans: '5-speed manual / 6-speed AT', drive: 'FWD', acc: 10.5, vmax: 180, weight: 1060, L: 3995, W: 1765, H: 1550, wb: 2520,
    econ: '5.3 L/100 km', price: 16000,
    desc: 'A coupe-styled compact crossover with the peppy Boosterjet turbo — NEXA’s take on the SUV-coupe trend.',
    history: 'Revealed at Auto Expo 2023, the Fronx became an instant export hit — shipped to Japan and 40+ markets.',
    facts: ['It is exported to Japan — a rare made-in-India car sold in Suzuki’s home market.', 'The 1.0 turbo makes 100 hp, the punchiest Maruti petrol in years.', 'Coupe roofline with SUV ground clearance of 170 mm.'],
    ...standard([], ['Bolstered seats', '9-inch display', '360-degree camera', 'Arkamys audio']),
    variants: ['Sigma', 'Delta', 'Delta+', 'Turbo Delta+'],
    colors: [NexonBlue, SplendidSilver, EverestWhite, EverestBlack],
    sound: sounds(105, 3, 'buzz'),
  }),

  /* ================= TATA ================= */
  makeVehicle({
    id: 'tata-nexon', brand: 'tata', model: 'Nexon', trim: 'Creative+ Turbo', generation: 'Gen 2 FL', year: 2024, body: 'suv', emoji: '🚙',
    engine: '1.2L Turbo Petrol (Revotron)', size: '1.2L', cyl: 3, hp: 120, tq: 170,
    trans: '6-speed manual / AMT / DCT', drive: 'FWD', acc: 11.2, vmax: 175, weight: 1245, L: 3995, W: 1804, H: 1620, wb: 2498,
    econ: '6.0 L/100 km', price: 13000,
    desc: 'India’s best-selling SUV and a 5-star Global NCAP benchmark — the 2023 facelift sharpened styling and added a DCT.',
    history: 'Launched in 2017, the Nexon made safety mainstream in India with the country’s first 5-star Global NCAP rating for a compact SUV.',
    facts: ['The first Indian car to score 5 stars in Global NCAP (2018).', 'Over 500,000 units sold; consistently India’s top-selling SUV.', 'The facelift added a 7-speed DCA dual-clutch option.'],
    ...standard(['Multi-drive modes'], ['Leatherette (option)', '10.25-inch displays', '360-degree camera', 'JBL audio (option)']),
    variants: ['Smart', 'Pure', 'Creative', 'Fearless'],
    colors: [NexonBlue, PristineBronze, EverestWhite, EverestBlack],
    genHistory: gens(['Gen 1', '2017–2020', '1.2L Revotron', 110, 12.5, 'First 5-star GNCAP Tata.'], ['Gen 2', '2020–2023', '1.2L Turbo', 120, 11.8, 'The best-seller matures.'], ['Gen 2 FL', '2023–', '1.2L Turbo DCA', 120, 11.2, 'Sharp facelift, DCT added.']),
    sound: sounds(100, 3, 'buzz'),
  }),
  makeVehicle({
    id: 'tata-punch', brand: 'tata', model: 'Punch', trim: 'Creative AMT', generation: '—', year: 2024, body: 'suv', emoji: '🚙',
    engine: '1.2L Naturally-Aspirated Petrol', size: '1.2L', cyl: 3, hp: 88, tq: 115,
    trans: '5-speed manual / AMT', drive: 'FWD', acc: 14.0, vmax: 155, weight: 1035, L: 3827, W: 1742, H: 1615, wb: 2445,
    econ: '5.5 L/100 km', price: 10500,
    desc: 'A micro-SUV with big-SUV stance — 187 mm of clearance, 5-star safety and CNG option in the tiniest Tata.',
    history: 'Launched in 2021 on the ALFA architecture; the Punch quickly became one of India’s top-10 sellers and spawned a long-range EV.',
    facts: ['It scored 5 stars in Global NCAP — rare in the micro segment.', 'The Punch EV (2024) uses Tata’s Acti.ev architecture.', '187 mm ground clearance gives it true SUV stance.'],
    ...standard([], ['Fabric seats', '10.25-inch display', 'Rear parking camera', 'iRA connected tech']),
    variants: ['Pure', 'Adventure', 'Creative', 'Creative AMT'],
    colors: [TangoRed, EverestWhite, DeepForest, ThunderBlack],
    sound: sounds(88, 3, 'flat'),
  }),
  makeVehicle({
    id: 'tata-harrier', brand: 'tata', model: 'Harrier', trim: 'Fearless+', generation: 'Gen 2 FL', year: 2024, body: 'suv', emoji: '🏔️',
    engine: '2.0L Kryotec Turbo-Diesel', size: '2.0L', cyl: 4, hp: 170, tq: 350,
    trans: '6-speed manual / 6-speed AT', drive: 'FWD', acc: 10.5, vmax: 180, weight: 1720, L: 4605, W: 1922, H: 1718, wb: 2741,
    fuel: 'diesel', econ: '7.0 L/100 km', price: 22000,
    desc: 'Land-Rover-derived OMEGA architecture, a torquey Kryotec diesel and road presence by the hectare.',
    history: 'Launched 2019 on the OMEGA-Arc platform derived from the Land Rover Discovery Sport’s D8 architecture; the 2023 facelift added ADAS and a bigger screen.',
    facts: ['It shares its platform bones with the Land Rover Discovery Sport.', 'The Kryotec diesel makes 350 Nm from just 1,750 rpm.', 'The 2023 update brought a 12.3-inch display and ADAS.'],
    ...standard(['ADAS suite', 'Terrain modes'], ['Ventilated leatherette', '12.3-inch display', 'JBL 10-speaker audio', 'Panoramic sunroof']),
    variants: ['Smart', 'Pure', 'Adventure', 'Fearless+'],
    colors: [DeepForest, EverestWhite, RedRage, MysticCopper],
    sound: sounds(75, 4, 'flat'),
  }),
  makeVehicle({
    id: 'tata-nexon-ev', brand: 'tata', model: 'Nexon EV', trim: 'Empowered+ LR', generation: 'Ziptron FL', year: 2024, body: 'suv', emoji: '⚡',
    engine: 'Permanent-Magnet Synchronous Motor', size: '—', cyl: 0, hp: 143, tq: 215,
    trans: 'Single-speed', drive: 'FWD', acc: 9.9, vmax: 150, weight: 1500, L: 3994, W: 1811, H: 1616, wb: 2498,
    fuel: 'electric', econ: '~15 kWh/100km', range: 465, price: 18000,
    desc: 'India’s default electric SUV — the long-range Nexon EV pairs a 45 kWh pack with 465 km of claimed range.',
    history: 'The original Nexon EV (2020) kick-started mainstream Indian EVs; the 2023 facelift brought the bigger 45 kWh pack and 400+ km of real range.',
    facts: ['India’s best-selling electric SUV since launch.', 'Ziptron powertrain with V2V and V2L charging.', 'Supports DC fast charging to 70% in about an hour.'],
    ...standard(['Multi-mode regen'], ['Leatherette', '10.25-inch displays', '360-degree camera', 'JBL audio']),
    variants: ['Creative', 'Fearless', 'Empowered+ LR'],
    colors: [NexonBlue, EverestWhite, PristineBronze, ThunderBlack],
    sound: sounds(140, 0, 'silence', true),
  }),

  /* ================= MAHINDRA ================= */
  makeVehicle({
    id: 'mahindra-thar', brand: 'mahindra', model: 'Thar', trim: 'LX Hard-Top', generation: 'Gen 2', year: 2024, body: 'suv', emoji: '🏔️',
    engine: '2.0L mStallion Turbo-Petrol', size: '2.0L', cyl: 4, hp: 150, tq: 320,
    trans: '6-speed manual / 6-speed AT', drive: 'AWD', acc: 11.5, vmax: 155, weight: 1650, L: 3985, W: 1820, H: 1844, wb: 2450,
    econ: '8.5 L/100 km', price: 17500,
    desc: 'India’s icon of getaway — proper low-range 4×4, removable doors, and water-wading ability of 650 mm.',
    history: 'Derived from the MM540 lineage, the second-gen Thar (2020) brought modern powertrains and went viral on its Independence Day launch.',
    facts: ['It fords 650 mm of water and climbs 45° grades in low range.', 'Convertible, hard-top and convertible-with-doors-off configs exist.', 'Named after the Thar desert of Rajasthan.'],
    ...standard(['Mechanical locking diff', 'Low-range transfer case'], ['Water-resistant controls', '7-inch touchscreen', 'Washer-ready cabin', 'Roll cage']),
    variants: ['AX (O)', 'LX Convertible', 'LX Hard-Top', 'Thar Roxx'],
    colors: [RedRage, DeepForest, EverestWhite, ThunderBlack],
    genHistory: gens(['MM540', '1985–2010', '2.1L–2.5L Diesel', 62, 22, 'The workhorse legend.'], ['Gen 1', '2010–2020', '2.5L CRDe', 105, 14.0, 'The getaway car nameplate.'], ['Gen 2', '2020–', '2.0L mStallion', 150, 11.5, 'Modern icon, viral launch.']),
    sound: sounds(90, 4, 'growl'),
  }),
  makeVehicle({
    id: 'mahindra-xuv700', brand: 'mahindra', model: 'XUV700', trim: 'AX7 L AWD', generation: '—', year: 2024, body: 'suv', emoji: '🚙',
    engine: '2.0L mStallion Turbo-Petrol', size: '2.0L', cyl: 4, hp: 200, tq: 380,
    trans: '6-speed manual / 6-speed AT', drive: 'AWD', acc: 9.0, vmax: 190, weight: 1930, L: 4695, W: 1890, H: 1755, wb: 2750,
    econ: '8.0 L/100 km', price: 25000,
    desc: 'Mahindra’s flagship seven-seater — 200 hp mStallion turbo, AdrenoX tech and segment-first ADAS.',
    history: 'Launched 2021 as the successor to the XUV500; it set benchmark performance figures for Indian SUVs and won multiple Car of the Year awards.',
    facts: ['The mStallion 2.0 is India’s most powerful series-production petrol in class at 200 hp.', 'AdrenoX runs Alexa built-in.', 'The AX7 L adds dual panoramic screens and 12 speakers.'],
    ...standard(['ADAS suite', '7 drive modes'], ['Leatherette captain seats', 'Dual 10.25-inch displays', 'Sony 12-speaker audio', 'Panoramic sunroof']),
    variants: ['MX', 'AX5', 'AX7', 'AX7 L AWD'],
    colors: [EverestWhite, DazzlingSilver, DeepForest, ThunderBlack],
    genHistory: gens(['XUV500', '2011–2022', '2.2L mHawk', 140, 12.0, 'The W8 legend that started it.'], ['XUV700', '2021–', '2.0L mStallion', 200, 9.0, 'AdrenoX and ADAS arrive.']),
    sound: sounds(85, 4, 'growl'),
  }),
  makeVehicle({
    id: 'mahindra-scorpio-n', brand: 'mahindra', model: 'Scorpio-N', trim: 'Z8 L 4WD', generation: 'Gen 3', year: 2024, body: 'suv', emoji: '🏔️',
    engine: '2.2L mHawk Turbo-Diesel', size: '2.2L', cyl: 4, hp: 175, tq: 400,
    trans: '6-speed manual / 6-speed AT', drive: 'AWD', acc: 11.0, vmax: 165, weight: 1980, L: 4662, W: 1917, H: 1857, wb: 2750,
    fuel: 'diesel', econ: '8.5 L/100 km', price: 22500,
    desc: 'The Big Daddy of SUVs returns — body-on-frame, 400 Nm mHawk diesel and genuine low-range 4×4.',
    history: 'The Scorpio (2002) put Mahindra on the global map; the third-gen Scorpio-N (2022) modernised the ladder-frame legend.',
    facts: ['It retains body-on-frame construction with a proper transfer case.', 'The mHawk diesel makes 400 Nm — highest in class.', 'The original Scorpio was exported to 80+ countries.'],
    ...standard(['Low-range 4WD', 'Terrain modes'], ['Leatherette', '12-speaker Sony audio', '8-inch display', 'Dual-zone climate']),
    variants: ['Z2', 'Z4', 'Z8', 'Z8 L 4WD'],
    colors: [EverestWhite, DazzlingSilver, DeepForest, ThunderBlack],
    genHistory: gens(['Gen 1', '2002–2014', '2.6L CRDe', 109, 15.5, 'India’s first global SUV.'], ['Gen 2', '2014–2022', '2.2L mHawk', 120, 13.5, 'The S10 refinement era.'], ['Gen 3', '2022–', '2.2L mHawk', 175, 11.0, 'The Big Daddy, re-engineered.']),
    sound: sounds(78, 4, 'flat'),
  }),
  makeVehicle({
    id: 'mahindra-be6', brand: 'mahindra', model: 'BE 6', trim: 'Pack 3', generation: 'BE', year: 2025, body: 'suv', emoji: '⚡',
    engine: 'Rear Axle BLDC Motor (59 kWh)', size: '—', cyl: 0, hp: 286, tq: 380,
    trans: 'Single-speed', drive: 'RWD', acc: 6.7, vmax: 200, weight: 2050, L: 4371, W: 1907, H: 1627, wb: 2775,
    fuel: 'electric', econ: '~17 kWh/100km', range: 535, price: 26000,
    desc: 'Mahindra’s Born-Electric flagship — rear-drive, sci-fi styling, 286 hp and 535 km of range.',
    history: 'Unveiled in 2023 under the INGLO platform as the first of the BE (Born-Electric) line; deliveries began in 2025.',
    facts: ['The BE 6 sprints 0–100 in 6.7 s — quickest Indian production SUV.', '175 kW DC charging adds 200 km in about 20 minutes.', 'Its jagged design language comes straight from the 2022 concept.'],
    ...standard(['Level-2+ ADAS', 'Drive modes'], ['Vegan leather', 'Dual screens', 'Harman Kardon 16-speaker', 'AR head-up display']),
    variants: ['Pack 1', 'Pack 2', 'Pack 3'],
    colors: [TangoRed, EverestWhite, ThunderBlack, AutumnBronze],
    sound: sounds(140, 0, 'silence', true),
  }),
];
