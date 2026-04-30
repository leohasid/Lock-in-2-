/**
 * Built-in exercise images (/public/images/exercises). Keys are lowercase substrings;
 * longer matches win — see getBuiltInImageUrl.
 */
const IMG = {
  chestPress: "/images/exercises/incline-dumbbell-press.png",
  machineChestPress: "/images/exercises/machine-chest-press.png",
  inclineChestPressMachine: "/images/exercises/incline-chest-press-machine.png",
  /** Standing / seated cable station chest press */
  cableChestPress: "/images/exercises/cable-chest-press.png",
  closeGripBenchPress: "/images/exercises/close-grip-bench-press.png",
  /** Wide-grip barbell bench press */
  wideGripBenchPress: "/images/exercises/wide-grip-bench-press.png",
  flatDumbbellBenchPress: "/images/exercises/flat-dumbbell-bench-press.png",
  dumbbellBenchPress: "/images/exercises/dumbbell-bench-press.png",
  dumbbellShoulderPress: "/images/exercises/dumbbell-shoulder-press.png",
  /** Standing dumbbell Arnold press (rotation overhead) */
  arnoldPress: "/images/exercises/arnold-press.png",
  /** Barbell overhead press with bar behind the head/neck */
  behindNeckPress: "/images/exercises/behind-neck-press.png",
  inclineBarbellBenchPress: "/images/exercises/incline-barbell-bench-press.png",
  /** Incline Smith machine chest press */
  inclineSmithMachinePress: "/images/exercises/incline-smith-machine-press.png",
  smithMachineBenchPress: "/images/exercises/smith-machine-bench-press.png",
  smithMachineShoulderPress: "/images/exercises/smith-machine-shoulder-press.png",
  /** Selector machine seated shoulder press */
  seatedShoulderPressMachine: "/images/exercises/seated-shoulder-press-machine.png",
  /** Angled barbell landmine — chest or shoulder press */
  landminePress: "/images/exercises/landmine-press.png",
  /** Squeeze/hex dumbbell press */
  hexPress: "/images/exercises/hex-press.png",
  /** Standing plate-squeeze (Svend) press */
  svendPress: "/images/exercises/svend-press.png",
  dumbbellFly: "/images/exercises/dumbbell-fly.png",
  inclineFly: "/images/exercises/incline-fly.png",
  /** Seated machine reverse fly / rear delt fly station */
  rearDeltFlyMachine: "/images/exercises/rear-delt-fly-machine.png",
  /** Bent-over cable rear-delt fly */
  cableRearDeltFly: "/images/exercises/cable-rear-delt-fly.png",
  /** Incline chest-supported dumbbell rear-delt fly */
  dumbbellRearDeltFly: "/images/exercises/dumbbell-rear-delt-fly.png",
  inclineDumbbellFly: "/images/exercises/incline-dumbbell-fly.png",
  declineDumbbellFly: "/images/exercises/decline-dumbbell-fly.png",
  cableFlyHigh: "/images/exercises/cable-fly-high.png",
  /** Low-pulley standing cable chest fly */
  lowCableFly: "/images/exercises/low-cable-fly.png",
  inclineCableFly: "/images/exercises/incline-cable-fly.png",
  /** Standing cable crossover / generic cable chest fly (high pulleys) */
  standingCableFly: "/images/exercises/cable-fly.png",
  lateralRaise: "/images/exercises/lateral-raises.png",
  /** Low-pulley cable side / rear-delt raise variant */
  cableLateralRaise: "/images/exercises/cable-lateral-raise.png",
  dumbbellLateralRaise: "/images/exercises/dumbbell-lateral-raise.png",
  /** Single-handle cable lateral / crossover raise */
  lateralSingleArm: "/images/exercises/lateral-single-arm.png",
  frontRaise: "/images/exercises/front-raises.png",
  /** Standing bilateral dumbbell front raise */
  dumbbellFrontRaise: "/images/exercises/dumbbell-front-raise.png",
  /** Low-pulley straight-bar cable front raise */
  cableFrontRaise: "/images/exercises/cable-front-raise.png",
  /** Legacy generic placeholder (curls / core) — keep separate from frontRaise demo art */
  curlCorePlaceholder: "/images/exercises/curl-core-placeholder.png",
  /** EZ-bar curl — shared art also used for concentration curl */
  ezBarCurl: "/images/exercises/ez-bar-curl.png",
  /** Pronated-grip reverse curl (barbell) */
  reverseCurl: "/images/exercises/reverse-curl.png",
  barbellCurl: "/images/exercises/barbell-curl.png",
  preacherCurl: "/images/exercises/preacher-curl.png",
  /** Seated machine preacher / curl station */
  machineCurl: "/images/exercises/machine-curl.png",
  /** Chest-supported spider curl */
  spiderCurl: "/images/exercises/spider-curl.png",
  /** Barbell drag curl */
  dragCurl: "/images/exercises/drag-curl.png",
  oneArmPreacherCurl: "/images/exercises/one-arm-preacher-curl.png",
  zottmanCurl: "/images/exercises/zottman-curl.png",
  inclineDumbbellCurl: "/images/exercises/incline-dumbbell-curl.png",
  /** Standing bilateral dumbbell bicep curl */
  dumbbellCurl: "/images/exercises/dumbbell-curl.png",
  /** Unilateral standing dumbbell curl */
  oneArmDumbbellCurl: "/images/exercises/one-arm-dumbbell-curl.png",
  /** Cross-body / cross-body hammer dumbbell curl */
  crossBodyCurl: "/images/exercises/cross-body-curl.png",
  /** One-arm / single-arm low cable bicep curl (D-handle) */
  singleArmCableCurl: "/images/exercises/single-arm-cable-curl.png",
  /** Standing bar / low-pulley cable bicep curl (both hands) */
  cableCurl: "/images/exercises/cable-curl.png",
  /** Cable curl variant — high pulley / Bayesian-style emphasis */
  bayesianCurl: "/images/exercises/bayesian-curl.png",
  /** Standing barbell overhead / military press (not triceps pushdown bucket below) */
  militaryPress: "/images/exercises/military-press.png",
  overheadPress: "/images/exercises/overhead-press.png",
  skullCrushers: "/images/exercises/skull-crushers.png",
  /** Standing / single-arm dumbbell overhead triceps extension */
  dumbbellOverheadTricepExtension: "/images/exercises/dumbbell-overhead-tricep-extension.png",
  /** Cable / rope overhead triceps extension (low pulley to behind-neck rope) */
  cableOverheadTricepExtension: "/images/exercises/cable-overhead-tricep-extension.png",
  /** High-pulley cable triceps pushdown (straight bar / rope attachment) */
  tricepsPushdown: "/images/exercises/triceps-pushdown.png",
  /** Rope attachment triceps pushdown */
  ropePushdown: "/images/exercises/rope-pushdown.png",
  /** D-handle single-arm cable triceps pushdown */
  oneArmCablePushdown: "/images/exercises/one-arm-cable-pushdown.png",
  /** Single-arm cable triceps kickback */
  singleArmCableKickback: "/images/exercises/single-arm-cable-kickback.png",
  /** Triceps kickback */
  kickbacks: "/images/exercises/kickbacks.png",
  dips: "/images/exercises/dips.png",
  pushUps: "/images/exercises/push-ups.png",
  /** Hands narrow — triceps-focused push-up */
  closeGripPushUp: "/images/exercises/close-grip-push-up.png",
  diamondPushUp: "/images/exercises/diamond-push-up.png",
  pullUps: "/images/exercises/pull-ups.png",
  assistedPullUps: "/images/exercises/assisted-pull-ups.png",
  /** Face pull — rope to face (distinct art) */
  facePull: "/images/exercises/face-pull.png",
  /** Lat pulldown / cable vertical pull-down */
  latPulldown: "/images/exercises/lat-pulldown.png",
  /** V-bar / parallel-grip seated lat pulldown */
  neutralGripLatPulldown: "/images/exercises/neutral-grip-lat-pulldown.png",
  wideGripLatPulldown: "/images/exercises/wide-grip-lat-pulldown.png",
  /** One-hand lat pulldown (D-handle / cable) */
  singleArmLatPulldown: "/images/exercises/single-arm-lat-pulldown.png",
  /** Straight-elbows cable lat isolation pulldown */
  straightArmCablePulldown: "/images/exercises/straight-arm-cable-pulldown.png",
  /** Straight-arm / cable lat pullover (distinct from dumbbell pullover) */
  latPullover: "/images/exercises/lat-pullover.png",
  /** Cross-bench dumbbell pullover */
  dumbbellPullover: "/images/exercises/dumbbell-pullover.png",
  /** Rows, rear-delt pulls, pullovers, etc. (legacy shared illustration) */
  cablePullGeneric: "/images/exercises/cable-pull-generic.png",
  /** Seated low cable row (horizontal pull) */
  seatedCableRow: "/images/exercises/seated-cable-row.png",
  /** One-arm cable row (split stance) */
  singleArmCableRow: "/images/exercises/single-arm-cable-row.png",
  /** Selector / plate seated row station */
  seatedRowMachine: "/images/exercises/seated-row-machine.png",
  /** Low-pulley straight-bar cable upright row */
  cableUprightRow: "/images/exercises/cable-upright-row.png",
  /** High-pulley rope cable crunch (kneeling) */
  cableCrunch: "/images/exercises/cable-crunch.png",
  /** Weighted / plate Russian twist */
  russianTwist: "/images/exercises/russian-twist.png",
  /** Forearm / elbow plank */
  plank: "/images/exercises/plank.png",
  /** Side plank */
  sidePlank: "/images/exercises/side-plank.png",
  shrugs: "/images/exercises/shrugs.png",
  barbellShrug: "/images/exercises/barbell-shrug.png",
  legPress: "/images/exercises/leg-press.png",
  legExtension: "/images/exercises/leg-extension.png",
  calfRaise: "/images/exercises/calf-raise.png",
  /** Standing / bilateral calf raise (generic “calf raise” titles) */
  standingCalfRaise: "/images/exercises/standing-calf-raise.png",
  donkeyCalfRaise: "/images/exercises/donkey-calf-raise.png",
  /** Smith machine standing calf raise */
  smithMachineCalfRaise: "/images/exercises/smith-machine-calf-raise.png",
  legCurl: "/images/exercises/leg-curl.png",
  /** Seated hamstring curl machine */
  seatedLegCurl: "/images/exercises/seated-leg-curl.png",
  hackSquat: "/images/exercises/hack-squat.png",
  splitSquat: "/images/exercises/split-squat.png",
  /** Rear-foot-elevated split squat */
  bulgarianSplitSquat: "/images/exercises/bulgarian-split-squat.png",
  hipThrust: "/images/exercises/hip-thrust.png",
  /** Bodyweight floor glute bridge */
  gluteBridge: "/images/exercises/glute-bridge.png",
  /** Outer / inner thigh selector stations — shared illustration */
  hipAbductionAdductionMachine: "/images/exercises/hip-abduction-adduction-machine.png",
  pecDeckMachine: "/images/exercises/pec-deck-machine.png",
  barbellRow: "/images/exercises/barbell-row.png",
  /** Plate-loaded machine chest-supported row station */
  chestSupportedRow: "/images/exercises/chest-supported-row.png",
  /** Prone bench seal row / barbell chest-supported row */
  sealRow: "/images/exercises/seal-row.png",
  dumbbellRow: "/images/exercises/dumbbell-row.png",
  /** Supported one-arm dumbbell row (bench/knee) */
  oneArmDumbbellRow: "/images/exercises/one-arm-dumbbell-row.png",
  /** Horizontal bodyweight / Smith bar row */
  invertedRow: "/images/exercises/inverted-row.png",
  /** Landmine T-bar row */
  tBarRow: "/images/exercises/t-bar-row.png",
  /** Conventional barbell deadlift */
  deadlift: "/images/exercises/deadlift.png",
  /** Hex/trap-bar deadlift */
  trapBarDeadlift: "/images/exercises/trap-bar-deadlift.png",
  /** Wide-stance sumo deadlift */
  sumoDeadlift: "/images/exercises/sumo-deadlift.png",
  /** Stiff-leg deadlift */
  stiffLegDeadlift: "/images/exercises/stiff-leg-deadlift.png",
  /** Romanian deadlift */
  romanianDeadlift: "/images/exercises/romanian-deadlift.png",
  backExtension: "/images/exercises/back-extension.png",
  /** Roman chair / 45-degree back extension */
  hyperextension: "/images/exercises/hyperextension.png",
  lunge: "/images/exercises/lunge.png",
  /** Side-step / lateral lunge */
  lateralLunge: "/images/exercises/lateral-lunge.png",
  /** Forward / reverse / curtsy — shared illustration */
  forwardReverseCurtsyLunge: "/images/exercises/forward-reverse-curtsy-lunge.png",
  /** Front-foot elevated (deficit) lunge */
  deficitLunge: "/images/exercises/deficit-lunge.png",
  walkingLunge: "/images/exercises/walking-lunges.png",
  abWheelRollout: "/images/exercises/ab-wheel-rollout.png",
  /** Bar-hanging straight-leg raise */
  hangingLegRaise: "/images/exercises/hanging-leg-raise.png",
  barbellSquat: "/images/exercises/barbell-squat.png",
  /** Front rack barbell squat */
  barbellFrontSquat: "/images/exercises/barbell-front-squat.png",
  /** Barbell-in-landmine goblet-style squat */
  landmineSquat: "/images/exercises/landmine-squat.png",
  /** Kneeling-bodyweight quad-focused sissy squat */
  sissySquat: "/images/exercises/sissy-squat.png",
  /** Plate-loaded pendulum squat */
  pendulumSquat: "/images/exercises/pendulum-squat.png",
  /** Barbell hip-hinge good morning */
  goodMorning: "/images/exercises/good-morning.png",
} as const;

function mapKeys(keys: readonly string[], url: string): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k.toLowerCase(), url]));
}

/** Merge image buckets — keys must be lowercase */
const EXERCISE_IMAGES_FLAT: Record<string, string> = {
  ...mapKeys(["hex presses", "hex press"], IMG.hexPress),

  ...mapKeys(["svend presses", "svend press"], IMG.svendPress),

  ...mapKeys(
    [
      // Pressing (bench, smith, machine, cable chest press)
      "bench press",
      "barbell bench press",
      "decline bench press",
      "machine bench press",
      "chest push",
      "chest push machine",
      "neutral grip chest press machine",
      "decline chest press machine",
      "machine shoulder press",
      "push press",
    ],
    IMG.chestPress
  ),

  ...mapKeys(
    [
      "seated shoulder press machines",
      "seated shoulder press machine",
    ],
    IMG.seatedShoulderPressMachine
  ),

  ...mapKeys(
    [
      "landmine shoulder presses",
      "landmine shoulder press",
      "landmine chest presses",
      "landmine chest press",
      "landmine presses",
      "landmine press",
    ],
    IMG.landminePress
  ),

  ...mapKeys(
    [
      "chest press machine",
      "chest press machines",
      "machine chest press",
      "machine chest presses",
      "plate loaded chest press",
      "chest press",
    ],
    IMG.machineChestPress
  ),

  ...mapKeys(
    [
      "incline chest press machines",
      "incline chest press machine",
      "inline chest press machines",
      "inline chest press machine",
    ],
    IMG.inclineChestPressMachine
  ),

  ...mapKeys(
    [
      "standing cable chest press",
      "seated cable chest press",
      "cable chest presses",
      "cable chest press",
      "cabel chest presses",
      "cabel chest press",
    ],
    IMG.cableChestPress
  ),

  ...mapKeys(["close grip bench press", "close grip bench presses"], IMG.closeGripBenchPress),

  ...mapKeys(
    [
      "wide grip barbell bench presses",
      "wide grip barbell bench press",
      "wide grip bench presses",
      "wide grip bench press",
      "wide gripp bench presses",
      "wide gripp bench press",
    ],
    IMG.wideGripBenchPress
  ),

  ...mapKeys(
    ["flat dumbbell bench press", "flat dumbbell press", "flat bench dumbbell press"],
    IMG.flatDumbbellBenchPress
  ),

  ...mapKeys(
    [
      "dumbbell bench press",
      "single arm dumbbell bench press",
      "incline dumbbell bench press",
      "incline dumbbell press",
      "decline dumbbell bench press",
      "decline dumbbell press",
    ],
    IMG.dumbbellBenchPress
  ),

  ...mapKeys(
    ["seated dumbbell shoulder press", "dumbbell shoulder press", "shoulder press"],
    IMG.dumbbellShoulderPress
  ),

  ...mapKeys(
    [
      "seated arnold press",
      "standing arnold press",
      "dumbbell arnold presses",
      "dumbbell arnold press",
      "arnold dumbbell presses",
      "arnold dumbbell press",
      "arnold presses",
      "arnold press",
      "anold presses",
      "anold press",
    ],
    IMG.arnoldPress
  ),

  ...mapKeys(
    [
      "close grip push ups",
      "close grip push up",
      "close grip pushups",
      "close grip pushup",
      "close grip ush ups",
      "close grip ush up",
    ],
    IMG.closeGripPushUp
  ),

  ...mapKeys(["push ups", "push up"], IMG.pushUps),

  ...mapKeys(
    [
      "diamond push ups",
      "diamond push up",
      "diamond pushups",
      "diamond pushup",
      "triangle push ups",
      "triangle push up",
    ],
    IMG.diamondPushUp
  ),

  ...mapKeys(
    [
      "incline bench press",
      "incline barbell press",
      "incline barbell bench press",
      "incline barbell bench presses",
    ],
    IMG.inclineBarbellBenchPress
  ),

  ...mapKeys(
    ["incline smith machine press", "incline smith machine presses"],
    IMG.inclineSmithMachinePress
  ),

  ...mapKeys(
    [
      "smith machine bench presses",
      "smith machine bench press",
      "smith manchine bench presses",
      "smith manchine bench press",
    ],
    IMG.smithMachineBenchPress
  ),

  ...mapKeys(
    [
      "standing smith machine shoulder press",
      "seated smith machine shoulder press",
      "smith machine shoulder presses",
      "smith machine shoulder press",
    ],
    IMG.smithMachineShoulderPress
  ),

  ...mapKeys(
    [
      "standing overhead press",
      "standing military press",
      "strict press",
      "barbell overhead press",
      "overhead presses",
      "overhead press",
      "overhead prsses",
      "overhead prss",
      "military presses",
      "military press",
    ],
    IMG.militaryPress
  ),

  ...mapKeys(
    [
      "smith machine behind neck press",
      "seated behind neck press",
      "behind the neck shoulder press",
      "behind the neck presses",
      "behind the neck press",
      "behind neck shoulder press",
      "behind neck presses",
      "behind neck press",
    ],
    IMG.behindNeckPress
  ),

  ...mapKeys(
    [
      // Flat / horizontal flies
      "dumbbell fly",
      "dumbbell flies",
      "dumbell fly",
      "dumbell flies",
      "flat dumbbell fly",
      "dumbbell chest fly",
      "chest fly",
      "chest flies",
      "flat bench cable fly",
      "single arm cable fly",
      "single arm cable chest fly",
      "cable chest fly",
      "single arm cable chest fly",
    ],
    IMG.dumbbellFly
  ),

  ...mapKeys(
    [
      "single arm chest fly machine",
      "incline chest fly machine",
      "chest fly machines",
      "chest fly machine",
      "ches fly machine",
      "machine chest flies",
      "machine chest fly",
    ],
    IMG.pecDeckMachine
  ),

  ...mapKeys(
    [
      "incline dumbbell flies",
      "incline dumbbell fly",
      "incline dumbell flies",
      "incline dumbell fly",
    ],
    IMG.inclineDumbbellFly
  ),

  ...mapKeys(["cable fly high", "high cable fly", "cable fly highs"], IMG.cableFlyHigh),

  ...mapKeys(
    [
      "low cable flies",
      "low cable fly",
      "low cabel flies",
      "low cabel fly",
      "cable fly lows",
      "cable fly low",
    ],
    IMG.lowCableFly
  ),

  ...mapKeys(
    [
      "single arm incline cable flies",
      "single arm incline cable fly",
      "incline cable flies",
      "incline cable fly",
      "incline cabel flies",
      "incline cabel fly",
    ],
    IMG.inclineCableFly
  ),

  ...mapKeys(
    [
      "single arm standing cable flies",
      "single arm standing cable fly",
      "standing cable flies",
      "standing cable fly",
      "standing cabel flies",
      "standing cabel fly",
      "cable crossovers",
      "cable crossover",
      "cabel flies",
      "cabel fly",
      "cable flies",
      "cable fly",
    ],
    IMG.standingCableFly
  ),

  ...mapKeys(
    [
      "single arm decline dumbbell flies",
      "single arm decline dumbbell fly",
      "decline dumbbell flies",
      "decline dumbbell fly",
      "decline dumbell flies",
      "decline dumbell fly",
      "deline dumbbell flies",
      "deline dumbbell fly",
      "deline dumbell flies",
      "deline dumbell fly",
    ],
    IMG.declineDumbbellFly
  ),

  ...mapKeys(
    [
      // Incline / machine fly motions
      "incline fly",
      "decline cable fly",
      "single arm incline fly",
      "single arm decline fly",
      "single arm dumbbell fly",
    ],
    IMG.inclineFly
  ),

  ...mapKeys(
    [
      "machine rear delt flies",
      "machine rear delt fly",
      "rear delt fly machines",
      "rear delt fly machine",
      "rear delt flies",
      "rear delt fly",
      "reverse fly machines",
      "reverse fly machine",
    ],
    IMG.rearDeltFlyMachine
  ),

  ...mapKeys(
    [
      "single arm cable lateral raises",
      "single arm cable lateral raise",
      "single arm cabel lateral raises",
      "single arm cabel lateral raise",
      "one arm cable lateral raises",
      "one arm cable lateral raise",
      "one arm cabel lateral raises",
      "one arm cabel lateral raise",
      "single arm lateral raise",
      "lateral raise single arm",
      "lateral single arm",
    ],
    IMG.lateralSingleArm
  ),

  ...mapKeys(
    [
      "single arm dumbbell lateral raises",
      "single arm dumbbell lateral raise",
      "one arm dumbbell lateral raises",
      "one arm dumbbell lateral raise",
      "dumbbell lateral raises",
      "dumbbell lateral raise",
      "dumbell lateral raises",
      "dumbell lateral raise",
    ],
    IMG.dumbbellLateralRaise
  ),

  ...mapKeys(
    [
      "cable lateral raises",
      "cable lateral raise",
      "cabel lateral raises",
      "cabel lateral raise",
    ],
    IMG.cableLateralRaise
  ),

  ...mapKeys(
    [
      "lateral raise",
      "lateral raises",
      "side raise",
      "side lateral raise",
      "machine lateral raise",
    ],
    IMG.lateralRaise
  ),

  ...mapKeys(
    [
      "front raise",
      "front raises",
      "standing front raise",
      "anterior raise",
      "front raise single arm",
    ],
    IMG.frontRaise
  ),

  ...mapKeys(
    [
      "single arm dumbbell front raises",
      "single arm dumbbell front raise",
      "one arm dumbbell front raises",
      "one arm dumbbell front raise",
      "standing dumbbell front raises",
      "standing dumbbell front raise",
      "dumbbell front raises",
      "dumbbell front raise",
      "dumbell front raises",
      "dumbell front raise",
    ],
    IMG.dumbbellFrontRaise
  ),

  ...mapKeys(
    [
      "single arm cable front raises",
      "single arm cable front raise",
      "bar cable front raise",
      "low cable front raise",
      "cable front raises",
      "cable front raise",
      "cabel front raises",
      "cabel front raise",
    ],
    IMG.cableFrontRaise
  ),

  ...mapKeys(
    [
      "lying tricep extension",
    ],
    IMG.overheadPress
  ),

  ...mapKeys(["kickbacks", "kickback"], IMG.kickbacks),

  ...mapKeys(
    [
      "single arm cable kickbacks",
      "single arm cable kickback",
      "single arm cabel kickbacks",
      "single arm cabel kickback",
      "one arm cable kickbacks",
      "one arm cable kickback",
      "one arm cabel kickbacks",
      "one arm cabel kickback",
    ],
    IMG.singleArmCableKickback
  ),

  ...mapKeys(
    [
      "standing dumbbell overhead triceps extensions",
      "standing dumbbell overhead triceps extension",
      "standing dumbbell overhead tricep extensions",
      "standing dumbbell overhead tricep extension",
      "overhead dumbbell triceps extensions",
      "overhead dumbbell triceps extension",
      "overhead dumbbell tricep extensions",
      "overhead dumbbell tricep extension",
      "dumbbell overhead triceps extensions",
      "dumbbell overhead triceps extension",
      "dumbbell overhead tricep extensions",
      "dumbbell overhead tricep extension",
      "single arm overhead triceps extensions",
      "single arm overhead triceps extension",
      "single arm overhead tricep extensions",
      "single arm overhead tricep extension",
      "one arm overhead triceps extensions",
      "one arm overhead triceps extension",
      "one arm overhead tricep extensions",
      "one arm overhead tricep extension",
      "one arm overhead extensions",
      "one arm overhead extension",
      "one arm overhead extentions",
      "one arm overhead extention",
      "overhead triceps extensions",
      "overhead triceps extension",
      "overhead tricepts extensions",
      "overhead tricepts extension",
      "overhead tricepts extentions",
      "overhead triceppts extensions",
      "overhead triceppts extension",
      "overhead triceppts extentions",
      "overhead tricep extensions",
      "overhead tricep extension",
      "triceps extensions",
      "triceps extension",
      "triceps extentions",
      "tricepts extensions",
      "tricepts extension",
      "tricepts extentions",
      "tricep extensions",
      "tricep extension",
      "tricep extentions",
    ],
    IMG.dumbbellOverheadTricepExtension
  ),

  ...mapKeys(
    [
      "ez bar skull crusher",
      "dumbbell skull crusher",
      "barbell skull crusher",
      "cable skull crusher",
      "skull crushers",
      "skull crusher",
      "skullcrushers",
      "skullcrusher",
    ],
    IMG.skullCrushers
  ),

  ...mapKeys(
    [
      "single arm cable overhead tricep extension",
      "single arm cable overhead tricep extensions",
      "one arm cable overhead tricep extension",
      "overhead cable tricep extensions",
      "overhead cable tricep extension",
      "cable overhead tricep extensions",
      "cable overhead tricep extension",
      "cable overhead extensions",
      "cable overhead extension",
      "cable overhead extentions",
      "cabel overhead extensions",
      "cabel overhead extension",
      "cabel overhead extentions",
      "rope overhead tricep extension",
      "rope overhead extensions",
    ],
    IMG.cableOverheadTricepExtension
  ),

  ...mapKeys(
    [
      "single arm rope triceps pushdown",
      "single arm rope tricep pushdown",
      "rope triceps push downs",
      "rope triceps push down",
      "rope tricep push downs",
      "rope tricep push down",
      "rope push downs",
      "rope push down",
      "rope pushdowns",
      "rope pushdown",
      "rope triceps pushdown",
      "rope tricep pushdown",
    ],
    IMG.ropePushdown
  ),

  ...mapKeys(
    [
      "single arm cable triceps pushdowns",
      "single arm cable triceps pushdown",
      "single arm cable tricep pushdowns",
      "single arm cable tricep pushdown",
      "single arm cable triceps push downs",
      "single arm cable triceps push down",
      "single arm cable tricep push downs",
      "single arm cable tricep push down",
      "single arm cabel triceps pushdowns",
      "single arm cabel triceps pushdown",
      "single arm cabel tricep pushdowns",
      "single arm cabel tricep pushdown",
      "single arm cabel triceps push downs",
      "single arm cabel triceps push down",
      "single arm cabel tricep push downs",
      "single arm cabel tricep push down",
      "one arm cable pushdowns",
      "one arm cable pushdown",
      "one arm cable push downs",
      "one arm cable push down",
      "one arm cabel pushdowns",
      "one arm cabel pushdown",
      "one arm cabel push downs",
      "one arm cabel push down",
      "one handed triceps push downs",
      "one handed triceps push down",
      "one handed tricep push downs",
      "one handed tricep push down",
      "one handed trieps push downs",
      "one handed trieps push down",
    ],
    IMG.oneArmCablePushdown
  ),

  ...mapKeys(
    [
      "cable triceps push downs",
      "cable triceps push down",
      "cable tricepts push downs",
      "cable tricepts push down",
      "cabel triceps push downs",
      "cabel triceps push down",
      "cabel tricepts push downs",
      "cabel tricepts push down",
      "straight bar triceps pushdown",
      "straight bar tricep pushdown",
      "triceps push downs",
      "triceps push down",
      "tricepts push downs",
      "tricepts push down",
      "tricep push downs",
      "tricep push down",
      "tricepts pushdown",
      "tricep pushdown",
      "triceps pushdown",
      "cable triceps pushdown",
      "cable tricepts pushdown",
      "cable tricep pushdown",
    ],
    IMG.tricepsPushdown
  ),

  ...mapKeys(
    [
      "dip",
      "dips",
      "tricep dips",
      "triceps dips",
      "chest dips",
      "parallel bar dips",
      "dip station",
      "machine dip",
      "machine dips",
      "tricep dip machine",
    ],
    IMG.dips
  ),

  ...mapKeys(
    [
      "assisted pull ups",
      "assisted pull up",
      "assisted pullups",
      "assisted pullup",
      "machine assisted pull up",
      "machine assisted pull ups",
    ],
    IMG.assistedPullUps
  ),

  ...mapKeys(["pull ups", "pull up"], IMG.pullUps),

  ...mapKeys(["face pull", "face pulls", "cable face pull", "rope face pull"], IMG.facePull),

  ...mapKeys(
    [
      "wide grip lat pulldown",
      "wide grip lat pull down",
    ],
    IMG.wideGripLatPulldown
  ),

  ...mapKeys(
    [
      "single arm cable lat pulldowns",
      "single arm cable lat pulldown",
      "one arm cable lat pulldowns",
      "one arm cable lat pulldown",
      "single arm cable pulldowns",
      "single arm cable pulldown",
      "single arm cabel pulldowns",
      "single arm cabel pulldown",
      "single arm cable pull downs",
      "single arm cable pull down",
      "single arm cabel pull downs",
      "single arm cabel pull down",
      "single arm lat pulldowns",
      "single arm lat pulldown",
      "single arm lar pulldowns",
      "single arm lar pulldown",
      "single arm lat pull downs",
      "single arm lat pull down",
      "single arm lar pull downs",
      "single arm lar pull down",
      "one arm lat pulldowns",
      "one arm lat pulldown",
      "one arm lar pulldowns",
      "one arm lar pulldown",
      "one arm lat pull downs",
      "one arm lat pull down",
      "one arm lar pull downs",
      "one arm lar pull down",
      "one arm cable pulldowns",
      "one arm cable pulldown",
      "one arm cable pull downs",
      "one arm cable pull down",
    ],
    IMG.singleArmLatPulldown
  ),

  ...mapKeys(
    [
      "neutral grip lat pulldowns",
      "neutral grip lat pulldown",
      "neutral grip lat pull downs",
      "neutral grip lat pull down",
      "neutral grip lar pulldowns",
      "neutral grip lar pulldown",
      "neutral grip lar pull downs",
      "neutral grip lar pull down",
    ],
    IMG.neutralGripLatPulldown
  ),

  ...mapKeys(
    [
      "straight arm cable pulldowns",
      "straight arm cable pulldown",
      "straight arm cable pull downs",
      "straight arm cable pull down",
      "straight arm cabel pulldowns",
      "straight arm cabel pulldown",
      "straight arm cabel pull downs",
      "straight arm cabel pull down",
      "straigh arm cable pulldowns",
      "straigh arm cable pulldown",
      "straigh arm cable pull downs",
      "straigh arm cable pull down",
      "straigh arm cabel pulldowns",
      "straigh arm cabel pulldown",
      "straigh arm cabel pull downs",
      "straigh arm cabel pull down",
      "straight arm lat pulldowns",
      "straight arm lat pulldown",
      "straight arm lat pull downs",
      "straight arm lat pull down",
      "straight arm lat pullcdowns",
      "straight arm lat pullcdown",
      "straight arm pulldowns",
      "straight arm pulldown",
      "straight arm pull downs",
      "straight arm pull down",
    ],
    IMG.straightArmCablePulldown
  ),

  ...mapKeys(
    [
      "close grip lat pulldown",
      "supinated lat pulldown",
      "rope pull down",
      "pull downs",
      "lat pulldown",
      "lat pull",
    ],
    IMG.latPulldown
  ),

  ...mapKeys(
    [
      "straight arm cable lat pullover",
      "straight arm lat cable pullover",
      "cable straight arm lat pullover",
      "single arm cable lat pullover",
      "cable lat pullover",
      "lat pullover cable",
      "lat pullover machine",
      "lat pullovers",
      "lat pullover",
      "lat pull overs",
      "lat pull over",
      "cable pull overs",
      "cable pull over",
      "cabel pullovers",
      "cabel pullover",
      "cabel pull overs",
      "cabel pull over",
      "cable pullover",
      "pull overs",
    ],
    IMG.latPullover
  ),

  ...mapKeys(
    ["standing barbell shrugs", "standing barbell shrug", "barbell shrugs", "barbell shrug"],
    IMG.barbellShrug
  ),

  ...mapKeys(["shrugs", "shrug", "dumbbell shrug"], IMG.shrugs),

  ...mapKeys(
    [
      "seated row machines",
      "seated row machine",
      "seated row machienes",
      "seated row machiene",
    ],
    IMG.seatedRowMachine
  ),

  ...mapKeys(
    [
      "seated cable rows",
      "seated cable row",
      "low cable rows",
      "low cable row",
      "low cabel rows",
      "low cabel row",
      "machine row highs",
      "machine row high",
      "machine row lows",
      "machine row low",
      "machine high rows",
      "machine high row",
      "machine low rows",
      "machine low row",
      "machine rows",
      "machine row",
      "cable rows",
      "cable row",
    ],
    IMG.seatedCableRow
  ),

  ...mapKeys(
    [
      "chest supported rows",
      "chest supported row",
      "chest supported dumbbell rows",
      "chest supported dumbbell row",
      "chest supported machine rows",
      "chest supported machine row",
    ],
    IMG.chestSupportedRow
  ),

  ...mapKeys(
    [
      "chest supported barbell rows",
      "chest supported barbell row",
      "seal rows",
      "seal row",
    ],
    IMG.sealRow
  ),

  ...mapKeys(
    [
      "inverted rows",
      "inverted row",
      "inveted rows",
      "inveted row",
    ],
    IMG.invertedRow
  ),

  ...mapKeys(
    [
      "dumbbell rear delt flies",
      "dumbbell rear delt fly",
      "dumbell rear delt flies",
      "dumbell rear delt fly",
      "dubell rear delt flies",
      "dubell rear delt fly",
      "dumbbell reverse flies",
      "dumbbell reverse fly",
    ],
    IMG.dumbbellRearDeltFly
  ),

  ...mapKeys(
    [
      "one arm cable rows",
      "one arm cable row",
      "one arm cabel rows",
      "one arm cabel row",
      "single arm cable rows",
      "single arm cable row",
      "single arm cabel rows",
      "single arm cabel row",
    ],
    IMG.singleArmCableRow
  ),

  ...mapKeys(["t-bar rows", "t-bar row", "t bar rows", "t bar row"], IMG.tBarRow),

  ...mapKeys(["cable rear delt flies", "cable rear delt fly", "cabel rear delt flies", "cabel rear delt fly"], IMG.cableRearDeltFly),

  ...mapKeys(
    [
      // Rows & accessories (see IMG.latPulldown for vertical pulldowns)
      "prone rear delt fly",
      "reverse pec deck",
      "reverse cable fly",
    ],
    IMG.cablePullGeneric
  ),

  ...mapKeys(
    [
      "standing cable upright rows",
      "standing cable upright row",
      "cable upright rows",
      "cable upright row",
      "cable up right rows",
      "cable up right row",
      "cabel upright rows",
      "cabel upright row",
      "cabel up right rows",
      "cabel up right row",
      "upright rows",
      "upright row",
      "upright roows",
      "upright roow",
    ],
    IMG.cableUprightRow
  ),

  ...mapKeys(["barbell row", "bent over barbell row"], IMG.barbellRow),

  ...mapKeys(
    [
      "single arm dumbbell rows",
      "single arm dumbbell row",
      "single arm dumbell rows",
      "single arm dumbell row",
      "one arm dumbbell rows",
      "one arm dumbbell row",
      "one arm dumbell rows",
      "one arm dumbell row",
      "one arm dubell rows",
      "one arm dubell row",
    ],
    IMG.oneArmDumbbellRow
  ),

  ...mapKeys(
    [
      "bent over dumbbell rows",
      "bent over dumbbell row",
      "dumbbell rows",
      "dumbbell row",
      "dummbell rows",
      "dummbell row",
      "dumbell rows",
      "dumbell row",
    ],
    IMG.dumbbellRow
  ),

  ...mapKeys(
    [
      "good mornings",
      "good morning",
      "good moring",
    ],
    IMG.goodMorning
  ),

  ...mapKeys(["deadlifts", "deadlift"], IMG.deadlift),

  ...mapKeys(["trap bar deadlifts", "trap bar deadlift"], IMG.trapBarDeadlift),

  ...mapKeys(["sumo deadlifts", "sumo deadlift"], IMG.sumoDeadlift),

  ...mapKeys(["stiff leg deadlifts", "stiff leg deadlift"], IMG.stiffLegDeadlift),

  ...mapKeys(["romanian deadlifts", "romanian deadlift"], IMG.romanianDeadlift),

  ...mapKeys(
    [
      // Hip-hinge / horizontal pulls with barbells & dumbbells
      "meadows row",
      "kroc row",
      "single leg deadlift",
      "single leg rdl",
      "barbell pullover",
    ],
    IMG.dumbbellFly
  ),

  ...mapKeys(
    [
      "dumbbell pullovers",
      "dumbbell pullover",
      "dumbell pullovers",
      "dumbell pullover",
      "dumbell pull overs",
      "dumbell pull over",
      "dubell pullovers",
      "dubell pullover",
    ],
    IMG.dumbbellPullover
  ),

  ...mapKeys(
    [
      "ez bar curls",
      "ez bar curl",
      "e-z bar curls",
      "e-z bar curl",
      "easy bar curls",
      "easy bar curl",
      "concentration curls",
      "concentration curl",
      "concetration curls",
      "concetration curl",
    ],
    IMG.ezBarCurl
  ),

  ...mapKeys(
    [
      "reverse barbell curls",
      "reverse barbell curl",
      "reverse curls",
      "reverse curl",
    ],
    IMG.reverseCurl
  ),

  ...mapKeys(
    [
      "machine curls",
      "machine curl",
      "macine curls",
      "macine curl",
    ],
    IMG.machineCurl
  ),

  ...mapKeys(["drag curls", "drag curl"], IMG.dragCurl),

  ...mapKeys(["spider curls", "spider curl"], IMG.spiderCurl),

  ...mapKeys(
    [
      "hammer curl",
      "high cable curl",
      "waiter curl",
    ],
    IMG.curlCorePlaceholder
  ),

  ...mapKeys(
    [
      "barbell bicep curl",
      "barbell biceps curl",
      "barbell bicepts curl",
      "bicep curl",
      "biceps curl",
      "bicepts curl",
      "barbell curl",
    ],
    IMG.barbellCurl
  ),

  ...mapKeys(["zottman curls", "zottman curl"], IMG.zottmanCurl),

  ...mapKeys(
    [
      "seated incline dumbbell curls",
      "seated incline dumbbell curl",
      "incline dumbbell curls",
      "incline dumbbell curl",
      "incline dumbell curls",
      "incline dumbell curl",
    ],
    IMG.inclineDumbbellCurl
  ),

  ...mapKeys(
    [
      "single arm dumbbell curls",
      "single arm dumbbell curl",
      "single arm dumbell curls",
      "single arm dumbell curl",
      "one arm dumbbell curls",
      "one arm dumbbell curl",
      "one arm dumbell curls",
      "one arm dumbell curl",
    ],
    IMG.oneArmDumbbellCurl
  ),

  ...mapKeys(
    [
      "alternating dumbbell curls",
      "alternating dumbbell curl",
      "standing dumbbell curls",
      "standing dumbbell curl",
      "dumbbell curls",
      "dumbbell curl",
      "dumbell curls",
      "dumbell curl",
    ],
    IMG.dumbbellCurl
  ),

  ...mapKeys(
    [
      "cross body hammer curls",
      "cross body hammer curl",
      "cross body dumbbell curls",
      "cross body dumbbell curl",
      "cross-body curls",
      "cross-body curl",
      "cross body curls",
      "cross body curl",
    ],
    IMG.crossBodyCurl
  ),

  ...mapKeys(
    [
      "bayesian curls",
      "bayesian curl",
      "bayesain curls",
      "bayesain curl",
    ],
    IMG.bayesianCurl
  ),

  ...mapKeys(
    [
      "single arm cable curls",
      "single arm cable curl",
      "single arm cabel curls",
      "single arm cabel curl",
      "one arm cable curls",
      "one arm cable curl",
      "one arm cabel curls",
      "one arm cabel curl",
    ],
    IMG.singleArmCableCurl
  ),

  ...mapKeys(
    [
      "standing straight bar cable curl",
      "straight bar cable curl",
      "standing cable curl",
      "cable bicep curls",
      "cable bicep curl",
      "cabel curls",
      "cabel curl",
      "cable curls",
      "cable curl",
    ],
    IMG.cableCurl
  ),

  ...mapKeys(
    [
      "single arm preacher curls",
      "single arm preacher curl",
      "one arm preacher curls",
      "one arm preacher curl",
    ],
    IMG.oneArmPreacherCurl
  ),

  ...mapKeys(["preacher curl", "preacher curls"], IMG.preacherCurl),

  ...mapKeys(
    ["hack squat", "hack squat machine", "hack squat machines", "machine hack squat"],
    IMG.hackSquat
  ),

  ...mapKeys(["barbell squat", "box squat", "squat"], IMG.barbellSquat),

  ...mapKeys(
    [
      "barbell front squats",
      "barbell front squat",
    ],
    IMG.barbellFrontSquat
  ),

  ...mapKeys(
    [
      "landmine squats",
      "landmine squat",
      "landmine sqauts",
      "landmine sqaut",
    ],
    IMG.landmineSquat
  ),

  ...mapKeys(["pendulum squats", "pendulum squat", "pendulam squats", "pendulam squat"], IMG.pendulumSquat),

  ...mapKeys(
    [
      "smith machine squat",
      "v squat",
      "squat machine",
      "leg press",
      "leg press machine",
      "leg press machines",
      "machine leg press",
      "45 degree leg press",
      "seated leg press",
      "single leg press",
      "single leg leg press",
    ],
    IMG.legPress
  ),

  ...mapKeys(["sissy squats", "sissy squat", "sisssy squats", "sisssy squat", "sisssy sqauts", "sisssy sqaut"], IMG.sissySquat),

  ...mapKeys(
    [
      "leg extension",
      "leg extensions",
      "leg extentions",
      "leg extention",
      "leg extension machine",
      "leg extension machines",
      "leg extention machine",
      "machine leg extension",
      "quad extension",
      "single leg extension",
    ],
    IMG.legExtension
  ),

  ...mapKeys(
    [
      "seated leg curls",
      "seated leg curl",
      "seated hamstring curls",
      "seated hamstring curl",
    ],
    IMG.seatedLegCurl
  ),

  ...mapKeys(
    [
      "leg curl",
      "leg curls",
      "prone leg curl",
      "lying leg curl",
      "standing leg curl",
      "hamstring curl",
      "lying hamstring curl",
      "hamstrings curl",
      "machine leg curl",
      "leg curl machine",
      "leg curl machines",
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
    ],
    IMG.hipThrust
  ),

  ...mapKeys(["glute bridges", "glute bridge"], IMG.gluteBridge),

  ...mapKeys(
    [
      "hip abduction machines",
      "hip abduction machine",
      "hip abductor machines",
      "hip abductor machine",
      "hip abdution machines",
      "hip abdution machine",
      "hip adduction machines",
      "hip adduction machine",
      "hip adductor machines",
      "hip adductor machine",
      "hip abduction",
      "hip adduction",
    ],
    IMG.hipAbductionAdductionMachine
  ),

  ...mapKeys(["walking lunges", "walking lunge"], IMG.walkingLunge),

  ...mapKeys(
    [
      "lateral lunges",
      "lateral lunge",
      "side lunges",
      "side lunge",
    ],
    IMG.lateralLunge
  ),

  ...mapKeys(["deficit lunges", "deficit lunge"], IMG.deficitLunge),

  ...mapKeys(
    [
      "forward lunges",
      "forward lunge",
      "reverse lunges",
      "reverse lunge",
      "curtsy lunges",
      "curtsy lunge",
      "cursey lunges",
      "cursey lunge",
    ],
    IMG.forwardReverseCurtsyLunge
  ),

  /** Other lunge variants (substring "lunge"); walking uses IMG.walkingLunge above */
  ...mapKeys(["lunge"], IMG.lunge),

  ...mapKeys(
    [
      "bulgarian split squats",
      "bulgarian split squat",
      "bulgerian split squats",
      "bulgerian split squat",
    ],
    IMG.bulgarianSplitSquat
  ),

  ...mapKeys(
    [
      "split squat",
      "split squats",
      "weighted split squat",
      "dumbbell split squat",
      "goblet squat",
    ],
    IMG.splitSquat
  ),

  ...mapKeys(
    [
      "machine donkey calf raises",
      "machine donkey calf raise",
      "donkey calf raises",
      "donkey calf raise",
    ],
    IMG.donkeyCalfRaise
  ),

  ...mapKeys(
    [
      "single leg calf raise",
      "standing calf raises",
      "standing calf raise",
      "calf raises",
      "calf raise",
    ],
    IMG.standingCalfRaise
  ),

  ...mapKeys(["smith machine calf raises", "smith machine calf raise"], IMG.smithMachineCalfRaise),

  ...mapKeys(
    [
      "seated calf raises",
      "seated calf raise",
    ],
    IMG.calfRaise
  ),

  ...mapKeys(["hyperextensions", "hyperextension", "hyperextentions", "hyperextention"], IMG.hyperextension),

  ...mapKeys(["back extension", "back extensions"], IMG.backExtension),

  ...mapKeys(
    ["ab wheel roll out", "ab wheel rollout", "ab wheel rollouts"],
    IMG.abWheelRollout
  ),

  ...mapKeys(
    [
      "hanging leg raises",
      "hanging leg raise",
      "haning leg raises",
      "haning leg raise",
    ],
    IMG.hangingLegRaise
  ),

  ...mapKeys(
    [
      "kneeling rope cable crunch",
      "kneeling cable crunch",
      "rope cable crunch",
      "cable abdominal crunch",
      "cable ab crunch",
      "cable crunches",
      "cable crunch",
      "cabel crunches",
      "cabel crunch",
    ],
    IMG.cableCrunch
  ),

  ...mapKeys(
    [
      "weighted russian twists",
      "weighted russian twist",
      "plate russian twists",
      "plate russian twist",
      "russian twists",
      "russian twist",
    ],
    IMG.russianTwist
  ),

  ...mapKeys(
    [
      "forearm planks",
      "forearm plank",
      "elbow planks",
      "elbow plank",
      "planks",
      "plank",
    ],
    IMG.plank
  ),

  ...mapKeys(["side planks", "side plank"], IMG.sidePlank),

  ...mapKeys(["pallof press"], IMG.curlCorePlaceholder),
};

export const BUILT_IN_EXERCISE_IMAGES: Record<string, string> = EXERCISE_IMAGES_FLAT;

const STANDING_KEYS = [
  "lateral raise",
  "front raise",
  "overhead press",
  "military press",
  "shoulder press",
  "face pull",
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
