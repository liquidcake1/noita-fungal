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
      "base": shift_from,
      "target": shift_c.to,
      "held": shift_c.flaskFrom ? "from" : shift_c.flaskTo ? "to" : null,
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
    let shift_from = shifts[i].base;
    let shift_to = shifts[i].target;
    if (shifts[i].original.held) {
      if (!hold) {
        if (hold === null) {
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

function check_solved(job, world_state) {
  let shifts = world_state.shifts;
  let held_materials = job.held_materials;
  let max_shifts;
  if (world_state.best_length !== null) {
    max_shifts = world_state.best_length;
  } else {
    max_shifts = shifts.length;
  }
  let state = {};
  let full_constraints_list = world_state.constraints;
  for (var i = 0; i < max_shifts; i++) {
    var shift = shifts[i];
    let base_materials = shift.base;
    let target_material = shift.target;
    if (shift.held && held_materials[i]) {
      if (shift.held == "to") {
        target_material = held_materials[i];
      } else {
        base_materials = [held_materials[i]];
      }
    }
    if (state[target_material]) {
      target_material = state[target_material];
    }
    for (var shift_from of base_materials) {
      state[shift_from] = target_material;
    }
    var correct = true;
    for (var constraint of full_constraints_list) {
      if (!constraint_satisfied(state, constraint)) {
        correct = false;
        if (i == 4) {
        //console.log("Not satisfied", constraint, state);
        }
        break;
      }
    }
    if (correct) {
      return {"length": i + 1, "state": state};
    }
  }
  return null;
}

function constraint_satisfied(state, constraint) {
  let state_to = state[constraint.base] || constraint.base;
  if (state_to != constraint.target) {
    return false;
  }
  if (!constraint.stain) {
    return true;
  }
  let state_stain = state[state_to] || state_to;
  return state_stain == constraint.stain;
}

function get_shift_from_helds(shift, constraint, reverse_state) {
  // We want to shift something from contraint.from.
  if (shift.held == "from") {
    if (shift.base.includes(constraint.base)) {
      // If shift.from.includes(constraint.from) then we may be able to use a
      // non-held shift to satisfy another constraint. We should try both
      // with and without this modification.
      return [null, "from"];
    } else {
      // Otherwise, to use this to satisfy our constraint, we _must_ hold the
      // material.
      return ["from"];
    }
  } else if (shift.base.includes(constraint.base)) {
    // We can shift to "something". Either it's what we want, or we can try to
    // do something else earlier in the chain.
    if (shift.held == "to") {
      return [null, "to"];
    } else {
      // No choice, let it ride, but do a subsearch.
      return [null];
    }
  } else {
    // Just let the shift run. It can't help us satisfy a constraint directly.
    return [];
  }
}

function commit_shift(shift, constraint, state, state_reverse, shift_held, held_materials, i) {
  if (shift_held == "from") {
    // If we're picking this as a "from held" shift, turn it into a plain
    // shift from our target material.
    held_materials[i] = constraint.base;
  } else if (shift_held == "to") {
    // To be useful, we must be shifting to our chosen material.
    let target = constraint.target;
    if (state[target] && state[target] !== target) {
      // TODO we could pick other alternatives, and could pick this even if
      // target were unshifted.
      target = state_reverse[target].values().next();
    }
    held_materials[i] = target;
  } else if (shift.held) {
    // Ensure we record that we hold nothing here.
    held_materials[i] = null;
  }
}

class SolveState {
  constructor(constraints, held_materials) {
    this.constraints = new Array(...constraints);
    this.held_materials = new Array(...held_materials);
  }
}

class WorldState {
  best_length = null;
  shifts = null;
  constraints = null;
}

function explore(solver_state, world_state) {
  // Returns a list of new solver_state objects to explore.

  // Write some things down to save lookups later.
  let held_materials = solver_state.held_materials;
  let shifts = world_state.shifts;
  let constraints_list = solver_state.constraints;

  // TODO we should try different orderings.
  let constraint = solver_state.constraints.splice(0, 1)[0];

  let new_jobs = [];

  let min_shift;
  if (!constraint.min_shift) {
    min_shift = 0;
  } else {
    min_shift = constraint.min_shift;
  }
  let max_shift;
  if (!constraint.max_shift) {
    max_shift = shifts.length - 1;
  } else {
    max_shift = constraint.max_shift;
  }
  if (world_state.best_length && max_shift > world_state.best_length) {
    max_shift = world_state.best_length;
  }

  let state = {};
  let state_reverse = {};
  let can_skip = false;
  for(var i = 0; i <= max_shift; i++) {
    var shift = shifts[i];
    if (held_materials[i] === undefined) {
      var shift_from_helds = get_shift_from_helds(shift, constraint, state_reverse);

      for(let shift_held of shift_from_helds) {
        commit_shift(shift, constraint, state, state_reverse, shift_held, held_materials, i);
        
        if (constraint.stain) {
          // Add a new constraint to satisfy the secondary constraint.
          let stain_constraint = {
            "base": constraint.target,
            "target": constraint.stain,
            "min_shift": i + 1,
            "max_shift": shifts.length - 1,
          }
          constraints_list.splice(0, 0, stain_constraint);
        }
        let shift_to = shift.target;
        //console.log(i, shift_held, held_materials);
        if (shift_held == "to" && held_materials[i]) {
          shift_to = held_materials[i];
        }
        shift_to = state[shift_to] || shift_to;
        if (shift_to != constraint.target) {
          // This shift might satisfy our constraint if something earlier were to have prepped our shift.
          // It's actually OK for our source material to have been shifted; we
          // can just hold the (transformed) material.
          var new_constraint = {
            "base": shift.target,
            "target": constraint.target,
            "min_shift": 0,
            "max_shift": i - 1,
          };
          constraints_list.splice(0, 0, new_constraint);
        } else {
        }
        // BUG-1 we need to make sure we don't go and ruin a precondition a
        // previous constraint needed in a shift we've not yet reached.
        new_jobs.push(new SolveState(constraints_list, held_materials));
        // Fix
        if (shift_to != constraint.target) {
          constraints_list.splice(0, 1);
        }
        if (constraint.stain) {
          constraints_list.splice(0, 1);
        }
        held_materials[i] = undefined;
      }
    }

    // Run the shift with our choice of held materials.
    // We don't test this. We don't need to consider any "from" material other
    // than a sacrifice.
    // If we held a list of "forced" shifts, we could understand which
    // materials were rescuable.
    let base_materials = shift.base;
    let target_material = shift.target;
    if (shift.held && held_materials[i]) {
      if (shift.held == "to") {
        target_material = held_materials[i];
      } else {
        base_materials = [held_materials[i]];
      }
    }
    if (state[target_material]) {
      target_material = state[target_material];
    }
    let shifting_away = false;
    for (let base of base_materials) {
      if (base == constraint.target) {
        shifting_away = true;
      }
    }
    if (shifting_away) {
      base_materials = [];
    }
    /*if (shift.held == "from" && held_materials[i] === undefined) {
      if (shifting_away && target_material !== constraint.target && state_reverse[constraint.target] === undefined) {
        // We're going to delete it! Do something else!
        //held_materials[i] = "SACRIFICE" + i;
        base_materials = ["SACRIFICE" + i];
        console.log("Sac");
      } else {
        console.log("Cannot sac");
      }
    }*/
    for (let base of base_materials) {
      let old_shift = state[base];
      if (old_shift) {
        state_reverse[old_shift].delete(base);
        if (state_reverse[old_shift].size == 0) {
          state_reverse[old_shift] = undefined;
        }
      }
      state[base] = target_material;
      if (!state_reverse[target_material]) {
        state_reverse[target_material] = new Set();
      }
      state_reverse[target_material].add(base);
    }
    if (state[constraint.target] && state[constraint.target] != constraint.target && state_reverse[constraint.target] === undefined) {
      // Oh no! This deleted our target material! The constraint cannot be
      // satisfied past this point.
      console.log("Ooops");
      return new_jobs;
    }
  }
  // Can skip this as we're not trying different orderings.
  //constraints_list.splice(0, 0, constraint);
  return new_jobs;
}

let full_constraints_list = [
  {
    "base": "magic_liquid_polymorph",
    "target": "magic_liquid_random_polymorph",
    //"stain": "sand",
    //"stain": "oil",
    // min_shift
    // max_shift
  },
  {
    "base": "magic_liquid_random_polymorph",
    "target": "magic_liquid_unstable_polymorph",
    //"stain": "oil",
    // min_shift
    // max_shift
  },

  {
    "base": "magic_liquid_unstable_polymorph",
    "target": "magic_liquid_polymorph",
},
  {
    "base": "gold",
    "target": "diamond",
},
  /*{
    "from": "lava",
    "to": "oil",
  },*/
];

// shift, shift, NG, NG, shift, NG, shift, ...
console.log("Constraints:", full_constraints_list);
var seed = 224362081;
var world_state = new WorldState();
world_state.constraints = full_constraints_list;
//world_state.best_length = 6;
let total = 0;
let max_queue = 0;
for(let ng=0; ng<28; ng++) {
  console.log("Searching seed", seed, "+", ng);
  let shifts = load_shifts_for_seed(seed + ng);
  let shifts2 = load_shifts_for_seed(seed + ng + 1);
  for(let shift_nr=0; shift_nr<20 && (!world_state.best_length || shift_nr<world_state.best_length); shift_nr++) {
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
    world_state.shifts = combined_shifts;
    let jobs = [new SolveState(full_constraints_list, [])];
    while(jobs.length > 0) {
      let job = jobs.pop();
      total ++;
      if (jobs.length > max_queue) {
        max_queue = jobs.length;
      }
      //console.log("Testing", job.held_materials);
      let ret = check_solved(job, world_state);
      if (ret) {
        if (world_state.best_length === null || ret.length < world_state.best_length) {
          world_state.best_length = ret.length;
        }
          print_solution(job.held_materials, ret.state, combined_shifts, ret.length);
        console.log("Total jobs", total, max_queue);
      }
      if (job.constraints.length == 0) {
        continue;
      }
      //console.log("Running", job.constraints.length, job.held_materials, job.constraints);
      let new_jobs = explore(job, world_state);
      //console.log("Adding", new_jobs.length, "to", jobs.length);
      for (let i=new_jobs.length - 1; i>=0; i--) {
        // Append backwards to try to get shortest first.
      /*if (new_jobs[i].held_materials[4] !== "magic_liquid_random_polymorph") {
        continue;
      }
      if (new_jobs[i].held_materials[0] !== undefined && new_jobs[i].held_materials[0] !== "magic_liquid_unstable_polymorph") {
        continue;
      }
      if (new_jobs[i].held_materials[1] !== undefined && new_jobs[i].held_materials[1] !== "magic_liquid_polymorph") {
        continue;
      }
      if (new_jobs[i].held_materials[2] !== undefined && new_jobs[i].held_materials[2] !== "magic_liquid_random_polymorph") {
        continue;
      }
      if (new_jobs[i].held_materials[3] !== undefined && new_jobs[i].held_materials[3] !== "magic_liquid_polymorph") {
        continue;
      }
      if (new_jobs[i].held_materials[5] !== undefined) {
        continue;
      }*/
        //console.log(new_jobs[i].held_materials);
        jobs.push(new_jobs[i]);
      }
    }
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
