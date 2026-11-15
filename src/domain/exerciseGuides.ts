// How to do each built-in exercise: a few steps, the cues that matter, and what to avoid.
// General technique guidance in plain words. It is not coaching for injuries or pain.
export interface Guide { steps: string[]; cues: string[]; avoid: string[] }

const G = (steps: string[], cues: string[], avoid: string[]): Guide => ({ steps, cues, avoid });

export const GUIDES: Record<string, Guide> = {
  // ----- chest -----
  'Bench Press': G(
    ['Lie with your eyes under the bar, feet flat, shoulder blades pulled back and down.', 'Grip a little wider than your shoulders and lift the bar out over your chest.', 'Lower it under control to your mid chest, elbows about 45° from your sides.', 'Press back up until your arms are straight.'],
    ['Keep your shoulder blades pinned to the bench the whole set.', 'Push your feet into the floor.'],
    ['Bouncing the bar off your chest.', 'Flaring the elbows straight out to the sides.']),
  'Incline Press': G(
    ['Set the bench to about 30°. Sit back with a dumbbell on each thigh and bring them to your shoulders.', 'Press both up over your upper chest until your arms are straight.', 'Lower slowly until your hands are level with your chest.'],
    ['Wrists stacked over elbows.', 'Chest up, shoulder blades back.'],
    ['A bench set so steep that it becomes a shoulder press.']),
  'Dumbbell Bench Press': G(
    ['Lie on a flat bench with a dumbbell in each hand at chest level, feet flat.', 'Press both up until your arms are straight over your chest.', 'Lower slowly until your upper arms are just below the bench line.'],
    ['Lower for about two seconds.', 'Keep both dumbbells moving together.'],
    ['Letting the dumbbells drift back towards your face.']),
  'Chest Fly': G(
    ['Set the handles at chest height and stand or sit tall with a slight bend in your elbows.', 'Bring your hands together in a wide arc in front of your chest.', 'Open back out slowly until you feel a stretch across the chest.'],
    ['Keep the same elbow bend throughout.', 'Squeeze for a moment when your hands meet.'],
    ['Bending and straightening the arms so it turns into a press.']),
  'Push-up': G(
    ['Start in a high plank, hands just wider than your shoulders, body in one straight line.', 'Lower your chest to just above the floor, elbows about 45° from your sides.', 'Push the floor away until your arms are straight.'],
    ['Squeeze your glutes and brace your stomach.', 'Chest reaches the floor before your hips do.'],
    ['Sagging hips.', 'Half reps.']),
  'Decline Push-up': G(
    ['Put your feet on a bench or step and your hands on the floor, just wider than your shoulders.', 'Lower your chest towards the floor with your body in a straight line.', 'Press back up until your arms are straight.'],
    ['Brace your stomach so your lower back does not dip.'],
    ['Feet so high that your shoulders take over.']),
  'Dips': G(
    ['Support yourself on the bars with straight arms and lean your chest slightly forward.', 'Lower until your upper arms are about level with the bars.', 'Press back up until your arms are straight.'],
    ['Shoulders down, away from your ears.', 'Lean forward more for chest, stay upright for triceps.'],
    ['Dropping lower than your shoulders are comfortable with.']),
  'Pike Push-up': G(
    ['From a push-up position, walk your feet in and lift your hips so your body makes an upside-down V.', 'Bend your elbows and lower the top of your head towards the floor, a little in front of your hands.', 'Press back up to straight arms.'],
    ['Keep your hips high.', 'Elbows point back, not out.'],
    ['Letting the hips drop so it turns into a normal push-up.']),
  // ----- back -----
  'T-Bar Row': G(
    ['Stand over the bar, hinge at the hips with a flat back and take the handle.', 'Pull the weight to your lower chest, driving your elbows back.', 'Lower it until your arms are straight.'],
    ['Chest proud, back flat.', 'Squeeze your shoulder blades together at the top.'],
    ['Jerking the weight up with your lower back.']),
  'Lat Pulldown': G(
    ['Sit with your thighs under the pad and grip the bar just wider than your shoulders.', 'Pull the bar to your upper chest, leading with your elbows.', 'Let it rise under control until your arms are straight.'],
    ['Pull your shoulders down first, then bend the elbows.', 'Lean back only slightly.'],
    ['Pulling the bar behind your neck.', 'Swinging your body to move the weight.']),
  'Lat Row': G(
    ['Sit tall with your feet braced and take the handle with straight arms.', 'Pull the handle to your stomach, elbows close to your sides.', 'Reach forward slowly until your arms are straight again.'],
    ['Keep your torso still.', 'Finish by squeezing your shoulder blades together.'],
    ['Rocking back and forth to build momentum.']),
  'Pull-up': G(
    ['Hang from the bar with an overhand grip a little wider than your shoulders.', 'Pull your chest towards the bar, driving your elbows down.', 'Lower all the way to straight arms.'],
    ['Start each rep by pulling your shoulders down.', 'Legs still, stomach braced.'],
    ['Kicking or swinging to get over the bar.', 'Stopping short of a full hang.']),
  'Chin-up': G(
    ['Hang from the bar with your palms facing you, hands shoulder-width apart.', 'Pull until your chin clears the bar.', 'Lower all the way to straight arms.'],
    ['Keep your chest up as you pull.', 'Lower for about two seconds.'],
    ['Craning your neck to reach the bar.']),
  'Barbell Row': G(
    ['Stand with the bar over your mid-foot, hinge at the hips with a flat back and grip just outside your knees.', 'Pull the bar to your lower ribs.', 'Lower it under control to straight arms.'],
    ['Keep your torso angle the same on every rep.', 'Elbows travel back, not out.'],
    ['Standing up as you pull.', 'Rounding your lower back.']),
  'Dumbbell Row': G(
    ['Put one hand and the same-side knee on a bench with your back flat.', 'Pull the dumbbell to your hip, elbow close to your side.', 'Lower it to a full stretch, then repeat. Switch sides.'],
    ['Hips and shoulders stay square to the floor.'],
    ['Twisting your torso to lift the weight.']),
  'Inverted Row': G(
    ['Lie under a bar set at waist height and grip it just wider than your shoulders.', 'With your body straight, pull your chest to the bar.', 'Lower to straight arms.'],
    ['Squeeze your glutes to keep a straight line.', 'Bend your knees to make it easier.'],
    ['Letting your hips sag.']),
  'Band Pull-apart': G(
    ['Hold a band at chest height with straight arms, hands shoulder-width apart.', 'Pull your hands apart until the band touches your chest.', 'Return slowly.'],
    ['Shoulders down.', 'Move from the shoulder blades, not the elbows.'],
    ['Shrugging towards your ears.']),
  'Face Pull (or reverse fly)': G(
    ['Set a rope at face height and step back with your arms straight.', 'Pull the rope towards your face, hands going either side of your head and elbows high.', 'Return slowly to straight arms.'],
    ['Finish with your hands beside your ears.', 'Use a light weight and a slow tempo.'],
    ['Leaning back to move a weight that is too heavy.']),
  'Rear Delt Fly': G(
    ['Hinge forward with a flat back and a light dumbbell in each hand under your chest.', 'Raise your arms out to the sides until they are level with your shoulders.', 'Lower slowly.'],
    ['Lead with your elbows.', 'Keep a small bend in the arms.'],
    ['Swinging the weights up.']),
  'Dumbbell Shrug': G(
    ['Stand tall with a dumbbell in each hand at your sides.', 'Lift your shoulders straight up towards your ears.', 'Pause for a second, then lower slowly.'],
    ['Arms stay straight.', 'Straight up and down.'],
    ['Rolling the shoulders in circles.']),
  'Barbell Shrug': G(
    ['Stand tall holding the bar in front of your thighs with straight arms.', 'Lift your shoulders straight up towards your ears.', 'Pause for a second, then lower slowly.'],
    ['Arms stay straight.', 'Straight up and down.'],
    ['Rolling the shoulders.', 'Bending the elbows to help.']),
  'Deadlift': G(
    ['Stand with the bar over your mid-foot, feet hip-width apart. Bend down and grip just outside your legs.', 'Lift your chest, flatten your back and take the slack out of the bar.', 'Push the floor away and stand up, keeping the bar against your legs.', 'Lower it by pushing your hips back first, then bending the knees.'],
    ['Brace your stomach before every rep.', 'Bar stays in contact with your legs.'],
    ['Rounding your lower back.', 'Jerking the bar off the floor.']),
  // ----- shoulders -----
  'Shoulder Press': G(
    ['Sit or stand with a dumbbell in each hand at shoulder height, palms forward.', 'Press both overhead until your arms are straight.', 'Lower under control back to your shoulders.'],
    ['Ribs down, stomach tight.', 'Finish with your arms by your ears.'],
    ['Leaning back and arching to press.']),
  'Arnold Press': G(
    ['Hold two dumbbells in front of your shoulders with your palms facing you.', 'Press up while turning your palms to face forward at the top.', 'Reverse the turn as you lower.'],
    ['Make it one smooth movement.'],
    ['Rushing the turn with a weight that is too heavy.']),
  'Lateral Raise': G(
    ['Stand with a light dumbbell in each hand at your sides.', 'Raise your arms out to the sides until they are level with your shoulders.', 'Lower slowly.'],
    ['Lead with your elbows.', 'Keep a slight bend in the arms.'],
    ['Swinging the weights up.', 'Raising above shoulder height.']),
  // ----- arms -----
  'Preacher Curl': G(
    ['Sit with your upper arms flat on the pad and take the bar or dumbbell with your palms up.', 'Curl towards your shoulders.', 'Lower slowly until your arms are almost straight.'],
    ['Keep your upper arms on the pad.', 'Lower for about three seconds.'],
    ['Dropping fast into the bottom position.']),
  'Hammer Curl': G(
    ['Stand with a dumbbell in each hand, palms facing your sides.', 'Curl both up while keeping your palms facing each other.', 'Lower under control.'],
    ['Elbows stay by your ribs.'],
    ['Swinging your body.']),
  'Dumbbell Curl': G(
    ['Stand with a dumbbell in each hand, palms facing forward.', 'Curl up towards your shoulders without moving your upper arms.', 'Lower slowly to straight arms.'],
    ['Elbows stay by your sides.', 'Squeeze at the top.'],
    ['Leaning back to swing the weight up.']),
  'Incline Dumbbell Curl': G(
    ['Lie back on a bench set to about 60° and let your arms hang straight down.', 'Curl both dumbbells up without letting your elbows move forward.', 'Lower slowly to a full stretch.'],
    ['Keep your shoulders against the bench.'],
    ['Letting the elbows drift forward.']),
  'Bayesian Curl': G(
    ['Set the cable low, face away from the machine and hold the handle behind your hip.', 'Curl the handle up towards your shoulder.', 'Lower slowly, letting your arm travel back behind your body.'],
    ['Feel the stretch at the bottom.', 'Keep your elbow still.'],
    ['Twisting your torso to help.']),
  'Rope Pushdown': G(
    ['Set a rope high and stand tall with your elbows tucked into your sides.', 'Push down until your arms are straight, spreading the rope at the bottom.', 'Let your hands rise to chest height under control.'],
    ['Only your forearms move.'],
    ['Leaning over the rope and pressing with your body weight.']),
  'Overhead Triceps Extension': G(
    ['Hold a rope or dumbbell overhead with both hands, upper arms beside your ears.', 'Bend your elbows to lower the weight behind your head.', 'Straighten your arms back to the top.'],
    ['Elbows point forward.', 'Ribs down.'],
    ['Flaring the elbows wide.']),
  'Skull Crusher': G(
    ['Lie on a bench holding the weight over your chest with straight arms.', 'Bend only at the elbows and lower the weight towards your forehead.', 'Straighten your arms to press it back up.'],
    ['Upper arms stay still.', 'Lower slowly.'],
    ['Letting the elbows flare out.']),
  'Close-Grip Bench Press': G(
    ['Lie on the bench and grip the bar with your hands about shoulder-width apart.', 'Lower the bar to your lower chest with your elbows close to your sides.', 'Press up until your arms are straight.'],
    ['Elbows brush your ribs.'],
    ['A grip so narrow that it strains your wrists.']),
  'Bench Dip': G(
    ['Sit on the edge of a bench with your hands beside your hips and slide forward off it.', 'Bend your elbows to lower your hips until your upper arms are about level with the bench.', 'Press back up to straight arms.'],
    ['Keep your back close to the bench.'],
    ['Going so low that the front of your shoulders hurts.']),
  'Wrist Curl': G(
    ['Sit and rest your forearms on your thighs or a bench with your palms up and wrists just past the edge.', 'Curl the weight up by bending only at the wrists.', 'Lower slowly until your wrists are fully extended.'],
    ['Forearms stay flat.', 'Use a light weight.'],
    ['Lifting your forearms to move the weight.']),
  // ----- legs -----
  'Squat': G(
    ['Set the bar across your upper back, feet about shoulder-width apart, toes turned out slightly.', 'Brace, then sit down and back until your thighs are at least level with the floor.', 'Drive up through your whole foot to standing.'],
    ['Knees track over your toes.', 'Chest up, stomach braced.'],
    ['Knees collapsing inward.', 'Heels lifting off the floor.']),
  'Goblet Squat': G(
    ['Hold one dumbbell or kettlebell against your chest, feet shoulder-width apart.', 'Sit down between your knees, keeping your chest tall.', 'Stand back up.'],
    ['Elbows travel inside your knees.'],
    ['Letting the weight pull your chest forward.']),
  'Bodyweight Squat': G(
    ['Stand with your feet shoulder-width apart, arms out in front.', 'Sit back and down until your thighs are level with the floor.', 'Stand up tall.'],
    ['Heels stay down.', 'Knees follow your toes.'],
    ['Rushing through shallow reps.']),
  'Hack Squat': G(
    ['Set your back and shoulders against the pads, feet shoulder-width apart on the platform.', 'Release the safeties and lower until your thighs are at least level with the platform.', 'Press back up without locking your knees hard.'],
    ['Whole foot on the platform.'],
    ['Knees caving inward.']),
  'Leg Press': G(
    ['Sit with your back flat on the pad and your feet shoulder-width apart on the platform.', 'Lower the platform until your knees are bent to about 90°.', 'Press back up, stopping just short of locking your knees.'],
    ['Keep your lower back on the pad.'],
    ['Going so deep that your hips roll off the seat.', 'Locking the knees hard at the top.']),
  'Romanian Deadlift': G(
    ['Stand tall holding the bar or dumbbells in front of your thighs, knees slightly bent.', 'Push your hips back and slide the weight down your legs with a flat back.', 'When you feel a strong stretch in your hamstrings, drive your hips forward to stand.'],
    ['It is a hip hinge, not a squat.', 'Weight stays close to your legs.'],
    ['Rounding your back to reach lower.']),
  'Hamstring Curl': G(
    ['Set the pad just above your heels.', 'Curl your heels towards your glutes.', 'Lower slowly until your legs are almost straight.'],
    ['Keep your hips down on the pad.'],
    ['Lifting your hips to finish the rep.']),
  'Leg Extension': G(
    ['Sit with your knees in line with the machine pivot and the pad on your lower shins.', 'Straighten your legs fully.', 'Lower slowly.'],
    ['Pause for a second at the top.'],
    ['Kicking the weight up.']),
  'Calf Raise': G(
    ['Stand with the balls of your feet on a step or the machine platform.', 'Rise as high as you can onto your toes.', 'Lower your heels below the step for a full stretch.'],
    ['Pause at the top and the bottom.'],
    ['Bouncing through short reps.']),
  'Seated Calf Raise': G(
    ['Sit with the pad on your lower thighs and the balls of your feet on the platform.', 'Push up onto your toes as high as you can.', 'Lower your heels slowly for a full stretch.'],
    ['Slow and full range.'],
    ['Bouncing at the bottom.']),
  'Walking Lunge': G(
    ['Stand tall, with dumbbells at your sides if you are using them.', 'Take a long step forward and lower until both knees are bent to about 90°.', 'Push through the front foot and step straight into the next lunge.'],
    ['Torso upright.', 'Front knee over your ankle.'],
    ['Steps so short that the front heel lifts.']),
  'Bulgarian Split Squat': G(
    ['Stand a long step in front of a bench and rest the top of your back foot on it.', 'Lower straight down until your front thigh is level with the floor.', 'Drive up through the front foot. Finish all reps, then switch legs.'],
    ['Most of your weight is on the front leg.'],
    ['Standing too close to the bench.']),
  'Step-up': G(
    ['Stand facing a bench or sturdy step and put one whole foot on it.', 'Push through that foot to stand up tall on the step.', 'Lower yourself back down slowly with the same leg. Switch sides after your reps.'],
    ['Let the top leg do the work.'],
    ['Pushing off the floor with the back foot.']),
  'Glute Bridge': G(
    ['Lie on your back with your knees bent and feet flat, about hip-width apart.', 'Push through your heels and lift your hips until your body is straight from knees to shoulders.', 'Squeeze, then lower slowly.'],
    ['Ribs down.', 'Squeeze your glutes at the top.'],
    ['Arching your lower back to get higher.']),
  'Hip Thrust': G(
    ['Sit with your upper back against a bench and the bar over your hips, feet flat.', 'Drive through your heels and lift your hips until your thighs are level with the floor.', 'Pause, then lower under control.'],
    ['Chin tucked.', 'Shins vertical at the top.'],
    ['Overarching your lower back at the top.']),
  'Cable Kickback': G(
    ['Attach an ankle strap to a low cable, face the machine and hold on for balance.', 'With a slight bend in the knee, push your leg straight back.', 'Return slowly without letting the weight stack touch down.'],
    ['Hips stay square to the machine.'],
    ['Swinging your leg and arching your back.']),
  'Kettlebell Swing': G(
    ['Stand with your feet wider than your hips and the kettlebell on the floor just in front of you.', 'Hinge at the hips, grip it and hike it back between your legs.', 'Snap your hips forward so the bell floats up to chest height.', 'Let it fall and guide it back between your legs.'],
    ['The power comes from your hips, not your arms.'],
    ['Squatting the weight up.', 'Lifting it with your shoulders.']),
  // ----- core -----
  'Weighted Crunch': G(
    ['Kneel at a cable or lie back holding a weight at your chest.', 'Curl your ribs towards your hips, rounding your upper back.', 'Return slowly.'],
    ['Breathe out as you crunch.'],
    ['Pulling with your arms or your neck.']),
  'Leg Raise': G(
    ['Lie on your back with your legs straight and your hands by your hips.', 'Raise your legs until they point at the ceiling.', 'Lower slowly, stopping just before your heels touch the floor.'],
    ['Press your lower back into the floor.'],
    ['Letting your lower back arch as your legs come down.']),
  'Hanging Knee Raise': G(
    ['Hang from a bar with straight arms.', 'Bring your knees up towards your chest, curling your hips under.', 'Lower slowly without swinging.'],
    ['Start every rep from a still hang.'],
    ['Using momentum to swing the legs up.']),
  'Russian Twist (per side)': G(
    ['Sit with your knees bent, lean back slightly and lift your chest.', 'Turn your shoulders to one side, then the other. One turn each way is one rep.'],
    ['Move your shoulders, not just your hands.'],
    ['Rounding your lower back.']),
  'Plank (sec)': G(
    ['Rest on your forearms and toes with your elbows under your shoulders.', 'Hold a straight line from head to heels for the time.'],
    ['Squeeze your glutes.', 'Keep breathing steadily.'],
    ['Hips sagging or sticking up.']),
  'Side Plank (sec)': G(
    ['Lie on your side with your elbow under your shoulder and your feet stacked.', 'Lift your hips so your body is one straight line and hold. Repeat on the other side.'],
    ['Push the floor away with your forearm.'],
    ['Letting your hips drop or roll forward.']),
};

export const guideFor = (name: string): Guide | null => GUIDES[name] ?? null;
