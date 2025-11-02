let state = {};
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
let test_data_raw = noita_fungal.PickForSeed(2, 20);
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
  console.log(shift);
  // Store the original state so that we can mess with it later.
  shift.original = {"held": shift.held, "from": shift.from, "to": shift.to};
  shifts.push(shift);
}
// TODO : Check that shifts are not overwritten before use
//shifts[1].to_held = false;
//shifts[1].from = [ "Fake" ];
//console.log(shifts);
shifts.forEach(function(shift){
  shift["from"].forEach(function (from) {
    state = run_shift(state, from, shift["to"]);
  });
  //console.log(`After shifting ${shift["from"][0]} into ${shift["to"]}:`);
  //print_state(state, "  ");
  console.log("");
});
state = {};
let full_constraints_list = [
  {
    "from": "acid",
    "to": "oil",
    // min_shift
    // max_shift
  },
  {
    "from": "oil",
    "to": "acid",
  },
];

var shortest = {
  "count": 21,
};

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
      if ((state[constraint.from] || constraint.from) != constraint.to) {
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

function clever_search(constraints_list, shifts, held_materials) {
  //console.log(`clever_search(${constraints_list.map(x=>"{"+Object.entries(x)+"}")}, shifts, ${held_materials})`);
  if (constraints_list.length == 0) {
    let ret = check_solved(shifts, constraints_list, shortest.count);
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
  var state = {};
  for(var i = min_shift; i <= max_shift; i++) {
    var shift = shifts[i];

    var shift_from_helds = get_shift_from_helds(shift, constraint);

    for(let shift_held of shift_from_helds) {
      commit_shift(shift, constraint, shift_held, held_materials, i);
      // This shift could be useful to satisfy our constraint.
      //console.log("Viable", constraint, i, shift, shift_from_held);
      let shift_to = state[shift.to] || shift.to;
      if (shift_to == constraint.to) {
        // This shift will fully satisfy our constraint.
        // BUG-1 we need to make sure we don't go and ruin a precondition a
        // previous constraint needed in a shift we've not yet reached.
        clever_search(constraints_list, shifts, held_materials);
      } else {
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
        // BUG-1 we need to make sure we don't go and ruin a precondition a
        // previous constraint needed in a shift we've not yet reached.
        clever_search(constraints_list, shifts, held_materials);
        // Fix
        constraints_list.splice(0, 1);
      }
      uncommit_shift(shift, shift_held, held_materials, i);
    }
    if (shift.held == "from") {
      // Without from_held, we must shift this material to something. With it,
      // we'll assume something irrelevant was held.
      state[shift.from] = state[shift.to] || shift.to;
    }
  }
  constraints_list.splice(0, 0, constraint);
}
let held_materials = [];
held_materials[19] = undefined;
console.log("Constraints:", full_constraints_list);
clever_search(new Array(...full_constraints_list), shifts, held_materials);

// OK, three constraints will take until the heat death of the universe due to high branch factor.
//
// For each constraint A -> B:
//   * Find a shift S where A could be the source.
//   * Find a sequence of shifts which make the target of S into B.
//   * If no requirement of second order, stop.
//   * If second order equals first (ie. unbroken), ensure no later shift shifts B.
//   * If second order has other requirement (ie. broken), ensure some later shift shifts B.
// Just do a backtracking search through possible candidates.
//
