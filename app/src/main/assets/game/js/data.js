// All game content: stages, teams, people, training actions and story events.
// Real cricketers appear only with altered names and only in respectful roles.

const STAT_LABELS = {
  technique: 'Technique', power: 'Power', vsPace: 'vs Pace', vsSpin: 'vs Spin', temperament: 'Temperament',
  pace: 'Bowling Pace', accuracy: 'Accuracy', variation: 'Variations', fitness: 'Fitness', iq: 'Cricket IQ',
  fatigue: 'Fatigue', injury: 'Injury', form: 'Form', confidence: 'Confidence', focus: 'Focus',
  money: 'Money', family: 'Family', fans: 'Fans', reputation: 'Reputation', coachTrust: 'Coach Trust', integrity: 'Integrity', mental: 'Mental Health',
  selector: 'Selection Buzz',
};
// For these, going up is bad (shown red)
const BAD_UP = new Set(['fatigue', 'injury']);

const TEAMS_IPL = [
  { id: 'MI', name: 'Mumbai Indigos', c1: '#1d4ed8', c2: '#0ea5e9', star: 'Rohit Sharna', bowler: 'Jasprit Bumrath', batter: 'Suryakumar Yadhav' },
  { id: 'CSK', name: 'Chennai Super Kingz', c1: '#eab308', c2: '#1e3a8a', star: 'MS Dhony', bowler: 'Ravindra Jadega', batter: 'MS Dhony' },
  { id: 'RCB', name: 'Royal Chargers Bengaluru', c1: '#dc2626', c2: '#111111', star: 'Birat Kohli', bowler: 'Mohammed Siraaj', batter: 'Birat Kohli' },
  { id: 'KKR', name: 'Kolkata Night Riders', c1: '#6d28d9', c2: '#d4a017', star: 'Andre Russel', bowler: 'Mitchell Starck', batter: 'Andre Russel' },
  { id: 'SRH', name: 'Sunrise Hyderabad', c1: '#f97316', c2: '#111111', star: 'Pat Cumminz', bowler: 'Pat Cumminz', batter: 'Travis Heid' },
  { id: 'RR', name: 'Rajasthan Royales', c1: '#ec4899', c2: '#1e3a8a', star: 'Sanju Samsun', bowler: 'Trent Bolte', batter: 'Jos Battler' },
  { id: 'GT', name: 'Gujarat Titanz', c1: '#0f2a4a', c2: '#c8a24a', star: 'Shubman Gil', bowler: 'Rashid Khaan', batter: 'Shubman Gil' },
  { id: 'PBKS', name: 'Punjab Kingz', c1: '#e11d48', c2: '#9ca3af', star: 'Shreyas Iyar', bowler: 'Arshdeep Singhh', batter: 'Shreyas Iyar' },
];

// level drives ball speed, opponent quality and pressure in key moments
const STAGES = [
  {
    id: 'maidan', ch: 1, title: 'The Maidan', level: 0, format: 'T20', overs: 20,
    sub: 'Rajgarh, Uttar Pradesh. Age 16. A taped bat, a borrowed pad, and a dream nobody else believes in.',
    team: 'Rajgarh Gymkhana', c1: '#b45309', schedule: 'TMTMTM', venue: 'Company Bagh Maidan, Rajgarh',
    opps: [
      { name: 'Meerut Lions XI', c2: '#475569', bowler: 'Bunty Tyagi', bowlerType: 'pace', batter: 'Golu Rana', str: 38 },
      { name: 'Hapur Sporting Club', c2: '#15803d', bowler: 'Sajid "Leggie" Ansari', bowlerType: 'spin', batter: 'Monu Gurjar', str: 42 },
      { name: 'Chauhan Cricket Academy', c2: '#7c3aed', bowler: 'Vikrant Chauhan', bowlerType: 'pace', batter: 'Vikrant Chauhan', str: 46 },
    ],
    gate: { name: 'District U-19 Trials', need: 52, pass: 'Your name is on the trial list. Rajgarh District Under-19.', fail: 'The list goes up on the clubhouse wall. Your name isn\'t on it.' },
    ambient: 'dawn',
  },
  {
    id: 'u19', ch: 2, title: 'The Trials', level: 1, format: 'ODI', overs: 50,
    sub: 'Under-19 zonal cricket. 200 boys, 16 places, and every one of them is as hungry as you.',
    team: 'Rajgarh District U-19', c1: '#0e7490', schedule: 'TMTMTM', venue: 'Green Park, Kanpur',
    opps: [
      { name: 'Lucknow U-19', c2: '#be123c', bowler: 'Arjun Tripathi', bowlerType: 'pace', batter: 'Kunal Awasthi', str: 50 },
      { name: 'Agra U-19', c2: '#a16207', bowler: 'Faiz Qureshi', bowlerType: 'spin', batter: 'Ankit Jadaun', str: 54 },
      { name: 'Varanasi U-19', c2: '#4338ca', bowler: 'Deepak "Rocket" Maurya', bowlerType: 'pace', batter: 'Shivam Pandey', str: 57 },
    ],
    gate: { name: 'State Ranji Squad', need: 58, pass: 'An email from the state association. Subject line: "Ranji Trophy – Probables".', fail: 'Sixteen names. Vikrant Chauhan is one of them. You are not.' },
    ambient: 'dawn',
  },
  {
    id: 'ranji', ch: 3, title: 'The Grind', level: 2, format: 'FC', overs: 90,
    sub: 'Ranji Trophy. Empty stands, five-day sweat, ₹40,000 a match. This is where cricketers are made — or forgotten.',
    team: 'Uttar Pradesh', c1: '#15803d', schedule: 'TMTMTM', venue: 'Ekana Stadium, Lucknow',
    opps: [
      { name: 'Mumbai', c2: '#1d4ed8', bowler: 'Tushar Deshpandey', bowlerType: 'pace', batter: 'Sarfaraz Khaan', str: 64 },
      { name: 'Karnataka', c2: '#b91c1c', bowler: 'Prasidh Krishnaa', bowlerType: 'pace', batter: 'Mayank Agarwall', str: 62 },
      { name: 'Vidarbha', c2: '#ea580c', bowler: 'Aditya Sarvatey', bowlerType: 'spin', batter: 'Karun Nayar', str: 60 },
    ],
    gate: { name: 'Domestic T20 + Auction Registration', need: 62, pass: 'You\'re in the state T20 squad. And your name goes into the auction pool.', fail: 'The T20 squad is announced. Two of the "lobby" boys made it. You didn\'t.' },
    ambient: 'night',
  },
  {
    id: 'smat', ch: 4, title: 'The Auction', level: 3, format: 'T20', overs: 20,
    sub: 'Syed Mustaq Ali Trophy. Every IPL scout is in the stands with an iPad. Three games to change your life.',
    team: 'Uttar Pradesh', c1: '#15803d', schedule: 'TMTMM', venue: 'Holkar Stadium, Indore',
    opps: [
      { name: 'Punjab', c2: '#e11d48', bowler: 'Arshdeep Singhh', bowlerType: 'pace', batter: 'Abhishek Sharmaa', str: 66 },
      { name: 'Bengal', c2: '#0369a1', bowler: 'Mukesh Kumaar', bowlerType: 'pace', batter: 'Abhishek Porel', str: 64 },
      { name: 'Baroda', c2: '#7c2d12', bowler: 'Krunal Pandiya', bowlerType: 'spin', batter: 'Hardik Pandiya', str: 70 },
    ],
    gate: { name: 'IPL Auction', need: 0, auction: true },
    ambient: 'night',
  },
  {
    id: 'ipl', ch: 5, title: 'The Big Lights', level: 4, format: 'T20', overs: 20,
    sub: 'Indian Prime League. 40,000 people, 50 crore watching, and a camera on your face for every dot ball.',
    team: '', c1: '', schedule: 'TMMTMM', venue: '',
    opps: [], // filled from TEAMS_IPL at runtime
    gate: { name: 'India Call-up', need: 66, pass: 'The phone rings at 11:42 PM. Unknown number. Delhi.', fail: 'The squad is announced on TV. You watch it in a hotel room, alone.' },
    ambient: 'night',
  },
  {
    id: 'india', ch: 6, title: 'The Blue Cap', level: 5, format: 'T20', overs: 20,
    sub: 'India vs Australia. Three T20Is. 1.4 billion people. One kid from a chai stall in Rajgarh.',
    team: 'India', c1: '#1d4ed8', schedule: 'TMTMM', venue: 'Wankhede Stadium, Mumbai',
    opps: [
      { name: 'Australia', c2: '#ca8a04', bowler: 'Mitchell Starck', bowlerType: 'pace', batter: 'Travis Heid', str: 82 },
      { name: 'Australia', c2: '#ca8a04', bowler: 'Adam Zamper', bowlerType: 'spin', batter: 'Glenn Maxwel', str: 82 },
      { name: 'Australia', c2: '#ca8a04', bowler: 'Pat Cumminz', bowlerType: 'pace', batter: 'Steve Smyth', str: 84 },
    ],
    gate: { name: 'Glory', need: 0, final: true },
    ambient: 'gold',
  },
];

// Training actions. fx are base deltas; skill gains get scaled by fatigue and diminishing returns.
const ACTIONS = [
  { id: 'nets_bat', em: '🏏', name: 'Batting Nets', desc: 'Grind technique against the throwdowns.', fx: { technique: 1.4, vsPace: .8, vsSpin: .6, fatigue: 12, form: 2 }, roles: ['bat', 'all'] },
  { id: 'power', em: '💥', name: 'Range Hitting', desc: 'Clear the ropes. Builds power, costs control.', fx: { power: 1.6, technique: -.2, fatigue: 13, confidence: 2 }, roles: ['bat', 'all'] },
  { id: 'spin', em: '🌀', name: 'Spin Drills', desc: 'Footwork vs turning balls on the rough.', fx: { vsSpin: 1.6, technique: .4, fatigue: 9 }, roles: ['bat', 'all'] },
  { id: 'nets_bowl', em: '🎯', name: 'Bowling Nets', desc: 'Six-ball overs at a single stump.', fx: { accuracy: 1.5, variation: .5, fatigue: 15, injury: 4, form: 2 }, roles: ['bowl', 'all'] },
  { id: 'pace', em: '⚡', name: 'Pace Work', desc: 'Run-up and load-up drills. Fast, risky.', fx: { pace: 1.5, fatigue: 17, injury: 7 }, roles: ['bowl', 'all'] },
  { id: 'vars', em: '🃏', name: 'Variations', desc: 'Slower balls, wobble seam, the knuckle.', fx: { variation: 1.6, iq: .3, fatigue: 10 }, roles: ['bowl', 'all'] },
  { id: 'gym', em: '🏋️', name: 'Gym & Running', desc: 'Fitness wins selection fights.', fx: { fitness: 1.6, power: .4, fatigue: 13, injury: -3 } },
  { id: 'video', em: '📺', name: 'Video Study', desc: 'Watch footage. Learn bowlers\' habits.', fx: { iq: 1.5, focus: 6, fatigue: -2 } },
  { id: 'rest', em: '😴', name: 'Rest Day', desc: 'Sleep. Ice. Let the body recover.', fx: { fatigue: -28, injury: -14, mental: 3, coachTrust: -1 } },
  { id: 'yoga', em: '🧘', name: 'Yoga & Breathing', desc: 'Calm under pressure. Pandey-ji swears by it.', fx: { focus: 9, temperament: .9, mental: 4, fatigue: -6 } },
  { id: 'family', em: '🏠', name: 'Family Time', desc: 'Dinner at home. Maa\'s rajma.', fx: { family: 8, mental: 7, fatigue: -6, focus: -2 } },
  { id: 'work', em: '🫖', name: 'Work the Stall', desc: 'Help Papa. Earn. Smell like chai.', fx: { money: 1200, family: 4, fatigue: 11, mental: -1 }, maxStage: 2 },
  { id: 'friends', em: '🍻', name: 'Night Out', desc: 'Team bonding. Or trouble.', fx: { mental: 8, focus: -8, fatigue: 14, coachTrust: -2, fans: 30 }, risk: 'night' },
  { id: 'social', em: '📱', name: 'Post Online', desc: 'Grow your fanbase. Feed the algorithm.', fx: { fans: 'social', mental: -1, focus: -3 }, risk: 'social' },
  { id: 'coach', em: '🧑‍🏫', name: 'Private Coach', desc: 'Expensive, but a pro fixes what you can\'t see.', fx: { technique: 2.2, accuracy: 1.6, iq: .8, fatigue: 10 }, cost: 'coach', minStage: 1 },
  { id: 'physio', em: '🩺', name: 'Physio', desc: 'Dr. Nair\'s magic hands.', fx: { injury: -30, fatigue: -12 }, cost: 'physio', minStage: 1 },
  { id: 'psych', em: '🧠', name: 'Sports Psych', desc: 'Talk it out. Build a pre-ball routine.', fx: { mental: 12, confidence: 6, temperament: 1.2, focus: 5 }, cost: 'psych', minStage: 2 },
  { id: 'shoot', em: '🎬', name: 'Sponsor Shoot', desc: 'Smile for the camera. Get paid.', fx: { money: 'shoot', fans: 'shootFans', fatigue: 8, focus: -5 }, minStage: 3 },
];

// costs scale by stage (rupees)
const COSTS = {
  coach: [0, 4000, 9000, 25000, 150000, 300000],
  physio: [0, 2500, 5000, 12000, 50000, 100000],
  psych: [0, 0, 8000, 15000, 60000, 120000],
  living: [600, 1200, 3000, 8000, 60000, 120000],
};

/* ---------- STORY EVENTS ----------
  stage + week: fixed story beats. random: pool with `when(state)`.
  choice.fx: deltas. choice.check: stat test {stats, dc, win:{fx,out}, lose:{fx,out}}.
  choice.req(state): must be true to pick. Text supports {name} {first} {rival} {team}.
*/
const STORY = [
  // ---------- Chapter 1 ----------
  { id: 'stall', stage: 0, week: 1, em: '🫖', bg: ['#7c2d12', '#1c1917'], who: 'Papa', title: 'Chai, Not Cricket',
    body: 'Five in the morning. Papa is already boiling the first pot at the stall near the bus stand. "The Sharma boy got a job at the sugar mill," he says, without looking at you. "Cricket is for rich people\'s sons, beta. We have Pinky\'s school fees. We have Ramesh-ji\'s loan."',
    choices: [
      { t: '"Give me one season, Papa."', d: 'Bet everything on cricket.', fx: { family: -6, mental: 4, confidence: 6 }, flag: 'oneSeason', out: 'He doesn\'t answer. But the next morning there\'s an extra glass of milk next to your kit bag.' },
      { t: '"I\'ll work mornings, train evenings."', d: 'Slower, but home stays happy.', fx: { family: 9, money: 800, fatigue: 8 }, flag: 'balance', out: 'Papa nods once. The chai tastes sweeter than usual.' },
      { t: 'Say nothing. Sneak off to the maidan.', d: 'Skills up. Home goes cold.', fx: { technique: 2, family: -10, mental: -3 }, out: 'Pandey-ji sees you at the nets at 5:30 AM. "Ghar pe bataya?" Did you tell them at home? You don\'t answer.' },
    ] },
  { id: 'pandey', stage: 0, week: 2, em: '🧢', bg: ['#365314', '#0c0a09'], who: 'Coach Pandey-ji', title: 'The Old Coach',
    body: 'Pandey-ji has run the Gymkhana nets for thirty years. Played four Ranji games in 1991. Never got a fifth. He watches you for twenty minutes, spits paan into the dust and says: "Your bat comes down from gully. Fix it, or go sell chai."',
    choices: [
      { t: '"Teach me. Whatever it takes."', d: 'He\'ll make you suffer.', fx: { coachTrust: 12, technique: 1.5, fatigue: 10 }, out: '"Tomorrow. 5 AM. Bring a tyre." You have no idea what the tyre is for. You\'ll find out.' },
      { t: '"My swing gets me runs."', d: 'Back yourself.', fx: { coachTrust: -8, confidence: 7, power: 1 }, out: 'He laughs. "Runs in gully are free, beta. Wait till a real quick bowls at your nose."' },
    ] },
  { id: 'rival', stage: 0, week: 3, em: '🏏', bg: ['#4c1d95', '#0b0a12'], who: 'Vikrant Chauhan', title: 'The Secretary\'s Son',
    body: 'Vikrant Chauhan arrives in a white SUV with a ₹45,000 English willow. His father is the district association secretary. He picks up your bat — tape on the handle, a crack near the toe — and holds it up for everyone. "Did you find this in a wedding bonfire?"',
    choices: [
      { t: 'Laugh it off.', d: 'Swallow it.', fx: { temperament: 2, mental: -3 }, out: 'You laugh with them. Inside, something hardens. Good. You\'ll need that.' },
      { t: '"Nets. Six balls. You and me."', d: 'Skill check — win big or look stupid.', check: { stats: ['technique', 'vsPace', 'accuracy'], dc: 34,
          win: { fx: { confidence: 12, reputation: 6, fans: 40, selector: 4 }, out: 'Six balls. Four middled, one leave, one dispatched over the bowler\'s head. Vikrant\'s ears go red. Half the maidan saw it.' },
          lose: { fx: { confidence: -10, mental: -5 }, out: 'He beats you twice outside off and knocks your off-stump on the fifth. The laughter follows you home.' } } },
      { t: 'Shove him into the sight-screen.', d: 'Feels great. Costs more.', fx: { coachTrust: -12, reputation: -6, mental: 4 }, flag: 'fight', out: 'It\'s over in ten seconds. Chauhan sahab will hear about this before dinner.' },
    ] },
  { id: 'bribe', stage: 0, week: 5, em: '💰', bg: ['#713f12', '#0b0a12'], who: 'A man in a safari suit', title: 'The Envelope',
    body: 'He finds you after nets. "District trials list is being made. Thirty-two boys, sixteen places. Sahab says ₹25,000 for a confirmed slot. Everyone pays, beta. Don\'t be a hero."',
    choices: [
      { t: 'Pay ₹25,000.', d: 'Selection odds up. Integrity down.', req: s => s.life.money >= 25000, fx: { money: -25000, integrity: -15, selector: 12 }, flag: 'bribe', out: 'He counts the notes twice. "Smart boy." You feel sick on the walk home.' },
      { t: 'Borrow from Ramesh-ji, the moneylender.', d: '20% a month. Papa will find out.', fx: { integrity: -15, family: -6, selector: 12, debt: 30000 }, flag: 'bribe', out: 'Ramesh-ji smiles with every gold tooth. "Twenty percent a month, beta. Your Papa knows my terms."' },
      { t: 'Refuse. Let the bat talk.', d: 'You\'ll need a lot of runs.', fx: { integrity: 10, selector: -8 }, flag: 'refusedBribe', out: '"Your wish." He shrugs, already walking away. Somewhere, a name gets moved down a list.' },
      { t: 'Tell Pandey-ji.', d: 'Needs Coach Trust 55+.', req: s => s.life.coachTrust >= 55, fx: { integrity: 8, coachTrust: 5, selector: 4 }, flag: 'pandeyFights', out: 'Pandey-ji goes very quiet. Then he picks up his phone. "Chauhan? It\'s me. We need to talk about this list."' },
    ] },

  // ---------- Chapter 2 ----------
  { id: 'trialday', stage: 1, week: 1, em: '📋', bg: ['#155e75', '#0b0a12'], who: 'Kanpur, 6:40 AM', title: 'Trial Day',
    body: 'Two hundred boys in the same white kit. Each gets six balls in the nets while three selectors in plastic chairs scroll their phones. You have one chance to make them look up.',
    choices: [
      { t: 'Play it textbook straight.', d: 'Technique test.', check: { stats: ['technique', 'temperament', 'accuracy'], dc: 42,
          win: { fx: { selector: 10, coachTrust: 6, confidence: 6 }, out: 'Six balls, six perfect answers. The old selector puts his phone face-down. He writes something.' },
          lose: { fx: { selector: -4, confidence: -6 }, out: 'Solid. Correct. Forgettable. Nobody writes anything.' } } },
      { t: 'Go big. Make noise.', d: 'Power test. High risk.', check: { stats: ['power', 'pace', 'confidence'], dc: 48,
          win: { fx: { selector: 14, fans: 80, confidence: 10 }, out: 'The fourth one lands on the roof of the pavilion. All three selectors look up at the same time.' },
          lose: { fx: { selector: -8, confidence: -10 }, out: 'You swing at everything. Middle stump cartwheels on the third ball. "Next."' } } },
    ] },
  { id: 'maa', stage: 1, week: 3, em: '🏥', bg: ['#7f1d1d', '#0b0a12'], who: 'Pinky, on the phone', title: 'Maa',
    body: 'Pinky is crying so hard you can barely understand her. Maa collapsed at the stall. District hospital says gall bladder — surgery, ₹18,000, "by Friday." Papa is pretending he has it handled. He does not have it handled.',
    choices: [
      { t: 'Pay it from your savings.', d: 'Needs ₹18,000.', req: s => s.life.money >= 18000, fx: { money: -18000, family: 14, mental: -2 }, out: 'You transfer it from a bus stop. Papa calls that night and just says your name, twice.' },
      { t: 'Go home. Work double shifts.', d: 'Miss training. Coach won\'t like it.', fx: { money: 9000, family: 12, fatigue: 22, form: -8, coachTrust: -6 }, out: 'Two weeks of chai, dishes and night-shift loading at the mandi. Maa comes home thinner but smiling.' },
      { t: 'Let Papa handle it.', d: 'Stay focused on cricket.', fx: { family: -14, mental: -8, focus: 4 }, flag: 'papaScooter', out: 'Papa sells the scooter. He walks to the stall now. 4 km, every morning. Nobody tells you. You find out anyway.' },
    ] },
  { id: 'birat', stage: 1, week: 5, em: '⭐', bg: ['#1e3a8a', '#0b0a12'], who: 'National Cricket Academy', title: 'Birat Kohli Walks In',
    body: 'The U-19 camp goes silent. Birat Kohli — the Birat Kohli — is here for a rehab session and stops by the nets. He watches you for an over. Then he walks over. "Ask me one thing. Quickly, I have physio."',
    choices: [
      { t: '"How do you stay so fit?"', d: 'Fitness, discipline.', fx: { fitness: 3, coachTrust: 4, mental: 4 }, flag: 'biratFit', out: '"No sugar for eight years. No excuses for longer." He pokes your stomach. "Start tomorrow."' },
      { t: '"How do you chase under pressure?"', d: 'Temperament.', fx: { temperament: 3, confidence: 8 }, out: '"I break it into overs. Then balls. Then this ball. Pressure is just maths you haven\'t done yet."' },
      { t: '"Bhaiya, one selfie please?"', d: 'Fans love it.', fx: { fans: 400, focus: -4, mental: 6 }, out: 'He laughs, takes the phone himself. 4,000 likes by evening. Your Instagram has never seen anything like it.' },
    ] },

  // ---------- Chapter 3 ----------
  { id: 'rocky', stage: 2, week: 1, em: '🧔', bg: ['#14532d', '#0b0a12'], who: 'Rocky Bhatia, 34', title: 'The Veteran',
    body: 'Rocky Bhatia: 9,000 first-class runs, 28 hundreds, zero India caps. He\'s icing his knee in the corner of the dressing room. "Kid. Nobody remembers Ranji runs. Selectors watch the IPL. But Ranji makes you a cricketer. Choose what you want to be."',
    choices: [
      { t: '"Teach me how to bat long."', d: 'Become a cricketer.', fx: { iq: 3, temperament: 2, coachTrust: 4 }, flag: 'mentor', out: 'He talks for three hours. Leaves, fields, how to bore a bowler into a mistake. You fill half a notebook.' },
      { t: '"How do I get noticed by IPL scouts?"', d: 'Become famous.', fx: { fans: 200, reputation: 2, iq: 1 }, out: '"Strike rate. Highlights. Be loud." He shrugs. "It worked for everyone except me."' },
    ] },
  { id: 'bookie', stage: 2, week: 3, em: '🎲', bg: ['#3f0d12', '#000000'], who: 'Sunny Bhai', title: 'A Small Favour',
    body: 'A man in the team hotel lobby. Gold chain, kind smile. "Big fan, big fan. Small request — {fixAsk} tomorrow. Two lakh rupees. Cash. Nobody gets hurt, nobody finds out." He slides a phone number across the table.',
    choices: [
      { t: 'Take the money.', d: '₹2,00,000. Don\'t think about it.', fx: { money: 200000, integrity: -40, mental: -10 }, flag: 'fixer', out: 'The envelope is heavier than you expected. So is the next morning.' },
      { t: 'Walk away. Say nothing.', d: 'Stay out of it.', fx: { integrity: 4, mental: -4 }, out: 'You don\'t sleep that night. You don\'t tell anyone, either.' },
      { t: 'Report him to the Anti-Corruption Unit.', d: 'Right thing. Scary thing.', fx: { integrity: 15, reputation: 8, mental: -6, coachTrust: 6 }, flag: 'reported', out: 'Two men from the ACU take your statement. One of them shakes your hand. "Most boys don\'t call us."' },
    ] },
  { id: 'lobby', stage: 2, week: 5, em: '🪑', bg: ['#422006', '#0b0a12'], who: 'Team meeting', title: 'Batting at Seven',
    body: 'The captain\'s Lucknow friend is moved up the order. Again. You\'re pushed down to seven{bowlNote}. Rocky catches your eye across the room and shakes his head slowly: don\'t.',
    choices: [
      { t: 'Confront the captain.', d: 'Risky. Could earn respect.', check: { stats: ['reputation', 'confidence'], dc: 50,
          win: { fx: { confidence: 8, selector: 6, coachTrust: 4 }, out: '"Fine. Prove it." You\'re back at four. He doesn\'t look happy. You don\'t care.' },
          lose: { fx: { coachTrust: -10, selector: -6, mental: -4 }, out: '"Know your place, junior." The coach watches the whole thing and writes nothing down. That\'s worse.' } } },
      { t: 'Swallow it. Score anyway.', d: 'Temperament up.', fx: { temperament: 2.5, mental: -4, coachTrust: 4 }, out: 'Rocky claps you on the back. "Good. Runs at seven count the same. Make them count more."' },
      { t: 'Tell a journalist "off the record".', d: 'Fans love drama. Board doesn\'t.', fx: { fans: 600, reputation: -10, selector: -4 }, out: '"UP DRESSING ROOM POLITICS EXPOSED." It\'s everywhere by morning. So is your name.' },
    ] },

  // ---------- Chapter 4 ----------
  { id: 'agent', stage: 3, week: 1, em: '🕴️', bg: ['#1f2937', '#0b0a12'], who: 'Rohan Mehra, Sports Agent', title: 'The Agent',
    body: 'Linen blazer, two phones, sunglasses indoors. "I represent eleven IPL players. I\'ll get you on every franchise\'s shortlist, get your price up, get you brands. I take fifteen percent. Of everything. Forever."',
    choices: [
      { t: 'Sign with him.', d: 'Higher auction buzz. 15% cut.', fx: { reputation: 6, fans: 500, selector: 6 }, flag: 'agent', out: '"Smart." He\'s already on the phone before the ink dries. "Yes, the UP kid. Trust me."' },
      { t: 'Stay independent.', d: 'Keep every rupee. Fewer doors.', fx: { integrity: 3, mental: 2 }, out: 'He shrugs and gives you his card anyway. "When you\'re unsold, call me."' },
    ] },
  { id: 'clip', stage: 3, week: 3, em: '📲', bg: ['#581c87', '#0b0a12'], who: 'Your phone, 2 AM', title: 'The Clip',
    body: '{clipBody}',
    choices: [
      { t: 'Ride the wave. Post, reply, go live.', d: 'Fans up. Focus down.', fx: { fans: 'clip', focus: -10, mental: 2 }, out: 'You go to bed at 4 AM with 30,000 new followers and a headache.' },
      { t: 'Turn the phone off.', d: 'Stay in your bubble.', fx: { focus: 10, mental: 6, temperament: 1 }, out: 'It buzzes for two days on the bedside table. You don\'t look.' },
    ] },

  // ---------- Chapter 5 ----------
  { id: 'ipl1', stage: 4, week: 1, em: '🏟️', bg: ['#1e1b4b', '#000000'], who: '{iplStar}', title: 'The Big Dressing Room',
    body: 'Your locker is between a World Cup winner and a man with 3 million followers. {iplStar} walks in, scans the room, and stops at you. "Rajgarh, right? I watched your Mustaq Ali knock. What do you need from me this season?"',
    choices: [
      { t: '"Tell me what I\'m doing wrong."', d: 'Learn fast.', fx: { iq: 3, technique: 1, accuracy: 1, coachTrust: 6 }, out: 'He tells you. In detail. For forty minutes. It\'s the best and most humbling coaching of your life.' },
      { t: '"Just a chance, bhaiya."', d: 'Humble. Hungry.', fx: { confidence: 6, mental: 4 }, out: '"You\'ll get it. Then it\'s on you." He means it as kindness. It sounds like a warning.' },
    ] },
  { id: 'party', stage: 4, week: 2, em: '🍾', bg: ['#701a75', '#000000'], who: 'Franchise owner\'s party', title: 'Five-Star Night',
    body: 'Rooftop pool, Bollywood DJ, a Bollywood actor nobody can believe is real. Someone puts a drink in your hand. Your phone has four missed calls from Pandey-ji. Match day is in 38 hours.',
    choices: [
      { t: 'Stay till sunrise.', d: 'Fans up. Risky.', fx: { fans: 1500, mental: 8, fatigue: 25, focus: -15 }, flag: 'partied', out: 'Somebody posts a story. You\'re in the background of it, with a glass. Thousands of people are already commenting.' },
      { t: 'One photo, then home.', d: 'Balance.', fx: { fans: 400, mental: 3, focus: -2 }, out: 'You call Pandey-ji back from the cab. He just asks: "Sleep by eleven?" Yes, sir.' },
      { t: 'Skip it. Ice bath.', d: 'The dull, correct choice.', fx: { focus: 10, fatigue: -10, coachTrust: 5 }, out: 'The physio finds you in the recovery room at 10 PM and laughs. "You\'re the only one here."' },
    ] },
  { id: 'dhony', stage: 4, week: 4, em: '🧘', bg: ['#713f12', '#0b0a12'], who: 'MS Dhony', title: 'Captain Cool',
    body: 'You\'re sitting alone on the boundary rope after training. MS Dhony sits down next to you. Says nothing for two whole minutes. Then: "The scoreboard is not your problem. The next ball is your problem. Only the next ball."',
    choices: [
      { t: '"How do you stay so calm?"', d: 'Temperament.', fx: { temperament: 4, focus: 12, confidence: 6 }, out: '"I\'m not calm. I just don\'t show the other team." He gets up, dusts his pants. "Neither should you."' },
      { t: '"Teach me the helicopter."', d: 'Power.', fx: { power: 3, fans: 900, confidence: 6 }, out: 'He shows you the wrist. Once. "Took me ten years in Ranchi. Good luck." He\'s grinning.' },
    ] },
  { id: 'surrogate', stage: 4, week: 5, em: '📺', bg: ['#14532d', '#000000'], who: 'Rohan, on the phone', title: 'Fantasy App Deal',
    body: '"₹40 lakh for one ad. It\'s a \'fantasy gaming\' app." Everyone knows what it really is — betting with a fig leaf. Half the league does these ads. Papa still owes Ramesh-ji money.',
    choices: [
      { t: 'Take the deal.', d: '₹40 Lakh. Integrity takes a hit.', fx: { money: 4000000, integrity: -14, reputation: -4, fans: 2000 }, out: 'Your face is on a billboard on the Delhi–Meerut expressway. Papa drives past it. He doesn\'t say anything.' },
      { t: 'Say no.', d: 'Leave money on the table.', fx: { integrity: 8, mental: 4 }, out: 'Rohan sighs so hard the line crackles. "Fine. I\'ll find you a shoe brand."' },
    ] },

  // ---------- Chapter 6 ----------
  { id: 'call', stage: 5, week: 1, em: '📞', bg: ['#1d4ed8', '#020617'], who: 'Ajit Agarkur, Chief Selector', title: 'The Call',
    body: '"{first}? Congratulations. You\'re in the India T20I squad against Australia. Don\'t tell anyone till the press release at nine." He hangs up. Your hands are shaking. Who do you call first?',
    choices: [
      { t: 'Papa.', d: '', fx: { family: 18, mental: 12, confidence: 6 }, out: 'He picks up at the stall. You hear the kettle, the bus horns, then nothing at all. Then Papa, crying, telling the whole bus stand.' },
      { t: 'Pandey-ji.', d: '', fx: { coachTrust: 15, mental: 8, temperament: 2 }, out: 'He listens. Long silence. "Your bat still comes down from gully." Then, quietly: "Shabash, beta."' },
      { t: 'Post it everywhere.', d: 'Before the press release.', fx: { fans: 25000, reputation: -8 }, out: 'The BCCB media manager calls you at 9:01. It is not a friendly call.' },
    ] },
  { id: 'cap', stage: 5, week: 3, em: '🧢', bg: ['#1e40af', '#020617'], who: 'Wankhede, team huddle', title: 'Cap Number 312',
    body: 'The huddle on the outfield. Birat Kohli holds a blue cap. "Every cap has a story. This one started at a chai stall in Rajgarh." He hands it to you. Thirty-five thousand people are already chanting your name.',
    choices: [
      { t: 'Say a few words.', d: '', fx: { confidence: 12, reputation: 6 }, out: '"For Papa. For Pandey-ji. For every gully." The huddle roars. You don\'t remember anything after that.' },
      { t: 'Just nod. Pull it on.', d: '', fx: { focus: 14, temperament: 2 }, out: 'It fits. Of course it fits. You\'ve been wearing it in your head since you were nine.' },
    ] },
];

// ---------- RANDOM EVENTS (weekly pool) ----------
const RANDOM_EVENTS = [
  { id: 'niggle', w: 4, when: s => s.cond.fatigue > 60 || s.cond.injury > 45, em: '🩹', bg: ['#7f1d1d', '#0b0a12'], who: 'Your hamstring', title: 'Tightness',
    body: 'Second sprint of the drill and something in the back of your thigh goes "twang". Not a tear. Probably. Match is close and there\'s a queue of boys waiting for your spot.',
    choices: [
      { t: 'Play through it.', d: 'Injury risk up.', fx: { injury: 24, coachTrust: 3 }, out: 'You strap it, smile, and limp only when nobody is looking.' },
      { t: 'Rest properly.', d: 'Lose form and a little trust.', fx: { injury: -20, fatigue: -20, form: -6, coachTrust: -3 }, out: 'Three days of ice and frustration. It works.' },
      { t: 'See a physio.', d: 'Costs money.', req: s => s.life.money >= COSTS.physio[s.stage] * 2, fx: { money: 'physio2', injury: -32, fatigue: -10 }, out: 'Dr. Nair finds the knot in four seconds. You scream. Then it\'s gone.' },
    ] },
  { id: 'yoyo', w: 3, when: s => s.stage >= 2 && !s.flags['yoyo' + s.stage], em: '🏃', bg: ['#0f766e', '#0b0a12'], who: 'Fitness trainer', title: 'The Yo-Yo Test',
    body: 'The beep test that ends careers. Twenty metres, turn, twenty metres, faster every level. Fail it and the selectors won\'t even look at your scores.',
    choices: [
      { t: 'Give everything.', d: 'Fitness check.', setFlag: s => 'yoyo' + s.stage, check: { stats: ['fitness', 'mental'], dc: 'yoyo',
          win: { fx: { selector: 8, coachTrust: 6, confidence: 6 }, out: 'Level 17.4. The trainer double-checks his clipboard. You throw up in the bushes, happily.' },
          lose: { fx: { selector: -10, coachTrust: -6, confidence: -8 }, out: 'Level 15.1. Below the cut. The trainer doesn\'t make eye contact.' } } },
    ] },
  { id: 'troll', w: 4, when: s => s.life.fans > 2000 && s.lastRating !== null && s.lastRating < 5, em: '💬', bg: ['#3b0764', '#0b0a12'], who: 'The comment section', title: 'Trending, Badly',
    body: '"Paid player." "Send him back to the chai stall." "My grandmother bats better." Someone made a meme of your dismissal set to a sad song. It has 2 million views.',
    choices: [
      { t: 'Clap back.', d: 'Fans and drama up.', fx: { fans: 1200, reputation: -6, mental: -4 }, out: 'You win the argument. You lose the afternoon. The screenshot travels further than the original.' },
      { t: 'Delete the app for a week.', d: 'Protect your head.', fx: { mental: 8, focus: 8, fans: -200 }, out: 'Day 1: you reach for it 40 times. Day 4: you notice birds again.' },
    ] },
  { id: 'wedding', w: 3, when: s => s.stage <= 3, em: '💒', bg: ['#9d174d', '#0b0a12'], who: 'Maa', title: 'Cousin\'s Wedding',
    body: 'Bittu bhaiya is getting married in Muzaffarnagar. Three days. Maa has already told every aunty that "the cricketer" is coming.',
    choices: [
      { t: 'Go. Dance like an idiot.', d: 'Family up. Fitness down.', fx: { family: 12, mental: 8, fatigue: 14, focus: -6 }, out: 'You lose a dance-off to a 60-year-old uncle. Maa has never looked prouder.' },
      { t: 'Skip it. Train.', d: 'Family down.', fx: { family: -10, technique: 1, accuracy: 1 }, out: 'Maa says "it\'s fine" in the specific tone that means it is not fine.' },
    ] },
  { id: 'debt', w: 6, when: s => s.life.debt > 0, em: '🪙', bg: ['#422006', '#0b0a12'], who: 'Ramesh-ji, the moneylender', title: 'Interest',
    body: 'Ramesh-ji is at the stall again, drinking free chai and talking loudly about "families who don\'t pay." You owe {debt}. Papa won\'t look at you.',
    choices: [
      { t: 'Pay it off.', d: 'Clear the debt.', req: s => s.life.money >= s.life.debt, fx: { money: 'payDebt', family: 12, mental: 10 }, out: 'You put the cash in his hand in front of the whole bus stand. He counts it slowly. You don\'t care.' },
      { t: '"Next month, Ramesh-ji."', d: 'Debt grows 20%.', fx: { debt: 'grow', family: -8, mental: -8 }, out: '"Next month," he repeats, smiling. "Twenty percent, remember."' },
    ] },
  { id: 'bat', w: 2, when: s => s.stage <= 2 && !s.flags.newBat && s.role !== 'bowl', em: '🪵', bg: ['#78350f', '#0b0a12'], who: 'Sports shop, Meerut', title: 'Grade 1 Willow',
    body: 'Your bat has three cracks and more tape than wood. The shopkeeper hands you a Grade 1 English willow. Pings like a bell. ₹15,000.',
    choices: [
      { t: 'Buy it.', d: '₹15,000. Power up.', req: s => s.life.money >= 15000, fx: { money: -15000, power: 2, confidence: 5 }, flag: 'newBat', out: 'You knock it in for three nights straight with a wooden mallet. Your neighbours hate you.' },
      { t: 'Keep the old one.', d: 'It has runs in it.', fx: { temperament: 1, mental: 2 }, out: 'You add one more layer of tape. It\'s held together by superstition now.' },
    ] },
  { id: 'gully', w: 2, when: s => s.stage <= 2, em: '🧃', bg: ['#a16207', '#0b0a12'], who: 'Bablu, school friend', title: 'Sunday Gully Match',
    body: 'The old gang is playing tennis-ball cricket behind the mandi. "Arre star sahab, one over for us? Or are you too big now?"',
    choices: [
      { t: 'Play. Bowl leggies. Have fun.', d: 'Mental up.', fx: { mental: 10, fans: 60, injury: 4 }, out: 'You get out to a 12-year-old. Everyone screams. Best two hours of the month.' },
      { t: '"Next time, yaar."', d: 'Stay on schedule.', fx: { focus: 4, mental: -3 }, out: 'Bablu says "sure." There won\'t be a next time, and both of you know it.' },
    ] },
  { id: 'praise', w: 5, when: s => s.lastRating !== null && s.lastRating >= 7.5, em: '📰', bg: ['#854d0e', '#0b0a12'], who: 'The sports page', title: 'Front Page',
    body: '"{name}: the next big thing from UP?" Your picture is above the fold. Pandey-ji has laminated it and stuck it on the clubhouse door.',
    choices: [
      { t: 'Enjoy it. You earned it.', d: 'Confidence up.', fx: { confidence: 10, fans: 500, reputation: 4, focus: -4 }, out: 'You read it eleven times. Twelve, actually.' },
      { t: 'Stay grounded.', d: 'Focus up.', fx: { focus: 8, temperament: 1.5, coachTrust: 3 }, out: '"Newspapers wrap samosas tomorrow." Pandey-ji\'s words. Your words now.' },
    ] },
  { id: 'pinky', w: 3, when: s => s.stage <= 3, em: '📚', bg: ['#1e3a8a', '#0b0a12'], who: 'Pinky', title: 'Coaching Fees',
    body: 'Pinky topped her school. She wants to join NEET coaching in Kota — she wants to be a doctor. ₹{pinkyFee}. Papa has said "next year" twice already.',
    choices: [
      { t: 'Pay for it.', d: 'Family way up.', req: s => s.life.money >= [12000, 20000, 40000, 60000][s.stage], fx: { money: 'pinky', family: 16, mental: 8 }, out: 'She hugs you so hard your ribs hurt. "Dr. Pinky. Remember it."' },
      { t: '"Next year, Pinky."', d: 'Keep your money.', fx: { family: -10, mental: -6 }, out: 'She says "okay" and goes to her room. You hear her studying late into the night anyway.' },
    ] },
  { id: 'brand', w: 3, when: s => s.stage >= 3 && s.life.fans > 3000, em: '👟', bg: ['#0f172a', '#000000'], who: 'A shoe brand', title: 'Brand Deal',
    body: 'A sports shoe company wants you for a regional campaign. Two shoot days during a training block. ₹{brandFee}.',
    choices: [
      { t: 'Sign it.', d: 'Money up. Training down.', fx: { money: 'brand', fans: 800, fatigue: 10, focus: -6 }, out: 'You learn that "natural smile" takes 140 takes.' },
      { t: 'Not this block.', d: 'Stay sharp.', fx: { focus: 5, coachTrust: 2 }, out: 'They say they\'ll circle back. They will if you score.' },
    ] },
  { id: 'nightout', w: 3, when: s => s.flags._nightRisk, em: '🌃', bg: ['#312e81', '#000000'], who: 'Team WhatsApp group', title: 'The Photo',
    body: 'Someone posted a photo from last night. It\'s 1:47 AM, you\'re holding something that is definitely not water, and the team manager is in the group.',
    choices: [
      { t: 'Apologise to the manager.', d: 'Own it.', fx: { coachTrust: -4, integrity: 3 }, out: '"Don\'t make me see this again." Fair.' },
      { t: 'Pretend it\'s not you.', d: 'Bold.', fx: { coachTrust: -10, reputation: -4 }, out: 'It is extremely obviously you.' },
    ] },
  { id: 'neha', w: 2, when: s => s.stage >= 1 && s.stage <= 4 && !s.flags.neha, em: '💌', bg: ['#831843', '#0b0a12'], who: 'Neha', title: 'An Old Friend',
    body: 'Neha from school messages out of nowhere. She\'s in your city for an exam. "Coffee? I still have the scorebook from when you got 100 in Class 9."',
    choices: [
      { t: 'Meet her.', d: 'Mental up. Focus down.', fx: { mental: 12, focus: -6, family: 2 }, flag: 'neha', out: 'Three hours pass like ten minutes. She doesn\'t ask about cricket once. It\'s the best part.' },
      { t: '"Busy with camp. Sorry."', d: 'Cricket first.', fx: { focus: 4, mental: -5 }, flag: 'neha', out: 'She replies with a thumbs up. You read it too many times.' },
    ] },
];

// ---------- ENDINGS ----------
const ENDINGS = {
  glory: { em: '🏆', title: 'GLORY', col: '#FFD166', text: 'From a chai stall in Rajgarh to a match-winning series for India. Papa has put your cap behind glass at the stall. The bus stand has a new name for it now. Your name.' },
  debut: { em: '🧢', title: 'CAPPED', col: '#4C6EF5', text: 'You played for India. Not everyone remembers the series, but you will, forever. Cap No. 312. The road from here is yours.' },
  banned: { em: '⛓️', title: 'BANNED', col: '#E63946', text: 'The Anti-Corruption Unit had Sunny Bhai\'s phone records for months. Life ban. The newspapers that called you "the next big thing" now use your photo for a different kind of story.' },
  broken: { em: '🦴', title: 'BROKEN', col: '#9A93A8', text: 'The scan says stress fracture, lower back. Then it says it again, after the comeback. At 23, the body decided for you. Pandey-ji offers you a job at the Gymkhana nets. You take it.' },
  aged: { em: '🫖', title: 'THE STALL', col: '#FF9F1C', text: 'Ten years of trials, lists and "next season." You\'re back at the stall, pouring chai for the morning bus. Sometimes a kid with a taped bat walks past. You always tell them: "Bring a tyre. 5 AM."' },
  quit: { em: '🌧️', title: 'WALKED AWAY', col: '#9A93A8', text: 'Some days the dream is heavier than you are. You take the sugar mill job. Papa never says "I told you so." Somehow that\'s worse.' },
};
