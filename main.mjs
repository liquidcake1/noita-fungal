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

import { getFungalShifts } from "./fungal.mjs";
import { maxShifts } from "./fungal_materials.mjs";

function print_helds(held_materials, shifts, after) {
  let state = {};
  for(let i=0; i<after; i++) {
    let hold = held_materials[i];
    let shift_from = shifts[i].fromMaterials;
    let shift_to = shifts[i].toMaterial;
    if (shifts[i].useHeld) {
      if (!hold) {
        if (hold === null) {
          console.log(`  At the ${i+1}th shift, you may hold nothing.`);
        } else {
          console.log(`  At the ${i+1}th shift, you MUST hold nothing.`);
        }
      } else {
        if (shifts[i].useHeld == "to") {
          shift_to = hold;
        } else if (shifts[i].useHeld == "from") {
          shift_from = [hold];
        }
        console.log(`  At the ${i+1}th shift, hold ${hold} (as a "${shifts[i].useHeld}" material)`);
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
    let shift_map = shifts[i];
    let shift = held_materials[i] ? shift_map[held_materials[i]] || shift_map.OTHER : shift_map.NOTHING;
    let base_materials = shift.fromMaterials;
    let target_material = shift.toMaterial;
    if (shift.useHeld && held_materials[i]) {
      if (shift.useHeld == "to") {
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

function get_shift_from_helds(shift, constraint, reverse_state, possible_states) {
  // We want to shift something from contraint.from.
  if (shift === undefined) {
    return [];
  } else if (shift.useHeld == "from") {
    //let possible_targets = possible_states[shift.toMaterial] || new Set([shift.toMaterial]);
    /*if (!possible_targets.has("ARBITRARY") && !possible_targets.has(constraint.target)) {
      return [];
    }*/
    if (shift.fromMaterials.includes(constraint.base)) {
      // If shift.from.includes(constraint.from) then we may be able to use a
      // non-held shift to satisfy another constraint. We should try both
      // with and without this modification.
      return [null, "from"];
    } else {
      // Otherwise, to use this to satisfy our constraint, we _must_ hold the
      // material.
      return ["from"];
    }
  } else if (shift.fromMaterials.includes(constraint.base)) {
    // We can shift to "something". Either it's what we want, or we can try to
    // do something else earlier in the chain.
    if (shift.useHeld == "to") {
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
  } else if (shift.useHeld) {
    // Ensure we record that we hold nothing here.
    held_materials[i] = null;
  }
}

class SolveState {
  constructor(constraints, held_materials) {
    this.constraints = new Array(...constraints);
    this.held_materials = new Array(...held_materials);
  }
  str() {
    return JSON.stringify([this.constraints, this.held_materials]);
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
  let possible_states = {};
  let can_skip = false;
  for(var i = 0; i <= max_shift; i++) {
    var shift_map = shifts[i];
    if (held_materials[i] === undefined) {
      var shift_from_helds = get_shift_from_helds(shift_map.OTHER, constraint, state_reverse, possible_states);

      for(let shift_held of shift_from_helds) {
        let shift = shift_map[shift_held] || shift_map.OTHER;
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
        let shift_to = shift.toMaterial;
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
            "base": shift.toMaterial,
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

    let shift = held_materials[i] ? shift_map[held_materials[i]] || shift_map.OTHER : shift_map.NOTHING;

    // Run the shift with our choice of held materials.
    // We don't test this. We don't need to consider any "from" material other
    // than a sacrifice.
    // If we held a list of "forced" shifts, we could understand which
    // materials were rescuable.
    let base_materials = shift.fromMaterials;
    let target_material = shift.toMaterial;
    if (shift.useHeld && held_materials[i]) {
      if (shift.useHeld == "to") {
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
    /*if (shift.useHeld == "from" && held_materials[i] === undefined) {
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
    if (false) {
      // This code DEFINITELY breaks the algorithm; we find less good optimal solutions for
      // #1296487564/magic_liquid_polymorph;water_salt/cheese_static;blood_fungi
      let possible_bases = new Array(...shift.fromMaterials);
      if (shift.useHeld == "from") {
        possible_bases.push("ARBITRARY");
      }
      let possible_targets = [shift.toMaterial];
      if (shift.useHeld == "to") {
        possible_targets.push("ARBITRARY");
      }
      let shifted_possible_targets = new Set();
      for(let possible_target of possible_targets) {
        if (possible_states[possible_target]) {
          for (let shifted_possible_target of possible_states[possible_target]) {
            shifted_possible_targets.add(possible_states[possible_target]);
          }
        } else {
          shifted_possible_targets.add(possible_target);
        }
      }
      for(let possible_base of possible_bases) {
        possible_states[possible_base] ||= new Set([possible_base]);
        for(let shifted_possible_target of shifted_possible_targets) {
          possible_states[possible_base].add(shifted_possible_target);
        }
      }
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

export function init(new_seed, new_constraints, new_mode) {
  let world_state = new WorldState();
  let shifts = world_state.all_shifts = [];
  for(let ng=0; ng<=28; ng++) {
    shifts.push(getFungalShifts(new_seed, ng, new_mode));
  }
  world_state.constraints = new_constraints;
  let state = {
    "seed": new_seed,
    "mode": new_mode,
    "next_shift_nr": maxShifts[new_mode],
    "next_base_ng": 0,
    "shift_nr": maxShifts[new_mode],
    "base_ng": 0,
    "jobs": [],
    "seen_jobs": new Set(),
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
    queue_state.seen_jobs.clear();
    if (queue_state.next_base_ng > 27) {
      queue_state.finished = true;
      return queue_state;
    }
    let shift_nr = queue_state.next_shift_nr;
    let ng = queue_state.next_base_ng;
    queue_state.shift_nr = shift_nr;
    queue_state.base_ng = ng;
    if (shift_nr == 1) {
      queue_state.next_shift_nr = world_state.all_shifts[0].length;
      queue_state.next_base_ng++;
    } else {
      queue_state.next_shift_nr--;
    }
    world_state.shifts = new Array(...world_state.all_shifts[ng].slice(0, shift_nr), ...world_state.all_shifts[ng+1].slice(shift_nr));
    let froms = 0;
    let tos = 0;
    for(let shift of world_state.shifts) {
      if(shift.useHeld == "from") {
        froms += 1;
      } else if (shift.useHeld == "to") {
        tos += 1;
      }
    }
    queue_state.froms = froms;
    queue_state.tos = tos;
    queue_state.current_jobs = 0;
    queue_state.jobs = [new SolveState(world_state.constraints, [])];
    queue_state.seen_jobs.add(queue_state.jobs[0].str())
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
      const key = new_jobs[i].str();
      if (!queue_state.seen_jobs.has(key)) {
        queue_state.seen_jobs.add(key);
        queue_state.jobs.push(new_jobs[i]);
      }
    }
  }
}
