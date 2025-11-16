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

import * as noita_fungal_import from "./noita_fungal.mjs";
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
  /*{
    "from": "lava",
    "to": "oil",
  },*/
];

export function init(new_seed, new_constraints) {
  let world_state = new WorldState();
  let shifts = world_state.all_shifts = [];
  for(let ng=0; ng<=28; ng++) {
    shifts.push(load_shifts_for_seed(new_seed + ng));
  }
  world_state.constraints = new_constraints;
  let state = {
    "seed": new_seed,
    "next_shift_nr": 20,
    "next_base_ng": 0,
    "shift_nr": 20,
    "base_ng": 0,
    "jobs": [],
    "total_jobs": 0,
    "failed_checks": 0,
    "world_state": world_state,
    "solutions": [],
    "finished": false,
  }
  return state;
}

export function run_queue_step(queue_state) {
  let world_state = queue_state.world_state;
  if (queue_state.jobs.length == 0) {
    if (queue_state.next_base_ng > 27) {
      queue_state.finished = true;
      return queue_state;
    }
    let shift_nr = queue_state.next_shift_nr;
    let ng = queue_state.next_base_ng;
    queue_state.shift_nr = shift_nr;
    queue_state.base_ng = ng;
    if (shift_nr == 1) {
      queue_state.next_shift_nr = 20;
      queue_state.next_base_ng++;
    } else {
      queue_state.next_shift_nr--;
    }
    world_state.shifts = new Array(...world_state.all_shifts[ng].slice(0, shift_nr), ...world_state.all_shifts[ng+1].slice(shift_nr));
    let froms = 0;
    let tos = 0;
    for(let shift of world_state.shifts) {
      if(shift.held == "from") {
        froms += 1;
      } else if (shift.held == "to") {
        tos += 1;
      }
    }
    queue_state.froms = froms;
    queue_state.tos = tos;
    queue_state.current_jobs = 0;
    queue_state.jobs = [new SolveState(world_state.constraints, [])];
  }
  queue_state.total_jobs++;
  let job = queue_state.jobs.pop();
  if (job.constraints.length == 0) {
    let ret = check_solved(job, world_state);
    if (ret) {
      if (world_state.best_length === null || ret.length < world_state.best_length) {
        world_state.best_length = ret.length;
      }
      queue_state.solutions.push({
        "state": ret.state,
        "base_ng": queue_state.base_ng,
        "shift_nr": queue_state.shift_nr,
        "length": ret.length,
        "shifts": world_state.shifts,
        "held_materials": job.held_materials,
      });
    } else {
      queue_state.failed_checks++;
    }
  } else {
    let new_jobs = explore(job, world_state);
    for (let i=new_jobs.length - 1; i>=0; i--) {
      queue_state.jobs.push(new_jobs[i]);
    }
  }
}
