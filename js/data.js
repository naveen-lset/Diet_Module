// js/data.js — people, feeding times, the diet library, where each diet is set, nutrition, the seed requests and the diet change history.
// Places, animals, items and stock come from masters.js. Every seed date is relative to today, so the demo never goes stale.

/* people, as the Kitchen & Diet roles (antz_kitchen_backend prisma/migrations): the three "Viewing as" people first; the rest appear in the data */
const USERS = [
  { id: 'u-hydar', name: 'Hydar Ali', title: 'Dietician', role: 'dietician', roles: 'Diet Manager · Dietician' },
  { id: 'u-suresh', name: 'Suresh Gowda', title: 'Kitchen Head', role: 'head', roles: 'Kitchen Head', place: 'Central Kitchen' },
  { id: 'u-manoj', name: 'Manoj Kumar', title: 'Kitchen Operator', role: 'viewer', roles: 'Kitchen Operator', place: 'Central Kitchen' },
  { id: 'u-amruth', name: 'Amruth Reddy', title: 'Dietician', role: 'dietician', roles: 'Diet Manager · Dietician' },
  { id: 'u-narendra', name: 'Narendra M', title: 'Diet Manager', role: 'dietician', roles: 'Diet Manager' },
  { id: 'u-raghav', name: 'Raghav N', title: 'Maintenance Head', role: 'other' },
  { id: 'u-priya', name: 'Priya S', title: 'Procurement Head', role: 'other' },
  { id: 'u-kavya', name: 'Kavya R', title: 'Horticulture Head', role: 'other' },
  { id: 'u-arjun', name: 'Arjun P', title: 'IT Head', role: 'other' },
];
const VIEWERS = ['u-hydar', 'u-suresh', 'u-manoj'];
const APPROVER = 'u-suresh';
/* Help Desk departments: who approves by default; Diet requests need the Dietician permission */
const DEPTS = [
  { id: 'diet', name: 'Diet', icon: 'restaurant', head: 'u-suresh', what: 'Diet change requests: items, diets, no-diet days' },
  { id: 'maintenance', name: 'Maintenance', icon: 'build', head: 'u-raghav', what: 'Repairs in kitchens, stores and enclosures' },
  { id: 'procurement', name: 'Procurement', icon: 'shopping_cart', head: 'u-priya', what: 'Buying items and equipment' },
  { id: 'horticulture', name: 'Horticulture', icon: 'park', head: 'u-kavya', what: 'Browse, plants and grounds' },
  { id: 'it', name: 'IT', icon: 'computer', head: 'u-arjun', what: 'Devices, network and app access' },
];
/* each department asks its own questions in the New Request form (Diet has the diet sections) */
const DEPT_FORMS = {
  maintenance: { title: 'Maintenance details', fields: [
    { k: 'issue', label: 'Issue', type: 'select', icon: 'handyman', opts: ['Electrical', 'Plumbing', 'Cooling', 'Carpentry', 'Civil', 'Other'], req: true },
    { k: 'where', label: 'Where exactly', type: 'text', icon: 'pin_drop', placeholder: 'Room, enclosure or equipment', req: true },
    { k: 'risk', label: 'Safety risk to people or animals', type: 'switch', icon: 'warning' } ] },
  procurement: { title: 'Items needed', fields: [
    { k: 'items', label: 'Items', type: 'items', icon: 'inventory_2', req: true },
    { k: 'needBy', label: 'Needed by', type: 'date', icon: 'event', req: true },
    { k: 'cost', label: 'Estimated cost', type: 'money', icon: 'currency_rupee' } ] },
  horticulture: { title: 'Horticulture details', fields: [
    { k: 'work', label: 'Work', type: 'select', icon: 'park', opts: ['Browse supply', 'Pruning', 'Planting', 'Lawn care', 'Tree safety', 'Other'], req: true },
    { k: 'where', label: 'Where exactly', type: 'text', icon: 'pin_drop', placeholder: 'Section or enclosure', req: true },
    { k: 'needBy', label: 'Needed by', type: 'date', icon: 'event' } ] },
  it: { title: 'IT details', fields: [
    { k: 'device', label: 'Device or system', type: 'select', icon: 'devices', opts: ['Tablet', 'Laptop', 'Printer', 'Network', 'Antz app access', 'Other'], req: true },
    { k: 'problem', label: 'What is needed', type: 'select', icon: 'report', opts: ['Not working', 'Slow', 'Broken', 'A new one', 'Access'], req: true },
    { k: 'asset', label: 'Asset tag', type: 'text', icon: 'qr_code', placeholder: 'On the sticker, e.g. LSET-TAB-014' } ] },
};

/* the master time bands (LK.timeBands) */
const FEEDS = [
  { id: 1, from: '04:00', to: '05:00' },
  { id: 2, from: '07:00', to: '10:00' },
  { id: 3, from: '12:00', to: '13:00' },
  { id: 4, from: '16:00', to: '18:00' },
];

/* diets, per animal per feed, as the Kitchen & Diet diet lines: [id, name, species, type, [[feed, [[item, qty, unit, prep, cut, days]]]]].
   days is the Kitchen day mask (bit 0 Mon … bit 6 Sun), 127 every day when left out. */
const WK = { daily: 127, monThu: 9, mwf: 21, tts: 106, weekdays: 31, weekend: 96 };
const DIETS_RAW = [
  ['D-273', 'Year Round Coypu Diet', 135332, 'yearround', [[2, [['Carrot', 300, 'g', 'Washed', 'Cubes 2 cm'], ['Beans', 150, 'g', 'Fresh', 'Whole'], ['Spinach', 100, 'g', 'Washed', 'Shredded']]], [4, [['Maize', 100, 'g', 'Raw', 'Whole'], ['Apple', 100, 'g', 'Washed', 'Cubes 2 cm'], ['Cucumber', 150, 'g', 'Washed', 'Chunks 5 cm']]]]],
  ['D-502', 'Soft Recovery Coypu Diet', 135332, 'timebound', [[2, [['Sweet Potato', 250, 'g', 'Mashed', ''], ['Carrot', 150, 'g', 'Steamed', 'Diced 1 cm']]], [4, [['Banana', 100, 'g', 'Mashed', ''], ['Rice', 80, 'g', 'Boiled', '']]]]],
  ['D-503', 'Monsoon Coypu Diet', 135332, 'seasonal', [[2, [['Spinach', 200, 'g', 'Washed', 'Shredded'], ['Beans', 200, 'g', 'Fresh', 'Whole'], ['Carrot', 200, 'g', 'Washed', 'Cubes 2 cm']]], [4, [['Cucumber', 200, 'g', 'Washed', 'Chunks 5 cm'], ['Maize', 80, 'g', 'Raw', 'Whole']]]]],
  ['D-505', 'Marsh Coypu Diet', 135332, 'yearround', [[2, [['Spinach', 150, 'g', 'Washed', 'Leaves'], ['Cucumber', 150, 'g', 'Washed', 'Chunks 5 cm'], ['Carrot', 200, 'g', 'Washed', 'Cubes 2 cm']]], [4, [['Maize', 120, 'g', 'Raw', 'Whole'], ['Sweet Potato', 80, 'g', 'Boiled', 'Cubes 2 cm', WK.mwf]]]]],
  ['D-506', 'Light Coypu Diet', 135332, 'timebound', [[2, [['Cucumber', 200, 'g', 'Washed', 'Chunks 5 cm'], ['Spinach', 150, 'g', 'Washed', 'Shredded']]], [4, [['Carrot', 100, 'g', 'Washed', 'Cubes 2 cm']]]]],
  ['D-283', 'Year Round Lovebird Diet', 134467, 'yearround', [[2, [['Sunflower Seeds', 10, 'g', 'Raw', 'Whole'], ['Apple', 15, 'g', 'Washed', 'Diced 1 cm'], ['Papaya', 10, 'g', 'Peeled', 'Diced 1 cm']]], [4, [['Ragi', 8, 'g', 'Soaked', 'Whole'], ['Grapes', 5, 'g', 'Washed', 'Halved', WK.monThu], ['Spinach', 5, 'g', 'Washed', 'Shredded']]]]],
  ['D-284', 'Breeding Lovebird Diet', 134467, 'seasonal', [[2, [['Sunflower Seeds', 12, 'g', 'Raw', 'Whole'], ['Ragi', 10, 'g', 'Soaked', 'Whole'], ['Pomegranate', 5, 'g', 'Fresh', 'Whole']]], [4, [['Spinach', 8, 'g', 'Washed', 'Shredded'], ['Papaya', 10, 'g', 'Peeled', 'Diced 1 cm']]]]],
  ['D-263', 'Year Round Tortoise Diet', 360599, 'yearround', [[2, [['Spinach', 400, 'g', 'Washed', 'Leaves'], ['Cucumber', 300, 'g', 'Washed', 'Chunks 5 cm'], ['Papaya', 250, 'g', 'Peeled', 'Chunks 5 cm', WK.monThu], ['Carrot', 200, 'g', 'Washed', 'Cubes 2 cm'], ['Banana', 100, 'g', 'Peeled', 'Chunks 5 cm', { every: 10, from: -3 }]]]]],
  ['D-264', 'Winter Tortoise Diet', 360599, 'seasonal', [[3, [['Spinach', 300, 'g', 'Washed', 'Leaves'], ['Beans', 200, 'g', 'Fresh', 'Whole'], ['Sweet Potato', 150, 'g', 'Steamed', 'Chunks 5 cm'], ['Guava', 150, 'g', 'Washed', 'Halved']]]]],
  ['D-266', 'Rescue Centre Tortoise Diet', 360599, 'yearround', [[2, [['Spinach', 350, 'g', 'Washed', 'Leaves'], ['Cucumber', 250, 'g', 'Washed', 'Chunks 5 cm'], ['Watermelon', 300, 'g', 'Fresh', 'Chunks 5 cm', WK.weekend], ['Carrot', 150, 'g', 'Washed', 'Cubes 2 cm']]], [4, [['Papaya', 200, 'g', 'Peeled', 'Chunks 5 cm', WK.weekdays]]]]],
  ['D-267', 'Shell Care Tortoise Diet', 360599, 'timebound', [[2, [['Spinach', 400, 'g', 'Washed', 'Leaves'], ['Carrot', 200, 'g', 'Washed', 'Cubes 2 cm'], ['Papaya', 200, 'g', 'Peeled', 'Chunks 5 cm']]], [4, [['Curd', 50, 'ml', 'Fresh', '', WK.mwf]]]]],
  ['D-286', 'Year Round Polecat Diet', 195064, 'yearround', [[2, [['Chicken', 150, 'g', 'Raw', 'Chunks 5 cm']]], [4, [['Fish', 100, 'g', 'Raw', 'Whole', WK.mwf], ['Mutton', 50, 'g', 'Raw', 'Chunks 5 cm', WK.tts], ['Egg', 1, 'pcs', 'Raw', 'Whole', { every: 14, from: -6 }]]]]],
  ['D-501', 'Breeding Polecat Diet', 195064, 'seasonal', [[2, [['Chicken', 200, 'g', 'Raw', 'Chunks 5 cm'], ['Egg', 1, 'pcs', 'Boiled', 'Halved']]], [4, [['Mutton', 120, 'g', 'Raw', 'Chunks 5 cm'], ['Fish', 80, 'g', 'Raw', 'Whole']]]]],
  ['D-509', 'Moulting Polecat Diet', 195064, 'timebound', [[2, [['Chicken', 180, 'g', 'Raw', 'Chunks 5 cm'], ['Egg', 1, 'pcs', 'Boiled', 'Halved']]], [4, [['Fish', 100, 'g', 'Raw', 'Whole']]]]],
  ['D-307', 'Year Round Elephantnose Fish Diet', 127302, 'yearround', [[2, [['Fish', 20, 'g', 'Raw', 'Diced 1 cm'], ['Mealworm', 10, 'g', 'Raw', 'Whole']]], [4, [['Mealworm', 10, 'g', 'Raw', 'Whole']]]]],
  ['D-308', 'Live Food Elephantnose Fish Diet', 127302, 'timebound', [[2, [['Mealworm', 20, 'g', 'Raw', 'Whole']]], [4, [['Fish', 15, 'g', 'Raw', 'Diced 1 cm']]]]],
  ['D-310', 'Year Round Cassowary Diet', 150254, 'yearround', [[2, [['Papaya', 600, 'g', 'Peeled', 'Chunks 5 cm'], ['Banana', 500, 'g', 'Peeled', 'Whole'], ['Apple', 400, 'g', 'Washed', 'Chunks 5 cm']]], [4, [['Watermelon', 800, 'g', 'Fresh', 'Chunks 5 cm'], ['Guava', 300, 'g', 'Washed', 'Whole'], ['Egg', 2, 'pcs', 'Boiled', 'Halved', { monthly: 1 }]]]]],
  ['D-316', 'Juvenile Cassowary Diet', 150254, 'age', [[2, [['Papaya', 200, 'g', 'Peeled', 'Diced 1 cm'], ['Banana', 150, 'g', 'Mashed', ''], ['Egg', 1, 'pcs', 'Boiled', 'Diced 1 cm']]], [4, [['Watermelon', 250, 'g', 'Fresh', 'Cubes 2 cm'], ['Guava', 100, 'g', 'Washed', 'Diced 1 cm']]]]],
  ['D-317', 'Heavyweight Coypu Diet', 135332, 'weight', [[2, [['Spinach', 200, 'g', 'Washed', 'Shredded'], ['Cucumber', 200, 'g', 'Washed', 'Chunks 5 cm'], ['Carrot', 150, 'g', 'Washed', 'Cubes 2 cm']]], [4, [['Beans', 150, 'g', 'Fresh', 'Whole'], ['Apple', 50, 'g', 'Washed', 'Cubes 2 cm']]]]],
  ['D-311', 'Breeding Cassowary Diet', 150254, 'yearround', [[2, [['Papaya', 700, 'g', 'Peeled', 'Chunks 5 cm'], ['Banana', 600, 'g', 'Peeled', 'Whole'], ['Egg', 2, 'pcs', 'Boiled', 'Halved']]], [4, [['Watermelon', 900, 'g', 'Fresh', 'Chunks 5 cm'], ['Guava', 300, 'g', 'Washed', 'Whole'], ['Chicken', 150, 'g', 'Raw', 'Chunks 5 cm']]]]],
  ['D-312', 'Quarantine Cassowary Diet', 150254, 'yearround', [[2, [['Papaya', 500, 'g', 'Peeled', 'Chunks 5 cm'], ['Banana', 400, 'g', 'Peeled', 'Whole']]], [4, [['Guava', 300, 'g', 'Washed', 'Halved']]]]],
  ['D-313', 'Paddock Cassowary Diet', 150254, 'yearround', [[2, [['Papaya', 650, 'g', 'Peeled', 'Chunks 5 cm'], ['Banana', 500, 'g', 'Peeled', 'Whole'], ['Apple', 300, 'g', 'Washed', 'Chunks 5 cm']]], [4, [['Watermelon', 900, 'g', 'Fresh', 'Chunks 5 cm'], ['Pomegranate', 150, 'g', 'Fresh', 'Whole', WK.weekend]]]]],
  ['D-314', 'Light Cassowary Diet', 150254, 'timebound', [[2, [['Papaya', 400, 'g', 'Peeled', 'Chunks 5 cm'], ['Apple', 300, 'g', 'Washed', 'Chunks 5 cm']]], [4, [['Watermelon', 600, 'g', 'Fresh', 'Chunks 5 cm'], ['Cucumber', 200, 'g', 'Washed', 'Chunks 5 cm']]]]],
  ['D-315', 'Senior Cassowary Diet', 150254, 'yearround', [[2, [['Papaya', 500, 'g', 'Mashed', ''], ['Banana', 500, 'g', 'Mashed', '']]], [3, [['Egg', 1, 'pcs', 'Boiled', 'Halved', WK.mwf]]], [4, [['Watermelon', 700, 'g', 'Fresh', 'Cubes 2 cm'], ['Guava', 200, 'g', 'Washed', 'Diced 1 cm']]]]],
  ['D-320', 'Year Round Marmoset Diet', 161818, 'yearround', [[2, [['Fruit Salad', 60, 'g', 'Mixed', ''], ['Mealworm', 5, 'g', 'Raw', 'Whole', WK.mwf]]], [3, [['Grapes', 20, 'g', 'Washed', 'Halved'], ['Apple', 25, 'g', 'Washed', 'Diced 1 cm']]], [4, [['Curd', 20, 'ml', 'Fresh', ''], ['Ragi', 10, 'g', 'Cooked', '']]]]],
  ['D-321', 'Insect Rich Marmoset Diet', 161818, 'yearround', [[2, [['Mealworm', 10, 'g', 'Raw', 'Whole'], ['Banana', 25, 'g', 'Peeled', 'Diced 1 cm']]], [3, [['Guava', 25, 'g', 'Washed', 'Diced 1 cm'], ['Pomegranate', 15, 'g', 'Fresh', 'Whole']]], [4, [['Curd', 25, 'ml', 'Fresh', '']]]]],
  ['D-330', 'Insect Rich Meerkat Diet', 195022, 'yearround', [[2, [['Mealworm', 40, 'g', 'Raw', 'Whole'], ['Egg', 1, 'pcs', 'Boiled', 'Halved']]], [4, [['Chicken', 60, 'g', 'Raw', 'Chunks 5 cm']]]]],
  ['D-331', 'Year Round Meerkat Diet', 195022, 'yearround', [[2, [['Chicken', 80, 'g', 'Raw', 'Chunks 5 cm'], ['Egg', 1, 'pcs', 'Boiled', 'Halved', WK.monThu]]], [4, [['Mealworm', 20, 'g', 'Raw', 'Whole'], ['Carrot', 20, 'g', 'Washed', 'Diced 1 cm']]]]],
  ['D-340', 'Leafy Iguana Diet', 132735, 'yearround', [[2, [['Spinach', 120, 'g', 'Washed', 'Shredded'], ['Beans', 50, 'g', 'Fresh', 'Diced 1 cm'], ['Papaya', 40, 'g', 'Peeled', 'Diced 1 cm'], ['Cucumber', 40, 'g', 'Washed', 'Diced 1 cm']]]]],
  ['D-341', 'Juvenile Iguana Diet', 132735, 'yearround', [[2, [['Greens Mix', 90, 'g', 'Mixed', ''], ['Papaya', 30, 'g', 'Peeled', 'Diced 1 cm']]], [4, [['Cucumber', 30, 'g', 'Washed', 'Diced 1 cm'], ['Guava', 20, 'g', 'Washed', 'Diced 1 cm']]]]],
];

/* as the Kitchen & Diet diet plan: who certified it (dietitian, or the kitchen when no dietitian has), the Kitchen note (for the kitchen),
   the Site note (for the keepers), the Remark (a lasting diet-level note), the change reason and its remarks (not on Base diets), and sharing.
   cert / kcert: [who, days ago] */
const DIET_META = {
  'D-273': { cert: ['u-amruth', -2], kcert: ['u-suresh', -2], note: 'Wash the greens twice. Cut on the day, not the night before.', site: 'Spread the food along the bank; collect what is left by 5 PM.' },
  'D-502': { cert: ['u-hydar', -4], kcert: ['u-suresh', -4], note: 'Mash fully. No whole pieces.', site: 'Hand-feed if he leaves the bowl.', reason: 'Post-op recovery', remarks: 'Jaw surgery; soft food for two weeks.' },
  'D-503': { cert: ['u-amruth', -140], kcert: ['u-suresh', -138], reason: 'Seasonal change', remarks: 'Monsoon greens while they are fresh and cheap.' },
  'D-505': { cert: ['u-hydar', -9], site: 'Feed on the dry bank, not in the water.' },
  'D-506': { cert: ['u-hydar', -20], kcert: ['u-suresh', -19], reason: 'Weight management', remarks: 'Six weeks of lighter food for Coypu 12.' },
  'D-283': { cert: ['u-amruth', -15], kcert: ['u-suresh', -14], note: 'Seeds in a separate dish from the fruit.', site: 'Hang the fruit dish high; they do not feed on the floor.' },
  'D-284': { cert: ['u-amruth', -25], reason: 'Breeding', remarks: 'More seed and ragi for the laying season.' },
  'D-263': { cert: ['u-amruth', -18], kcert: ['u-suresh', -17], note: 'Scatter the greens; do not pile them.', site: 'Put the food in the shade.', remark: 'One diet for the tortoises and the iguanas. A change here changes both.', shared: [132735] },
  'D-264': { cert: ['u-amruth', -33], kcert: ['u-suresh', -30], reason: 'Seasonal change', remarks: 'Steamed roots for the cold months.' },
  'D-266': { kcert: ['u-suresh', -6], site: 'Weekend watermelon is for the keeper talk at 11.' },
  'D-267': { cert: ['u-hydar', -10], kcert: ['u-suresh', -10], site: 'Calcium dust on the curd.', reason: 'Health', remarks: 'Shell softening seen at the last check.' },
  'D-286': { cert: ['u-narendra', -12], kcert: ['u-suresh', -11], note: 'Cut chicken on the bone.' },
  'D-501': { cert: ['u-narendra', -30], reason: 'Breeding' },
  'D-509': { cert: ['u-narendra', -40], reason: 'Moult' },
  'D-307': { cert: ['u-hydar', -3], kcert: ['u-suresh', -3], site: 'Feed at dusk; the fish hide in daylight.' },
  'D-308': { reason: 'Trial diet', remarks: 'Two weeks of live food before the breeding trial.' },
  'D-310': { cert: ['u-amruth', -7], kcert: ['u-suresh', -6], note: 'Fruit at room temperature. Remove seeds from papaya.', remark: 'No pineapple: too acidic for two of the birds.' },
  'D-311': { site: 'Eggs go in the nest-side tray, not the main bowl.' },
  'D-312': { cert: ['u-amruth', -22], kcert: ['u-suresh', -21], site: 'Quarantine keeper only. Wash the bowls separately.' },
  'D-313': { cert: ['u-amruth', -14] },
  'D-314': { cert: ['u-hydar', -5], kcert: ['u-suresh', -5], reason: 'Weight management', remarks: 'Lighter fruit for the CONGO 2 group for a month.' },
  'D-315': { cert: ['u-hydar', -8], kcert: ['u-suresh', -7], note: 'Serve the mash slightly warm.', site: 'Feed Bramble apart from the others.' },
  'D-320': { cert: ['u-amruth', -40], kcert: ['u-suresh', -39], site: 'Fruit on the high platform.' },
  'D-321': { cert: ['u-amruth', -13] },
  'D-330': { cert: ['u-hydar', -34] },
  'D-331': { cert: ['u-hydar', -19], kcert: ['u-suresh', -18], site: 'Scatter the mealworm across the sand.' },
  'D-340': { cert: ['u-narendra', -200] },
  'D-341': { cert: ['u-amruth', -27] },
  'D-316': { cert: ['u-amruth', -12], kcert: ['u-suresh', -11], note: 'Dice small; chicks choke on big pieces.', site: 'Feed in the shade, away from the adults.', reason: 'Life stage', remarks: 'Chicks up to 12 months.' },
  'D-317': { cert: ['u-hydar', -16], kcert: ['u-suresh', -15], site: 'Weigh monthly; back to the base diet under 9 kg.', reason: 'Weight management', remarks: 'More greens, no maize, for coypu of 9 kg and over.' },
};

/* where each diet is set, as the Kitchen & Diet scope: [diet, species, level, ref, start, end, request, every year].
   No dates is a Base diet; dates are Time-bound; MM-DD dates that come back every year are Seasonal.
   An animal follows the most specific diet that applies to it (animal > enclosure > section > site > species). Koi Fish has no diet on purpose. */
const ASSIGN_RAW = t => [
  ['D-273', 135332, 'species', null], ['D-503', 135332, 'species', null, '06-15', '09-30', null, true],
  ['D-505', 135332, 'section', 196], ['D-506', 135332, 'enclosure', 15235, addDays(t, -20), addDays(t, 40)],
  ['D-502', 135332, 'animal', 215920, addDays(t, -3), addDays(t, 11), 'REQ38-00515'],
  ['D-263', 360599, 'species', null], ['D-264', 360599, 'species', null, '12-01', '02-28', null, true],
  ['D-266', 360599, 'site', 209], ['D-267', 360599, 'animal', 280088, addDays(t, -10), addDays(t, 20)],
  ['D-283', 134467, 'species', null], ['D-284', 134467, 'section', 170, '02-01', '04-30', null, true],
  ['D-286', 195064, 'species', null], ['D-501', 195064, 'species', null, '03-01', '05-31', null, true],
  ['D-509', 195064, 'species', null, addDays(t, -60), addDays(t, -11)],
  ['D-307', 127302, 'species', null], ['D-308', 127302, 'species', null, addDays(t, 6), addDays(t, 20)],
  ['D-310', 150254, 'species', null], ['D-316', 150254, 'species', null, null, null, null, false, { kind: 'age', label: '0–12 months', min: 0, max: 12 }],
  ['D-317', 135332, 'species', null, null, null, null, false, { kind: 'weight', label: '9 kg and over', min: 9, max: null }], ['D-313', 150254, 'site', 47], ['D-311', 150254, 'section', 902], ['D-312', 150254, 'section', 903],
  ['D-314', 150254, 'enclosure', 19993, addDays(t, -5), addDays(t, 25)], ['D-315', 150254, 'animal', 'CASS-PB1'],
  ['D-320', 161818, 'species', null], ['D-321', 161818, 'section', 905],
  ['D-331', 195022, 'species', null],
  ['D-340', 132735, 'species', null, addDays(t, -400), addDays(t, -18)], ['D-263', 132735, 'species', null], ['D-341', 132735, 'section', 164],
  /* one diet set at more than one level: a section or enclosure inside a broader diet goes back to the species' year-round diet */
  ['D-310', 150254, 'section', 162], ['D-310', 150254, 'enclosure', 19992], ['D-273', 135332, 'enclosure', 15229],
];

/* nutrients per 100 g as fed (ml counts as g; an egg is 50 g):
   [kcal, protein g, fat g, carbohydrate g, fibre g, moisture %, calcium mg, phosphorus mg, vitamin A IU, vitamin D IU, vitamin E mg, vitamin C mg] */
const NUTRIENTS = [
  ['Energy', 'kcal', 'Macros'], ['Protein', 'g', 'Macros'], ['Fat', 'g', 'Macros'], ['Carbohydrate', 'g', 'Macros'], ['Fibre', 'g', 'Macros'], ['Moisture', '%', 'Macros'],
  ['Calcium', 'mg', 'Minerals'], ['Phosphorus', 'mg', 'Minerals'],
  ['Vitamin A', 'IU', 'Vitamins'], ['Vitamin D', 'IU', 'Vitamins'], ['Vitamin E', 'mg', 'Vitamins'], ['Vitamin C', 'mg', 'Vitamins'],
];
const NUTRI_RAW = {
  Apple: [52, 0.3, 0.2, 13.8, 2.4, 86, 6, 11, 54, 0, 0.18, 4.6], Banana: [89, 1.1, 0.3, 22.8, 2.6, 75, 5, 22, 64, 0, 0.1, 8.7],
  Beans: [31, 1.8, 0.2, 7, 2.7, 90, 37, 38, 690, 0, 0.41, 12.2], Carrot: [41, 0.9, 0.2, 9.6, 2.8, 88, 33, 35, 16706, 0, 0.66, 5.9],
  Chicken: [145, 21, 6.5, 0, 0, 72, 11, 190, 40, 5, 0.3, 0], Curd: [61, 3.5, 3.3, 4.7, 0, 88, 121, 95, 99, 2, 0.06, 0.5],
  Fish: [105, 20, 2.5, 0, 0, 76, 25, 220, 50, 150, 0.5, 0], Maize: [86, 3.3, 1.4, 19, 2.7, 76, 2, 89, 187, 0, 0.07, 6.8],
  Milk: [61, 3.2, 3.3, 4.8, 0, 88, 113, 84, 162, 40, 0.05, 0], Papaya: [43, 0.5, 0.3, 10.8, 1.7, 88, 20, 10, 950, 0, 0.3, 61],
  Pineapple: [50, 0.5, 0.1, 13.1, 1.4, 86, 13, 8, 58, 0, 0.02, 47.8], Rice: [130, 2.7, 0.3, 28, 0.4, 68, 10, 43, 0, 0, 0.04, 0],
  Egg: [143, 12.6, 9.5, 0.7, 0, 76, 56, 198, 540, 82, 1.05, 0], Spinach: [23, 2.9, 0.4, 3.6, 2.2, 91, 99, 49, 9377, 0, 2.03, 28.1],
  'Sweet Potato': [86, 1.6, 0.1, 20.1, 3, 77, 30, 47, 14187, 0, 0.26, 2.4], Cucumber: [15, 0.7, 0.1, 3.6, 0.5, 95, 16, 24, 105, 0, 0.03, 2.8],
  Guava: [68, 2.6, 1, 14.3, 5.4, 81, 18, 40, 624, 0, 0.73, 228], Watermelon: [30, 0.6, 0.2, 7.6, 0.4, 91, 7, 11, 569, 0, 0.05, 8.1],
  Grapes: [69, 0.7, 0.2, 18.1, 0.9, 81, 10, 20, 66, 0, 0.19, 3.2], Pomegranate: [83, 1.7, 1.2, 18.7, 4, 78, 10, 36, 0, 0, 0.6, 10.2],
  Ragi: [336, 7.3, 1.3, 72, 11.5, 13, 344, 283, 42, 0, 0.22, 0], 'Sunflower Seeds': [584, 20.8, 51.5, 20, 8.6, 5, 78, 660, 50, 0, 35.2, 1.4],
  Mutton: [122, 20, 4, 0, 0, 75, 13, 180, 0, 0, 0.2, 0], Mealworm: [206, 18.7, 13.4, 3.9, 2, 62, 17, 285, 0, 0, 0.5, 0],
  Orange: [47, 0.9, 0.1, 11.8, 2.4, 87, 40, 14, 225, 0, 0.18, 53.2], Lime: [30, 0.7, 0.2, 10.5, 2.8, 88, 33, 18, 50, 0, 0.22, 29.1],
  Lemon: [29, 1.1, 0.3, 9.3, 2.8, 89, 26, 16, 22, 0, 0.15, 53], Grapefruit: [42, 0.8, 0.1, 10.7, 1.6, 88, 22, 18, 1150, 0, 0.13, 31.2],
};
const PIECE_G = { Egg: 50 };
/* mixes (Kitchen & Diet recipes): one line in a diet, made of items by share; [id, name, kitchen, [[item, %, preparation, cut]]] */
const MIX_RAW = [
  [9001, 'Fruit Salad', 'K3', [['Banana', 50, 'Peeled', 'Diced 1 cm'], ['Papaya', 30, 'Peeled', 'Diced 1 cm'], ['Apple', 20, 'Washed', 'Diced 1 cm']]],
  [9002, 'Greens Mix', 'K1', [['Spinach', 40, 'Washed', 'Shredded'], ['Cucumber', 30, 'Washed', 'Cubes 2 cm'], ['Beans', 30, 'Fresh', 'Diced 1 cm']]],
];

/* ---------- the seed requests: a spread of kinds and states ---------- */
function SEED_REQUESTS(t) {
  const d = n => addDays(t, n), at = (n, hm) => `${d(n)}T${hm}`;
  const item = n => ITEM_ID[n];
  return [
    { id: 'REQ38-00513', kind: 'skip', sp: 150254, level: 'enclosure', ref: 19996, by: 'u-hydar', prio: 'normal', reason: 'Fasting day',
      title: 'Fasting day for Q Pen 1', text: 'Both birds in quarantine are on their weekly fast. Hold every feed for the day.', note: '', files: [],
      date: d(-6), feeds: 'all', state: 'approved',
      events: [{ kind: 'raised', by: 'u-hydar', at: at(-9, '10:20') }, { kind: 'approved', by: 'u-suresh', at: at(-8, '09:05'), note: '' }] },
    { id: 'REQ38-00514', kind: 'diet', sp: 195022, level: 'species', ref: null, by: 'u-hydar', prio: 'normal', reason: 'Behavioural',
      title: 'Meerkats onto the insectivore diet', text: 'More foraging time: move the mob to the insectivore diet with mealworm scatter feeds.', note: 'Scatter the mealworm across the sand, not in a bowl.', files: [],
      base: 'D-331', diet: 'D-330', start: d(-6), end: null, state: 'rejected',
      events: [{ kind: 'raised', by: 'u-hydar', at: at(-8, '11:40') },
        { kind: 'rejected', by: 'u-suresh', at: at(-7, '14:10'), reason: 'Mealworm is out of stock and the supplier has no date yet. Raise it again with another protein.' }] },
    { id: 'REQ38-00515', kind: 'diet', sp: 135332, level: 'animal', ref: 215920, by: 'u-hydar', prio: 'high', reason: 'Post-op recovery',
      title: 'Soft recovery diet for #215920', text: 'Jaw surgery on Friday. Soft, mashed food for two weeks while the stitches heal.', note: 'Mash fully. No whole pieces.', files: [{ name: 'Surgery notes #215920.pdf', kind: 'pdf', size: '640 KB' }],
      base: 'D-273', diet: 'D-502', start: d(-3), end: d(11), state: 'approved', applied: true,
      events: [{ kind: 'raised', by: 'u-hydar', at: at(-5, '16:30') }, { kind: 'approved', by: 'u-suresh', at: at(-4, '08:50'), note: 'Morning shift will do the mashing.' }] },
    { id: 'REQ38-00516', kind: 'skip', sp: 161818, level: 'section', ref: 904, by: 'u-amruth', prio: 'normal', reason: 'Transfer',
      title: 'Skip morning feed in Primate House', text: 'The group moves to the new night enclosures. Skip the morning feed so they travel on an empty stomach.', note: '', files: [],
      date: d(-2), feeds: [2], state: 'cancelled',
      events: [{ kind: 'raised', by: 'u-amruth', at: at(-4, '12:15') }, { kind: 'cancelled', by: 'u-amruth', at: at(-3, '09:30'), reason: 'The transfer moved to next week.' }] },
    { id: 'REQ38-00517', kind: 'items', sp: 134467, level: 'section', ref: 170, by: 'u-amruth', prio: 'normal', reason: 'Seasonal change',
      title: 'More fruit for Sherwood lovebirds', text: 'Cooler nights coming. A little more apple and some pomegranate for the Sherwood flock.', note: '', files: [],
      base: 'D-283', changes: [{ op: 'change', feed: 2, item: item('Apple'), qty: 20, unit: 'g' }, { op: 'add', feed: 4, to: item('Pomegranate'), qty: 5, unit: 'g', prep: 'Fresh', cut: 'Whole' }],
      start: d(5), end: null, state: 'approved',
      events: [{ kind: 'raised', by: 'u-amruth', at: at(-3, '15:00') }, { kind: 'comment', by: 'u-suresh', at: at(-2, '10:12'), note: 'Pomegranate comes from the Fruit Store. Can start on the 5th.' }, { kind: 'approved', by: 'u-suresh', at: at(-1, '11:45'), note: '' }] },
    { id: 'REQ38-00518', kind: 'items', sp: 195064, level: 'species', ref: null, by: 'u-hydar', prio: 'normal', reason: 'Underweight animal',
      title: 'Add a boiled egg for the polecats', text: 'Three polecats lost weight after the moult. One boiled egg each in the morning until they are back to weight.', note: 'Cool the eggs before serving.', files: [{ name: 'Weight chart – polecats.xlsx', kind: 'doc', size: '48 KB' }],
      base: 'D-286', changes: [{ op: 'add', feed: 2, to: item('Egg'), qty: 1, unit: 'pcs', prep: 'Boiled', cut: 'Halved' }],
      start: d(1), end: null, state: 'delayed', delay: { until: d(2), reason: 'Ingredient not in stock', note: 'Egg delivery comes in two days. 13 a day from then.' },
      events: [{ kind: 'raised', by: 'u-hydar', at: at(-2, '10:05') },
        { kind: 'delayed', by: 'u-suresh', at: at(-1, '15:20'), until: d(2), reason: 'Ingredient not in stock', note: 'Egg delivery comes in two days. 13 a day from then.' },
        { kind: 'comment', by: 'u-hydar', at: at(-1, '16:02'), note: 'Thanks. That works.' }] },
    { id: 'REQ38-00519', kind: 'items', sp: 161818, level: 'section', ref: 178, by: 'u-amruth', prio: 'normal', reason: 'Health',
      title: 'Guava instead of grapes for Ayodhya', text: 'Grapes look linked to loose stools in the Ayodhya marmosets. Try guava for a month.', note: '', files: [],
      base: 'D-320', changes: [{ op: 'change', feed: 3, item: item('Grapes'), to: item('Guava'), qty: 20, unit: 'g', prep: 'Washed', cut: 'Diced 1 cm' }],
      start: d(1), end: d(30), state: 'pending',
      events: [{ kind: 'raised', by: 'u-amruth', at: at(-1, '17:25') }] },
    { id: 'REQ38-00520', kind: 'skip', sp: 360599, level: 'enclosure', ref: 19981, by: 'u-hydar', prio: 'emergency', reason: 'Vet procedure',
      title: 'No feed today: shell checks in Ril enclosure', text: 'All the tortoises here go under light sedation for shell and beak checks this morning. Hold all feeds today.', note: 'Water stays as usual.', files: [{ name: 'Sedation plan.pdf', kind: 'pdf', size: '310 KB' }],
      date: d(0), feeds: 'all', state: 'pending',
      events: [{ kind: 'raised', by: 'u-hydar', at: at(0, '07:15') }] },
    { id: 'REQ38-00521', kind: 'items', sp: 135332, level: 'enclosure', ref: 15224, by: 'u-hydar', prio: 'high', reason: 'Post-op recovery',
      title: 'Soft roots for Coypu 1 after dental work', text: 'Two coypu in Coypu 1 had their molars trimmed. Swap carrot for steamed sweet potato and halve the maize for two weeks.', note: 'Steam until soft, serve cool.', files: [{ name: 'Dental report – Coypu 1.pdf', kind: 'pdf', size: '1.2 MB' }],
      base: 'D-273', changes: [{ op: 'change', feed: 2, item: item('Carrot'), to: item('Sweet Potato'), qty: 300, unit: 'g', prep: 'Steamed', cut: 'Cubes 2 cm' }, { op: 'change', feed: 4, item: item('Maize'), qty: 50, unit: 'g' }],
      start: d(1), end: d(14), state: 'pending',
      events: [{ kind: 'raised', by: 'u-hydar', at: at(0, '08:10') }] },
    { id: 'REQ38-00522', kind: 'diet', sp: 150254, level: 'enclosure', ref: 19990, by: 'u-amruth', prio: 'normal', reason: 'Breeding',
      title: 'Breeding diet for Paddock A', text: 'The breeding pair and two hens in Paddock A start the laying season. Move them to the breeding diet.', note: 'Boil the eggs fully and cool before serving.', files: [{ name: 'Paddock A pairing.jpg', kind: 'image', size: '2.4 MB' }],
      base: 'D-313', diet: 'D-311', start: d(2), end: d(60), state: 'pending',
      events: [{ kind: 'raised', by: 'u-amruth', at: at(0, '08:40') }] },
  ];
}


/* other Help Desk requests, so Diet sits among the kinds the desk handles */
const GENERIC_REQUESTS = t => {
  const d = n => addDays(t, n), at = (n, hm) => `${d(n)}T${hm}`;
  return [
    { id: 'REQ38-00505', dept: 'it', by: 'u-hydar', approver: 'u-arjun', site: 29, prio: 'normal', f: { device: 'Tablet', problem: 'A new one', asset: '' }, title: 'Second tablet for the diet store', text: 'One tablet is shared by three people at feed times. A second one would stop the queue at 7 AM.', files: [], state: 'rejected',
      events: [{ kind: 'raised', by: 'u-hydar', at: at(-12, '09:40') }, { kind: 'rejected', by: 'u-arjun', at: at(-10, '16:05'), reason: 'Use the shared tablet in the kitchen office for now. New tablets come in the next quarter.' }] },
    { id: 'REQ38-00508', dept: 'maintenance', by: 'u-hydar', approver: 'u-raghav', site: 29, prio: 'high', f: { issue: 'Cooling', where: 'Diet prep room, fridge 2', risk: true }, title: 'Diet prep room fridge is warm', text: 'The fridge in the diet prep room reads 9 °C since morning. Greens wilt by noon.', files: [{ name: 'Fridge display.jpg', kind: 'image', size: '1.1 MB' }], state: 'pending',
      events: [{ kind: 'raised', by: 'u-hydar', at: at(-1, '08:30') }, { kind: 'comment', by: 'u-raghav', at: at(-1, '11:05'), note: 'Technician comes tomorrow at 9. Move the greens to the cold room till then.' }] },
    { id: 'REQ38-00509', dept: 'maintenance', by: 'u-manoj', approver: 'u-raghav', site: 29, prio: 'normal', f: { issue: 'Plumbing', where: 'Vegetable wash station, second tap', risk: false }, title: 'Leaking tap at the wash station', text: 'The second tap at the vegetable wash station drips all day.', files: [], state: 'pending',
      events: [{ kind: 'raised', by: 'u-manoj', at: at(0, '07:50') }] },
    { id: 'REQ38-00511', dept: 'procurement', by: 'u-suresh', approver: 'u-priya', site: 29, prio: 'normal', f: { items: [{ name: 'Weighing scale, 30 kg', qty: 1 }, { name: 'Scale cover', qty: 2 }], needBy: d(3), cost: 18500 }, title: 'Second weighing scale for Central Kitchen', text: 'One scale for 140 diets slows packing. A second 30 kg scale for the fruit line.', files: [{ name: 'Scale quote.pdf', kind: 'pdf', size: '220 KB' }], state: 'approved',
      events: [{ kind: 'raised', by: 'u-suresh', at: at(-6, '10:10') }, { kind: 'comment', by: 'u-priya', at: at(-5, '12:40'), note: 'Ordered from the usual vendor. Delivery in a week.' }, { kind: 'approved', by: 'u-priya', at: at(-5, '12:42'), note: '' }] },
  ];
};

/* ---------- diet change history, as Kitchen & Diet's Diet Changes (Created · Shared · Edited · Lifecycle).
   [days ago, time, who, type, diet, species, level, ref, what, reason, remarks]
   what: lines [['change'|'add'|'remove', feed, item, was, now]] with was/now = [qty, unit, prep, cut, days];
         or { created: 1 } · { shared: [tsn] } · { cert: 1 } · { ended: 'Replaced by Year Round Tortoise Diet' } · { fields: [[label, was, now]] }.
   Every "now" is the diet as it reads today. ---------- */
const HISTORY_RAW = [
  [0, '09:20', 'u-amruth', 'edited', 'D-320', 161818, 'species', null, [['change', 3, 'Apple', [20, 'g', 'Washed', 'Diced 1 cm'], [25, 'g', 'Washed', 'Diced 1 cm']]], 'Weight management', ''],
  [0, '08:05', 'u-hydar', 'edited', 'D-307', 127302, 'species', null, { cert: 1 }, '', ''],
  [-1, '16:40', 'u-amruth', 'edited', 'D-311', 150254, 'section', 902, [['add', 4, 'Chicken', null, [150, 'g', 'Raw', 'Chunks 5 cm']]], 'Breeding', 'Laying season protein.'],
  [-2, '11:10', 'u-hydar', 'edited', 'D-273', 135332, 'species', null, [['change', 2, 'Carrot', [250, 'g', 'Washed', 'Cubes 2 cm'], [300, 'g', 'Washed', 'Cubes 2 cm']]], 'Weight management', 'Back to the full ration after the weigh-in.'],
  [-2, '11:30', 'u-amruth', 'edited', 'D-273', 135332, 'species', null, { cert: 1 }, '', ''],
  [-3, '10:00', 'u-hydar', 'edited', 'D-307', 127302, 'species', null, [['change', 2, 'Fish', [15, 'g', 'Raw', 'Diced 1 cm'], [20, 'g', 'Raw', 'Diced 1 cm']]], 'Underweight animal', ''],
  [-5, '15:25', 'u-hydar', 'created', 'D-314', 150254, 'enclosure', 19993, { created: 1 }, 'Weight management', 'Lighter fruit for the CONGO 2 group for a month.'],
  [-6, '12:40', 'u-narendra', 'edited', 'D-266', 360599, 'site', 209, [['change', 2, 'Watermelon', [300, 'g', 'Fresh', 'Chunks 5 cm', 127], [300, 'g', 'Fresh', 'Chunks 5 cm', 96]]], 'Seasonal change', 'Watermelon on weekends only.'],
  [-7, '09:50', 'u-amruth', 'edited', 'D-310', 150254, 'species', null, [['change', 4, 'Pineapple', [300, 'g', 'Peeled', 'Chunks 5 cm'], [300, 'g', 'Washed', 'Whole', 127, 'Guava']]], 'Health', 'Pineapple too acidic for two of the birds.'],
  [-8, '14:15', 'u-hydar', 'created', 'D-315', 150254, 'animal', 'CASS-PB1', { created: 1 }, 'Old age', 'Softer food for the oldest bird in Paddock B.'],
  [-9, '11:45', 'u-hydar', 'edited', 'D-505', 135332, 'section', 196, [['add', 4, 'Sweet Potato', null, [80, 'g', 'Boiled', 'Cubes 2 cm', 21]]], 'Weight management', ''],
  [-10, '10:30', 'u-hydar', 'created', 'D-267', 360599, 'animal', 280088, { created: 1 }, 'Health', 'Shell softening seen at the last check.'],
  [-11, '18:00', 'u-narendra', 'lifecycle', 'D-509', 195064, 'species', null, { ended: 'Diet ended' }, 'Moult over', ''],
  [-12, '16:20', 'u-narendra', 'edited', 'D-286', 195064, 'species', null, [['change', 4, 'Mutton', [50, 'g', 'Raw', 'Chunks 5 cm', 127], [50, 'g', 'Raw', 'Chunks 5 cm', 106]]], 'Seasonal change', ''],
  [-13, '09:10', 'u-amruth', 'edited', 'D-321', 161818, 'section', 905, { cert: 1 }, '', ''],
  [-12, '10:10', 'u-amruth', 'created', 'D-316', 150254, 'species', null, { created: 1 }, 'Life stage', 'Chick diet for the young bird in Congo 1.'],
  [-16, '15:40', 'u-hydar', 'created', 'D-317', 135332, 'species', null, { created: 1 }, 'Weight management', 'Heavier coypu get more greens and no maize.'],
  [-14, '12:00', 'u-amruth', 'created', 'D-313', 150254, 'site', 47, { created: 1 }, 'Breeding', 'Paddock birds get their own fruit mix.'],
  [-15, '15:35', 'u-amruth', 'edited', 'D-283', 134467, 'species', null, [['change', 4, 'Grapes', [5, 'g', 'Washed', 'Halved', 127], [5, 'g', 'Washed', 'Halved', 9]]], 'Health', 'Grapes twice a week only.'],
  [-18, '10:15', 'u-amruth', 'shared', 'D-263', 360599, 'species', null, { shared: [132735] }, 'Diet review', 'Iguanas join the tortoises on their year-round diet.'],
  [-18, '10:20', 'u-amruth', 'lifecycle', 'D-340', 132735, 'species', null, { ended: 'Replaced by Year Round Tortoise Diet' }, 'Diet review', ''],
  [-19, '13:30', 'u-hydar', 'edited', 'D-331', 195022, 'species', null, [['change', 2, 'Egg', [1, 'pcs', 'Boiled', 'Halved', 127], [1, 'pcs', 'Boiled', 'Halved', 9]]], 'Weight management', ''],
  [-20, '11:00', 'u-hydar', 'created', 'D-506', 135332, 'enclosure', 15235, { created: 1 }, 'Weight management', 'Six weeks of lighter food for Coypu 12.'],
  [-22, '17:05', 'u-amruth', 'edited', 'D-312', 150254, 'section', 903, [['remove', 2, 'Apple', [300, 'g', 'Washed', 'Chunks 5 cm'], null]], 'Health', ''],
  [-25, '10:40', 'u-amruth', 'edited', 'D-284', 134467, 'section', 170, { fields: [['Season ends', '15 Apr', '30 Apr']] }, 'Breeding', ''],
  [-27, '14:50', 'u-amruth', 'edited', 'D-341', 132735, 'section', 164, [['change', 4, 'Guava', [15, 'g', 'Washed', 'Diced 1 cm'], [20, 'g', 'Washed', 'Diced 1 cm']]], 'Underweight animal', ''],
  [-30, '09:30', 'u-narendra', 'edited', 'D-501', 195064, 'species', null, { cert: 1 }, '', ''],
  [-33, '16:10', 'u-amruth', 'edited', 'D-264', 360599, 'species', null, [['add', 3, 'Guava', null, [150, 'g', 'Washed', 'Halved']]], 'Seasonal change', ''],
  [-34, '11:20', 'u-hydar', 'created', 'D-330', 195022, 'species', null, { created: 1 }, 'Behavioural', 'Kept ready for a foraging trial.'],
];

/* ---------- build the data set ---------- */
let ITEM_ID = {};
function SEED(t) {
  const sites = M_SITES.map(([id, name]) => ({ id, name }));
  const sections = M_SECTIONS.map(([id, name, site]) => ({ id, name, site }));
  const enclosures = M_ENCLOSURES.map(([id, name, section, sp]) => ({ id, name, section, sp }));
  const species = M_SPECIES.map(([id, name, sci, cls]) => ({ id, name, sci, cls: cls[0].toUpperCase() + cls.slice(1) }));
  /* age in months and weight in kg, for the Age and Weight diets: adults by default; two cassowary chicks in Congo; coypu weights from 6 to 10 kg */
  const animals = M_ANIMALS.map(([id, sp, enc, sex, name]) => ({ id, sp, enc, sex: sex.toUpperCase(), name, ageM: 24 + (id % 97) * 2, wt: sp === 135332 ? 6 + (id % 41) / 10 : null }));
  animals.filter(a => a.enc === 14915).forEach((a, i) => { a.ageM = 5 + i * 2; });
  /* the oldest bird in Paddock B keeps a name, so its animal diet reads well */
  const old = animals.find(a => a.sp === 150254 && a.enc === 19991); old.name = old.name || 'Bramble'; const OLD = old.id;
  const items = M_ITEMS.map(([id, name, unit, preps, kitchen, stock, stockUnit]) => ({ id, name, unit, preps, kitchen, stock, stockUnit, nutri: NUTRI_RAW[name] || null, pieceG: PIECE_G[name] || null }));
  ITEM_ID = Object.fromEntries(items.map(i => [i.name, i.id]));
  /* a mix is an item made of items: its nutrients are the shares' weighted sum; the kitchen makes it fresh, so it never runs short */
  MIX_RAW.forEach(([id, name, kitchen, parts]) => { const mix = parts.map(([n, pct, prep, cut]) => ({ item: ITEM_ID[n], pct, prep, cut }));
    const nutri = NUTRIENTS.map((_, i) => mix.reduce((s, p) => s + (NUTRI_RAW[items.find(x => x.id === p.item).name][i] * p.pct / 100), 0));
    items.push({ id, name, unit: 'g', preps: ['Mixed'], kitchen, stock: 999, stockUnit: 'kg', nutri, pieceG: null, mix }); ITEM_ID[name] = id; });
  const diets = DIETS_RAW.map(([id, name, sp, type, meals]) => {
    const m = DIET_META[id] || {};
    /* made: the diet was created on the web by the Diet Manager, two weeks before its first certification (demo) */
    return { id, name, sp, type, made: { by: 'u-narendra', at: addDays(t, (m.cert ? m.cert[1] : -20) - 14) }, cert: m.cert ? { by: m.cert[0], at: addDays(t, m.cert[1]) } : null, kcert: m.kcert ? { by: m.kcert[0], at: addDays(t, m.kcert[1]) } : null,
      note: m.note || '', site: m.site || '', remark: m.remark || '', reason: m.reason || '', remarks: m.remarks || '', shared: m.shared || [],
      meals: meals.map(([feed, rows]) => ({ feed, items: rows.map(([n, qty, unit, prep, cut, days = WK.daily]) => typeof days === 'object'
      ? { item: ITEM_ID[n], qty, unit, prep, cut, days: WK.daily, cad: days.every ? { every: days.every, from: addDays(t, days.from) } : { monthly: days.monthly } }
      : { item: ITEM_ID[n], qty, unit, prep, cut, days }) })) };
  });
  const assigns = ASSIGN_RAW(t).map(([diet, sp, level, ref, start, end, req, recur, group], i) => ({ id: 'AS-' + (i + 1), diet, sp, level, ref: ref === 'CASS-PB1' ? OLD : ref, start: start || null, end: end || null, req: req || null, recur: !!recur, group: group || null }));
  /* a seed change names only what differs; the rest of the line is the diet's own */
  const encOf = Object.fromEntries(enclosures.map(e => [e.id, e])), secOf = Object.fromEntries(sections.map(x => [x.id, x]));
  const siteOfPlace = r => { const a = r.level === 'animal' ? animals.find(x => x.id === r.ref) : null, enc = a ? a.enc : r.level === 'enclosure' ? r.ref : null;
    if (enc) return secOf[encOf[enc].section].site; if (r.level === 'section') return secOf[r.ref].site; if (r.level === 'site') return r.ref;
    return secOf[encOf[animals.find(x => x.sp === r.sp).enc].section].site; };
  const requests = SEED_REQUESTS(t).map(r => ({ ...r, dept: 'diet', approver: APPROVER, site: siteOfPlace(r) })).concat(GENERIC_REQUESTS(t)), dietOf = Object.fromEntries(diets.map(x => [x.id, x]));
  requests.forEach(r => (r.changes || []).forEach(c => {
    if (c.op === 'add') Object.assign(c, { prep: '', cut: '', days: WK.daily, ...c });
    if (c.op === 'change') { const was = dietOf[r.base].meals.find(m => m.feed === c.feed).items.find(i => i.item === c.item); Object.assign(c, { to: was.item, qty: was.qty, unit: was.unit, prep: was.prep, cut: was.cut, days: was.days, ...c }); }
  }));
  const line = (name, v, to) => v ? { item: ITEM_ID[to || name], qty: v[0], unit: v[1], prep: v[2] || '', cut: v[3] || '', days: v[4] ?? WK.daily } : null;
  const history = HISTORY_RAW.map(([n, hm, by, type, diet, sp, level, ref, what, reason, remarks], i) => {
    const h = { id: 'CH-' + String(i + 1).padStart(3, '0'), at: `${addDays(t, n)}T${hm}`, by, type, diet, sp, level, ref: ref === 'CASS-PB1' ? OLD : ref, reason, remarks, req: null };
    if (Array.isArray(what)) h.lines = what.map(([op, feed, name, was, now]) => ({ op, feed, was: line(name, was), now: line(name, now, now && now[5]) }));
    else Object.assign(h, what);
    return h;
  });
  return { users: USERS, feeds: FEEDS, sites, sections, enclosures, species, animals, items, diets, assigns, requests, history, seq: 522, dseq: 520, hseq: history.length };
}
