function run_shift(state, from, to) {
  let new_state = Object.fromEntries(Object.entries(state));
  new_state[from] = state[to] || to;
  return new_state;
}
function print_state(state, indent) {
  Object.entries(state).forEach(function(entry) {
    console.log(`${indent}${entry[0]} is ${entry[1]} under appearance/ingest (potion)/material damage and ${state[entry[1]] || entry[1]} under world ingest/stain/alchemy`);
    if (entry[1] != (state[entry[1]] || entry[1])) {
      console.log(indent, "Broken shift!!!");
    }
  });
}
function print_state2(state, indent) {
  Object.entries(state).forEach(function(entry) {
    if (entry[1] != (state[entry[1]] || entry[1])) {
      console.log(`${indent}${entry[0]} -> ${entry[1]} -> ${state[entry[1]]} (ingest/stain/alchemy)`);
    } else {
      console.log(`${indent}${entry[0]} -> ${entry[1]}`);
    }
  });
}
/*shifts.forEach(function(shift){
  state = run_shift(state, shift[0], shift[1]);
  console.log(`After shifting ${shift[0]} into ${shift[1]}:`);
  //print_state(state, "  ");
  console.log("");
});*/

/*
 * Adding this to fungal.cpp from noita-tools:
+int random_nexti(const uint ws, random_pos& rnd, const double min, const double max) {
+       g_rng.SetRandomSeed(ws, rnd.x, rnd.y);
+       const auto proc_result = g_rng.Random((int)RoundHalfOfEven(min), (int)RoundHalfOfEven(max));
+        rnd.y += 1;
+        return proc_result;
+}
 * Then in noita-tools/src/services/SeedInfo/infoHandler/InfoProviders/FungalShift/:
 * em++ fungal.cpp --std=c++20 -lembind -o noita_fungal.js -s MODULARIZE=1
 * Now grab noita_fungal.{wasm,js}.
 * This generates about 400KB of crap, but does give us our fungal shifts.
 */

var noita_fungal_import = await import("./noita_fungal.js");
var noita_fungal = await noita_fungal_import.default();
function load_shifts_for_seed(seed) {
  let test_data_raw = noita_fungal.PickForSeed(seed, 20);
  let shifts = [];
  for(var i=0; i<test_data_raw.size(); i++) {
    let shift_c = test_data_raw.get(i);
    let shift_from = [];
    for(var j=0; j<shift_c["from"].size(); j++) {
      shift_from.push(shift_c["from"].get(j));
    }
    let shift = {
      "from": shift_from,
      "to": shift_c.to,
      "held": shift_c.flaskFrom ? "from" : shift_c.flaskTo ? "to" : null,
      "from_held": shift_c.flaskFrom,
      "to_held": shift_c.flaskTo,
      // TODO greed (gold_to_x, grass_to_x)
    };
    // Store the original state so that we can mess with it later.
    shift.original = {"held": shift.held, "from": shift.from, "to": shift.to};
    shifts.push(shift);
  }
  return shifts;
}
// TODO : Check that shifts are not overwritten before use
//shifts[1].to_held = false;
//shifts[1].from = [ "Fake" ];
//console.log(shifts);
/*shifts.forEach(function(shift){
  shift["from"].forEach(function (from) {
    state = run_shift(state, from, shift["to"]);
  });
  //console.log(`After shifting ${shift["from"][0]} into ${shift["to"]}:`);
  //print_state(state, "  ");
  console.log("");
});*/

function print_helds(held_materials, shifts, after) {
  let state = {};
  for(let i=0; i<after; i++) {
    let hold = held_materials[i];
    let shift_from = shifts[i].from;
    let shift_to = shifts[i].to;
    if (shifts[i].original.held) {
      if (!hold) {
        if (hold === undefined) {
          console.log(`  At the ${i+1}th shift, you may hold nothing.`);
        } else {
          console.log(`  At the ${i+1}th shift, you MUST hold nothing.`);
        }
      } else {
        if (shifts[i].original.held == "to") {
          shift_to = hold;
        } else if (shifts[i].original.held == "from") {
          shift_from = [hold];
        }
        console.log(`  At the ${i+1}th shift, hold ${hold} (as a "${shifts[i].original.held}" material)`);
      }
    }
    for (let from of shift_from) {
      state[from] = state[shift_to] || shift_to;
    }
    console.log(`  The ${i+1}th shift will shift ${shift_from} to ${shift_to} (${state[shift_to] || shift_to})`);
  }
}

function print_solution(held_materials, state, shifts, after) {
  console.log(`SHORTEST: shifts=${after} helds=${held_materials}`);
  print_helds(held_materials, shifts, after);
  print_state2(state, "  ");
}

function check_solved(shifts, constraints_list, max_shifts) {
  var state = {};
  if (shifts.length < max_shifts) {
    max_shifts = shifts.length;
  }
  for (var i = 0; i < max_shifts && i < shifts.length; i++) {
    var shift = shifts[i];
    for (var shift_from of shift.from) {
      state[shift_from] = state[shift.to] || shift.to;
    }
    var correct = true;
    for (var constraint of full_constraints_list) {
      if (!constraint_satisfied(state, constraint)) {
        correct = false;
        break;
      }
    }
    if (correct) {
      return {"length": i + 1, "state": state};
    }
  }
  return undefined;
}

function constraint_satisfied(state, constraint) {
  let state_to = state[constraint.from] || constraint.from;
  if (state_to != constraint.to) {
    return false;
  }
  if (constraint.stain === undefined) {
    return true;
  }
  let state_stain = state[state_to] || state_to;
  return state_stain == constraint.stain;
}

function get_shift_from_helds(shift, constraint) {
  // We want to shift something from contraint.from.
  if (shift.held == "from") {
    if (shift.from.includes(constraint.from)) {
      // If shift.from.includes(constraint.from) then we may be able to use a
      // non-held shift to satisfy another constraint. We should try both
      // with and without this modification.
      return [null, "from"];
    } else {
      // Otherwise, to use this to satisfy our constraint, we _must_ hold the
      // material.
      return ["from"];
    }
  } else if (shift.from.includes(constraint.from)) {
    // We can shift to "something". Either it's what we want, or we can try to
    // do something else earlier in the chain.
    if (shift.held == "to") {
      if (shift.to == constraint.to) {
        // Holding something won't help us, so just insist that we don't.
        return [null];
      } else {
        // Letting it ride will do "something", which may be helpful for other
        // constraints but not prevent us from satisfying ours here. We need to
        // check both cases.
        return [null, "to"];
      }
    } else {
      // No choice, let it ride.
      return [null];
    }
  } else {
    // Just let the shift run. It can't help us satisfy a constraint directly.
    return [];
  }
}

function commit_shift(shift, constraint, shift_held, held_materials, i) {
  if (shift_held == "from") {
    // If we're picking this as a "from held" shift, turn it into a plain
    // shift from our target material.
    shift.from = [constraint.from];
    held_materials[i] = constraint.from;
  } else if (shift_held == "to") {
    // To be useful, we must be shifting to our chosen material.
    shift.to = constraint.to;
    held_materials[i] = constraint.to;
  } else if (shift.held !== null) {
    // Ensure we record that we hold nothing here.
    held_materials[i] = null;
  }
  shift.held = null;
}

function uncommit_shift(shift, shift_held, held_materials, i) {
  if (shift_held == "from") {
    shift.from = shift.original.from;
  } else if (shift_held == "to") {
    shift.to = shift.original.to;
  }
  shift.held = shift.original.held;
  held_materials[i] = undefined;
}

function clever_search(orig_constraints_list, constraints_list, shifts, held_materials, shortest) {
  //console.log(`clever_search(${constraints_list.map(x=>"{"+Object.entries(x)+"}")}, shifts, ${held_materials})`);
  if (constraints_list.length == 0) {
    let ret = check_solved(shifts, orig_constraints_list, shortest.count);
    if (ret !== undefined) {
      if (shortest.count > ret.length) {
        print_solution(held_materials, ret.state, shifts, ret.length);
        shortest.count = ret.length;
        shortest.held = held_materials;
      }
    }
    return;
  }
  var constraint = constraints_list.splice(0, 1)[0];
  var min_shift;
  if (constraint.min_shift === undefined) {
    min_shift = 0;
  } else {
    min_shift = constraint.min_shift;
  }
  var max_shift;
  if (constraint.max_shift === undefined) {
    max_shift = shifts.length - 1;
  } else {
    max_shift = constraint.max_shift;
  }
  if (max_shift > shortest.count) {
    max_shift = shortest.count;
  }
  var state = {};
  let can_skip = false;
  for(var i = 0; i <= max_shift; i++) {
    var shift = shifts[i];
    if (i >= min_shift || true) {
      var shift_from_helds = get_shift_from_helds(shift, constraint);

      for(let shift_held of shift_from_helds) {
        commit_shift(shift, constraint, shift_held, held_materials, i);
        // This shift could be useful to satisfy our constraint.
        //console.log("Viable", constraint, i, shift, shift_from_held);
        if (constraint.stain !== undefined) {
          let stain_constraint = {
            "from": constraint.to,
            "to": constraint.stain,
            "min_shift": i + 1,
            "max_shift": shifts.length - 1,
          }
          constraints_list.splice(0, 0, stain_constraint);
        }
        let shift_to = state[shift.to] || shift.to;
        if (shift_to != constraint.to) {
          // This shift might satisfy our constraint if something earlier were to have prepped our shift.
          // It's actually OK for our source material to have been shifted; we
          // can just hold the (transformed) material.
          var new_constraint = {
            "from": shift.to,
            "to": constraint.to,
            "min_shift": 0,
            "max_shift": i - 1,
          };
          //console.log(new_constraint);
          constraints_list.splice(0, 0, new_constraint);
        }
        // BUG-1 we need to make sure we don't go and ruin a precondition a
        // previous constraint needed in a shift we've not yet reached.
        clever_search(orig_constraints_list, constraints_list, shifts, held_materials, shortest);
        // Fix
        if (shift_to != constraint.to) {
          constraints_list.splice(0, 1);
        }
        if (constraint.stain !== undefined) {
          constraints_list.splice(0, 1);
        }
        uncommit_shift(shift, shift_held, held_materials, i);
      }
    }
    // TODO this is not correct.
    // We can "protect" the from material, optionally. We don't test this.
    // We don't need to consider any other "from" material other than a sacrifice.
    // If we held a list of "forced" shifts, we could log which materials were rescuable.
    state[shift.from] = state[shift.to] || shift.to;
    if (!can_skip && constraint_satisfied(state, constraint)) {
      can_skip = true;
      clever_search(orig_constraints_list, constraints_list, shifts, held_materials, shortest);
    }
  }
  constraints_list.splice(0, 0, constraint);
}



let full_constraints_list = [
  {
    "from": "magic_liquid_polymorph",
    "to": "magic_liquid_random_polymorph",
    //"stain": "sand",
    //"stain": "oil",
    // min_shift
    // max_shift
  },
  {
    "from": "magic_liquid_random_polymorph",
    "to": "magic_liquid_unstable_polymorph",
    //"stain": "oil",
    // min_shift
    // max_shift
  },
  {
    "from": "magic_liquid_unstable_polymorph",
    "to": "magic_liquid_polymorph",
}
  /*{
    "from": "lava",
    "to": "oil",
  },*/
];

// shift, shift, NG, NG, shift, NG, shift, ...
console.log("Constraints:", full_constraints_list);
var seed = 224362081;
var shortest_best = 21;
for(let ng=0; ng<28; ng++) {
  console.log("Searching seed", seed, "+", ng);
  let shifts = load_shifts_for_seed(seed + ng);
  let shifts2 = load_shifts_for_seed(seed + ng + 1);
  for(let shift_nr=0; shift_nr<20; shift_nr++) {
    let combined_shifts = new Array(...shifts.slice(0, shift_nr), ...shifts2.slice(shift_nr));
    let froms = 0;
    let tos = 0;
    for(let shift of combined_shifts) {
      if(shift.held == "from") {
        froms += 1;
      } else if (shift.held == "to") {
        tos += 1;
      }
    }
    console.log("Searching ng+ after", shift_nr, "with", froms, "froms and", tos, "tos");
    let held_materials = [];
    held_materials[19] = undefined;
    var shortest = {
      "count": shortest_best,
    };
    clever_search(full_constraints_list, new Array(...full_constraints_list), combined_shifts, held_materials, shortest);
    if (shortest.count < 21) {
      console.log("Solved!");
      shortest_best = shortest.count;
      break;
    }
  }
    if (shortest.count < 21) {
      break;
    }
}

/*

class Constraint {
  base = null;
  target = null;
  after = null;
  constructor(base, target, after) {
    this.base = base;
    this.target = target;
    if (after) {
      this.after = after;
    }
  }
}

let constraints = [
  new Constraint(
    "lava",
    "acid",
    //"stain": "sand",
    //"stain": "oil",
    // min_shift
    // max_shift
  ),
  new Constraint(
    "acid",
    "magic_liquid_polymorph",
    //"stain": "oil",
    // min_shift
    // max_shift
  ),
  new Constraint(
    "magic_liquid_polymorph",
    "lava",
    "foo",
  ),// foo -> magic_liquid_polymorph -> lava
];


class QueueElement {
  shift = 20;
  ng = 28;
  constraints = [];
  helds = [];
  constructor(shift, ng, constraints, helds) {
    this.shift = shift;
    this.ng = ng;
    this.constraints = constraints;
    if (helds) {
      this.helds = helds;
    }
  }
}

class Held {
  shift = null;
  ng = null;
  material = null;
  constructor(shift, ng, material) {
    this.shift = shift;
    this.ng = ng;
    this.material = material;
  }
}

let queue = [];
for(let ng=3; ng>=0; ng--) {
  for(let shift=12; shift>=0; shift--) {
    queue.push(new QueueElement(shift, ng, constraints));
  }
}

var seed = 1998845907;
let shifts = [];
for(let ng=0; ng<28; ng++) {
  shifts.push(load_shifts_for_seed(seed + ng));
}

function get_helds(shift, constraint) {
  if (shift.from.includes(constraint.from)) {
    if (shift.held == "from") {
      // If shift.from.includes(constraint.from) then we may be able to use a
      // non-held shift to satisfy another constraint. We should try both
      // with and without this modification.
      return [null, "from"];
    } else {
      // Otherwise, to use this to satisfy our constraint, we _must_ hold the
      // material.
      return ["from"];
    }
  }
  return [];
}

function search(queue, item, shifts) {
  console.log(item);
  let shift = shifts[item.ng][item.shift];
  for(let i=0; i<item.constraints.length; i++) {
    let constraint = item.constraints[i];
    let new_constraints = new Array(...item.constraints.slice(0, i), ...item.constraints.slice(i+1));
    let helds = get_shift_from_helds(shift, constraint);
    for(let held of helds) {
      let new_helds = new Array(...item.helds);
      new_helds.push(new Held(item.shift, item.ng, constraint.target));
      if (constraint.after !== null) {
        new_constraints.push(new Constraint(constraint.base, constraint.after));
      }
      // TODO this will push many things, maybe we can keep queue size down?!??!
      for(let ng_no=item.ng; ng_no>=0; ng_no--) {
        for(let shift_no=item.shift - 1; shift_no>=0; shift_no--) {
          queue.push(new QueueElement(shift_no, ng_no, new_constraints));
        }
      }
    }
  }
}

function check(constraints, shifts, helds, current_ng, next_shift, state) {
  let held = helds[0];
  if(held.ng == current_ng) {
    ng_hops = [held.shift+1];
  } else if (held.ng == current_ng + 1) {
    ng_hops = [];
    for(let shift=next_shift; shift<=held.shift; shift++) {
      ng_hops.append(shift);
    }
  } else {
    console.log("2 NG hops!!!!");
    return false;
  }
  for(let ng_hop of ng_hops) {
    let new_state = Object.assign({}, state);
    for(let shift_no=next_shift; shift_no<held.shift; shift_no++) {
      let ng_no = shift_no < ng_hop ? current_ng : current_ng + 1;
      let shift = shifts[ng_no][shift_no];
      if (shift.held === null) {
        base = shift.base;
        target = shift.target;
      } else {
        if (shift_no != held.shift) {
          console.log("Stray held shift");
        }

    check(constraints, shifts, helds.slice(1), held.ng, held.shift, new_state);
  }
}

while(queue.length > 0) {
  let item = queue.pop();
  if (item.constraints.length == 0) {
    // Check if solved.
    check(constraints, shifts, item.helds);
  } else {
    search(queue, item, shifts);
  }
}*/


// OK, so new plan, with aim of a non-recursive solution:
// 
// * Start with a list of constraints Constraints, n=20, ng=28.
// * (Check that Constraints is self-consistent -- if it has stain constraints,
// these must not contradict any other constraints.)
// * There must be a shift Shift with Shift.ng<=ng, Shift.n<=n which satisfies
// the last constraint. For each possible shift:
// * Filter Constraints to just Unstatisfied constraints based on choices made so far.  // THIS IS WRONG. WE HAVE NOT COMMITTED ANY CHOICES.
// * Find the subset Candidates of Unsatisfied that could have been satisfied by Shift.
// * For each Constraint in Candidates:
// * Pick a means of using Shift to satisfy, locking Shift.
// * If Constraint has a stain, the shift must satisfy to -> stain. Delete
// stain from Constraint in NewConstraints.
// * If Constraint has no stain, delete it from NewConstraints.
// * If NewConstraints is empty, we have a solution.
// * If NewConstraints is non-empty, add to the queue with n=Shift.n-1, ng=Shift.ng.
//
// The ordering on which of the 20*29 candidates for Shift decides which
// solutions are found first. Searching earlier shifts first guarantees shorter
// solutions first.
//
// Worst branch factor is about 600 raised to the constraint count.
//
//
//
// OK, so new new plan.
// * There must be a shift Shift which satisfies a first constraint which is not subsequently broken (if it were subsequently broken, it must be re-fixed in a later shift, which would be a candidate here). That is, there must be a constraint Constraint, and a shift Shift after which Constraint is _always_ satisfied.
// * Pick the Shift and pick the Constraint, and then conspire to ensure the Constraint is met. We'll need to check every such conspiracy. We can check that we don't delete the target/stain of any constraint in the process (it's OK to destroy it if something else is shifted to it).
// * If Shift has a stain, replace Shift its stain component, else delete it.
// * Fixing the solution for Shift, search the remaining shifts for another Constraint, recursively.
// * Optimisation: We may be able to avoid fully specifying the Conspiracy so that irrelevant parts of it may be used to satisfy later constraints. This means we can generate fewer queue items for our first Shift/Constraint pair which lowers the complexity. Irrelevant means "does not need to have a from material required as a to material".
// * The algorithm to find Conspiracies is basically the original one.
//
//
// Notes on secondary shifts:
// * By holding X(transformed) on an X->held when X->something, we can make X->X.

/*class Commitment {
  shift_no = null;
  ng_no = null;
  held_material = null;
  constructor(shift_no, ng_no, held_material) {
    this.shift_no = shift_no;
    this.ng_no = ng_no;
    this.held_material = held_material;
  }
}

class Job {
  // Our job
  shift_no = null;
  ng_no = null;
  constraint = null;
  // State from previous jobs
  used_to_materials = {}; // mat -> needed_at; may not destroy before.
  commitments = []; // idx -> (undefined, Commitment)
  state = {};
  possible_rev_states = {}; // inverse of 
  constructor(shift_no, ng_no, constraint, used_to_materials, commitments) {
    this.shift_no = shift_no;
    this.ng_no = ng_no;
    this.constraint = constraint;
    this.used_to_materials = used_to_materials;
    this.commitments = commitments;
  }
}

function satisfy_constraint_with_shift(shifts, job, queue) {
  // First, can we satisfy this constraint with this shift?
  if (shift.held !== "from" && !shift.from.includes(job.constraint.base)) {
    // If we're not able to shift our material, then we're screwed.
    return;
  }
  // First, does our target material even exist?
  // Perhaps we should do this elsewhere.
  if (job.state[job.constraint.target] !== null && job.possible_rev_states[job.constraint.target] === null) {
    // No.
    return;
  }
  // Next, is the base target of the shift something which could be our target?
  if (job.state[shift.to] === null && shift.to == job.constraint.target) {
    // No held shift to an unshifted material.
    // Cool. We'll need to commit to not modifying the base material.
  }
  if (job.possible_states[shift.to].includes(job.constraint.target)) {
    // No held shift to a shifted-away material that can be naturally stored elsewhere.
    // These will pre-generate a broken shift.
    // Also cool. We'll need to commit to whatever's needed to make sure the material is in the right place.
    // We must do this in addition to the plain variety -- it's possible something else will ruin our base shift while preserving an alternative route.
    // If there are many routes, I guess we need to check them all??
    // There likely will be if there are many free "to held" shifts.
  }
  if (job.possible_rev_states["held"]) {
    // No-held shift to a shifted-away material that can be held-stored elsewhere.
    // These will pre-generate a broken shift.
    // There are free "held" shifts. We'll need to iterate all of them and commit the one we use.
  }
  if (shift.held == "to" && job.state[job.constraint.target] === null) {
    // We can commit to not messing with this material.
  }
  if (shift.held == "to" && job.possible_rev_states[job.constraint.target]) {
    // Held shift to a shifted-away material that can be naturally stored elsewhere.
    // These will pre-generate a broken shift.
    // We can commit this shift and whatever is needed to get here.
  }
  if (shift.held == "to" && job.possible_rev_states["held"]) {
    // Held shift to a shifted-away material that can be held-stored elsewhere.
    // These will pre-generate a broken shift.
    // There are free "held" shifts. We'll need to iterate all of them and commit the one we use, in turn.
  }
  // How hard is job.state and job.possible_states to maintain?
}*/
