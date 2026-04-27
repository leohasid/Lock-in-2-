/**
 * Built-in exercise images (/public/images/exercises). Keys are lowercase substrings;
 * longer matches win — see getBuiltInImageUrl.
 */
const IMG = {
  chestPress: "/images/exercises/incline-dumbbell-press.png",
  dumbbellFly: "/images/exercises/dumbbell-fly.png",
  inclineFly: "/images/exercises/incline-fly.png",
  lateralRaise: "/images/exercises/lateral-raises.png",
  frontRaise: "/images/exercises/front-raises.png",
  overheadPress: "/images/exercises/overhead-press.png",
  dips: "/images/exercises/dips.png",
  facePull: "/images/exercises/face-pull.png",
  legPress: "/images/exercises/leg-press.png",
  legExtension: "/images/exercises/leg-extension.png",
  legCurl: "/images/exercises/leg-curl.png",
  hackSquat: "/images/exercises/hack-squat.png",
  splitSquat: "/images/exercises/split-squat.png",
  hipThrust: "/images/exercises/hip-thrust.png",
} as const;

function mapKeys(keys: readonly string[], url: string): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k.toLowerCase(), url]));
}

/** Merge image buckets — keys must be lowercase */
const EXERCISE_IMAGES_FLAT: Record<string, string> = {
  ...mapKeys(
    [
      // Pressing (bench, smith, machine, cable chest press)
      "bench press",
      "barbell bench press",
      "wide grip bench press",
      "close grip bench press",
      "decline bench press",
      "decline smith press",
      "smith machine bench press",
      "machine bench press",
      "chest press",
      "chest press machine",
      "machine chest press",
      "chest push",
      "chest push machine",
      "neutral grip chest press machine",
      "plate loaded chest press",
      "incline bench press",
      "incline barbell press",
      "incline barbell bench press",
      "incline smith machine press",
      "incline chest press machine",
      "decline chest press machine",
      "flat dumbbell bench press",
      "flat dumbbell press",
      "flat bench dumbbell press",
      "dumbbell bench press",
      "single arm dumbbell bench press",
      "incline dumbbell bench press",
      "incline dumbbell press",
      "hex press",
      "svend press",
      "landmine press",
      "cable chest press",
      "push ups",
      "close grip push up",
      "shoulder press",
      "dumbbell shoulder press",
      "seated dumbbell shoulder press",
      "machine shoulder press",
      "smith machine shoulder press",
      "seated shoulder press machine",
      "landmine shoulder press",
      "arnold press",
      "push press",
      "behind neck press",
      "standing overhead press",
      "standing military press",
      "strict press",
      "barbell overhead press",
      "overhead press",
      "military press",
      "machine dip",
      "tricep dip machine",
    ],
    IMG.chestPress
  ),

  ...mapKeys(
    [
      // Flat / horizontal flies
      "dumbbell fly",
      "dumbbell flies",
      "flat dumbbell fly",
      "dumbbell chest fly",
      "chest fly",
      "chest flies",
      "flat bench cable fly",
      "low cable fly",
      "cable crossover",
      "cable fly",
      "standing cable fly",
      "single arm cable fly",
      "single arm cable chest fly",
      "cable chest fly",
      "single arm cable chest fly",
    ],
    IMG.dumbbellFly
  ),

  ...mapKeys(
    [
      // Incline / pec deck / machine fly motions
      "incline fly",
      "incline dumbbell fly",
      "incline cable fly",
      "decline dumbbell fly",
      "decline cable fly",
      "pec deck",
      "pec deck machine",
      "machine chest fly",
      "chest fly machine",
      "incline chest fly machine",
      "single arm incline fly",
      "single arm decline fly",
      "single arm dumbbell fly",
      "single arm chest fly machine",
      "cable fly high",
      "cable fly low",
      "reverse fly machine",
      "rear delt fly machine",
    ],
    IMG.inclineFly
  ),

  ...mapKeys(
    [
      "lateral raise",
      "lateral raises",
      "dumbbell lateral raise",
      "side raise",
      "side lateral raise",
      "lateral raise single arm",
      "cable lateral raise",
      "leaning cable lateral raise",
      "machine lateral raise",
      "bayesian curl",
    ],
    IMG.lateralRaise
  ),

  ...mapKeys(
    [
      "front raise",
      "front raises",
      "dumbbell front raise",
      "standing front raise",
      "anterior raise",
      "cable front raise",
      "front raise single arm",
    ],
    IMG.frontRaise
  ),

  ...mapKeys(
    [
      "overhead tricep extensions",
      "overhead tricep extension",
      "tricep extension",
      "lying tricep extension",
      "skull crushers",
      "cable overhead extension",
      "one arm overhead extension",
      "one handed tricep push down",
      "one arm cable pushdown",
      "tricep pushdown",
      "cable tricep pushdown",
      "rope pushdown",
      "kickbacks",
      "single arm cable kickback",
    ],
    IMG.overheadPress
  ),

  ...mapKeys(
    [
      "dip",
      "dips",
      "tricep dips",
      "chest dips",
      "parallel bar dips",
      "dip station",
      "diamond push up",
    ],
    IMG.dips
  ),

  ...mapKeys(
    [
      // Pull / rows — cable & vertical pulls
      "face pull",
      "face pulls",
      "cable face pull",
      "rope face pull",
      "lat pulldown",
      "wide grip lat pulldown",
      "close grip lat pulldown",
      "neutral grip lat pulldown",
      "supinated lat pulldown",
      "single arm lat pulldown",
      "straight arm lat pulldown",
      "straight arm cable pulldown",
      "single arm cable pulldown",
      "rope pull down",
      "pull downs",
      "lat pullover machine",
      "cable pullover",
      "assisted pull up",
      "pull ups",
      "barbell shrug",
      "seated cable row",
      "low cable row",
      "one arm cable row",
      "single arm cable row",
      "cable row",
      "machine row",
      "machine low row",
      "machine high row",
      "seated row machine",
      "t-bar row",
      "inverted row",
      "chest supported row",
      "chest supported dumbbell row",
      "upright row",
      "cable upright row",
      "rear delt fly",
      "prone rear delt fly",
      "dumbbell reverse fly",
      "reverse pec deck",
      "reverse cable fly",
      "cable rear delt fly",
      "shrugs",
      "pull overs",
      "lat pull overs",
    ],
    IMG.facePull
  ),

  ...mapKeys(
    [
      // Hip-hinge / horizontal pulls with barbells & dumbbells
      "barbell row",
      "bent over barbell row",
      "pendlay row",
      "meadows row",
      "kroc row",
      "seal row",
      "dumbbell row",
      "one arm dumbbell row",
      "single arm dumbbell row",
      "deadlift",
      "sumo deadlift",
      "trap bar deadlift",
      "romanian deadlift",
      "stiff leg deadlift",
      "single leg deadlift",
      "single leg rdl",
      "good morning",
      "dumbbell pullover",
      "barbell pullover",
    ],
    IMG.dumbbellFly
  ),

  ...mapKeys(
    [
      "bicep curl",
      "barbell curl",
      "dumbbell curl",
      "ez bar curl",
      "cable curl",
      "cable bicep curl",
      "hammer curl",
      "cross body hammer curl",
      "preacher curl",
      "one arm preacher curl",
      "spider curl",
      "concentration curl",
      "incline dumbbell curl",
      "high cable curl",
      "drag curl",
      "reverse curl",
      "waiter curl",
      "zottman curl",
      "pinwheel curl",
      "machine curl",
      "one arm cable curl",
      "single arm cable curl",
      "one arm dumbbell curl",
    ],
    IMG.frontRaise
  ),

  ...mapKeys(
    [
      "squat",
      "barbell squat",
      "barbell front squat",
      "smith machine squat",
      "box squat",
      "hack squat",
      "hack squat machine",
      "machine hack squat",
      "pendulum squat",
      "v squat",
      "squat machine",
      "landmine squat",
      "leg press",
      "leg press machine",
      "machine leg press",
      "45 degree leg press",
      "seated leg press",
      "single leg press",
      "single leg leg press",
      "leg press calf raise",
    ],
    IMG.legPress
  ),

  ...mapKeys(
    [
      "leg extension",
      "leg extensions",
      "machine leg extension",
      "quad extension",
      "single leg extension",
      "sissy squat",
    ],
    IMG.legExtension
  ),

  ...mapKeys(
    [
      "leg curl",
      "leg curls",
      "prone leg curl",
      "lying leg curl",
      "seated leg curl",
      "standing leg curl",
      "hamstring curl",
      "lying hamstring curl",
      "hamstrings curl",
      "machine leg curl",
      "leg curl machine",
      "single leg curl",
      "nordic curl",
    ],
    IMG.legCurl
  ),

  ...mapKeys(
    [
      "hip thrust",
      "hipthrust",
      "barbell hip thrust",
      "hip thrusts",
      "single leg hip thrust",
      "glute bridge",
      "glute bridge single leg",
    ],
    IMG.hipThrust
  ),

  ...mapKeys(
    [
      "lunges",
      "walking lunges",
      "dumbbell lunge",
      "reverse lunge",
      "forward lunge",
      "lateral lunge",
      "curtsy lunge",
      "deficit lunge",
      "split squat",
      "split squats",
      "bulgarian split squat",
      "weighted split squat",
      "dumbbell split squat",
      "goblet squat",
    ],
    IMG.splitSquat
  ),

  ...mapKeys(
    [
      "calf raise",
      "standing calf raise",
      "seated calf raise",
      "single leg calf raise",
      "smith machine calf raise",
      "donkey calf raise",
    ],
    IMG.legExtension
  ),

  ...mapKeys(
    ["hyperextension", "back extension", "ab wheel rollout", "hanging leg raise", "cable crunch"],
    IMG.facePull
  ),

  ...mapKeys(["plank", "side plank", "russian twist", "pallof press"], IMG.frontRaise),
};

export const BUILT_IN_EXERCISE_IMAGES: Record<string, string> = EXERCISE_IMAGES_FLAT;

const STANDING_KEYS = [
  "lateral raise",
  "front raise",
  "overhead press",
  "military press",
  "shoulder press",
  "calf raise",
  "shrug",
  "upright row",
];

export function getExerciseImagePosition(exerciseName: string): "object-top" | "object-center" {
  if (!exerciseName) return "object-center";
  const name = exerciseName.toLowerCase().trim();
  return STANDING_KEYS.some((key) => name.includes(key)) ? "object-top" : "object-center";
}

export function getBuiltInImageUrl(exerciseName: string): string | undefined {
  if (!exerciseName) return undefined;
  const name = exerciseName.toLowerCase().trim();
  const entries = Object.entries(BUILT_IN_EXERCISE_IMAGES).sort((a, b) => b[0].length - a[0].length);
  for (const [key, url] of entries) {
    if (name.includes(key)) return url;
  }
  return undefined;
}
