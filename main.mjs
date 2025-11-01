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
 * em++ fungal.cpp --std=c++20 -lembind -o noita_fungal.js -s EXPORT_ES6=1 -s MODULARIZE=1
 * Now grab noita_fungal.{wasm,js}.
 * This generates about 400KB of crap, but does give us our fungal shifts.
 */

//import * as noita_fungal from "./noita_fungal.js";
//const { PickForSeed } = noita_fungal;
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
    "from_held": shift_c.flaskFrom,
    "to_held": shift_c.flaskTo,
    // TODO greed (gold_to_x, grass_to_x)
  };
  console.log(shift);
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
  console.log(`After shifting ${shift["from"][0]} into ${shift["to"]}:`);
  print_state(state, "  ");
  console.log("");
});
state = {};
let full_constraints_list = [
  {
    "from": "diamond",
    "to": "healthium",
    // min_shift
    // max_shift
  },
  {
    "from": "magic_liquid_charm",
    "to": "healthium",
  },
];

var shortest = {
  "count": 21,
};

function clever_search(constraints_list, shifts, held_materials) {
  //console.log(`clever_search(${constraints_list.map(x=>"{"+Object.entries(x)+"}")}, shifts, ${held_materials})`);
  var state = {};
  if (constraints_list.length == 0) {
    for (var i = 0; i < shifts.length; i++) {
      var shift = shifts[i];
      for (var shift_from of shift.from) {
        state[shift_from] = state[shift.to] || shift.to;
      }
      var correct = true;
      for (var constraint of full_constraints_list) {
        if ((state[constraint.from] || constraint.from) != constraint.to) {
          correct = false;
        }
      }
      if (correct) {
        //console.log(`FOUND: ${held_materials}`);
        //console.log(state);
        if (shortest.count > i) {
          var helds = new Array(...held_materials);
          helds.sort((x, y) => x[0] - y[0]);
          console.log(`SHORTEST: shifts=${i} helds=${helds}`);
          //console.log(shift);
          //console.log(state);
          print_state2(state, "  ");
          shortest.count = i;
          shortest.held = held_materials;
        }
        return;
      }
    }
    //console.log(`FALSE: ${held_materials} ${Object.entries(state)}`);
    return;
  }
  var constraint = constraints_list.splice(0, 1)[0];
  //for(var i in shifts) console.log(i);
  //for(var i of shifts) console.log(i);
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
  for(var i = 0; i <= max_shift; i++) {
    var shift = shifts[i];

    if (i < min_shift) continue;
    var use_helds = [false];
    var old_from_held = undefined;
    if (shift.from_held) {
      old_from_held = shift.from;
      shift.from_held = false;
      if (shift.from.includes(constraint.from)) {
        // If shift.from.includes(constraint.from) then we may be able to use a
        // non-held shift to satisfy another constraint. We should try both
        // with and without this modification.
        use_helds = [false, true];
      } else {
        // Otherwise, to use this to satisfy our constraint, we _must_ hold the
        // material.
        use_helds = [true];
      }
    }
    for(var use_held of use_helds) {
      if (use_held) {
        shift.from = [constraint.from];
      }
      if (shift.from.includes(constraint.from)) {
        // This shift could be useful to satisfy our constraint.
        //console.log("Viable", constraint, i, shift, use_held);
        var shift_to = state[shift.to] || shift.to;
        if (shift_to == constraint.to || shift.to_held) {
          // This shift can fully satisfy our constraint.
          var to_held = undefined;
          if (shift.to_held) {
            // As .to is a single material, we _must_ fix this.
            to_held = shift.to;
            shift.to = constraint.to;
            shift.to_held = false;
          }
          if (to_held === constraint.to) {
            // We may choose to hold nothing here, but mustn't hold anything "wrong".
            held_materials.push([i, [undefined, constraint.to]]);
          } else if (to_held) {
            held_materials.push([i, constraint.to]);
          }
          // BUG-1 we need to make sure we don't go and ruin a precondition a
          // previous constraint needed in a shift we've not yet reached.
          clever_search(constraints_list, shifts, held_materials);
          if (to_held) {
            held_materials.pop();
            shift.to_held = true;
            shift.to = to_held;
          }
        }

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
          if (use_held) {
            held_materials.push([i, constraint.from]);
          } else if (old_from_held) {
            // We must hold nothing.
            held_materials.push([i, undefined]);
          }
          // BUG-1 we need to make sure we don't go and ruin a precondition a
          // previous constraint needed in a shift we've not yet reached.
          clever_search(constraints_list, shifts, held_materials);
          if (use_held) {
            held_materials.pop();
          }
          // Fix
          constraints_list.splice(0, 1);
        }
      }
    }
    if (old_from_held) {
      shift.from_held = true;
      shift.from = old_from_held;
    }
    if (!shift.from_held) {
      // Without from_held, we must shift this material to something. With it,
      // we'll assume something irrelevant was held.
      state[shift.from] = state[shift.to] || shift.to;
    }
  }
  constraints_list.splice(0, 0, constraint);
}
console.log("Constraints:", full_constraints_list);
clever_search(new Array(...full_constraints_list), shifts, []);

/*
let constraints_from = new Set(Object.keys(constraints));
let constraints_to = new Set(Object.values(constraints));
let used_shifts = [];
let best_shifts = undefined;
let loops = 0;
function recurse_search(state, shifts) {
  if (best_shifts && used_shifts.length >= best_shifts.length) {
    return;
  }
  let satisfied = true;
  Object.entries(constraints).forEach(function(constraint) {
    if (state[constraint[0]] != constraint[1]) {
      satisfied = false;
    }
  });
  if (satisfied) {
    console.log("Found sequence:", used_shifts)
    print_state(state, "  ");
    best_shifts = new Array(...used_shifts);
    return;
  }
  loops += 1;
  if (shifts.length == 0) {
    return;
  }
  let shift = shifts[0];
  let remaining_shifts = shifts.slice(1);
  if (shift["to_held"]) {
    constraints_to.forEach(function(to_material) {
      let new_state = state;
      shift["from"].forEach(function(from){
        new_state = run_shift(new_state, from, to_material);
      });
      used_shifts.push(to_material);
      recurse_search(new_state, remaining_shifts);
      used_shifts.pop()
    });
  } else if (shift["from_held"]) {
    constraints_from.forEach(function(from_material) {
      let new_state = state;
      let abort = false;
      shift["to"].forEach(function(to){
        new_state = run_shift(new_state, from_material, to)
        if (constraints_to.has(from_material) && new_state[from_material] != from_material) {
          abort = true;
        }
      });
      if (abort) return;
      used_shifts.push(from_material);
      recurse_search(new_state, remaining_shifts);
      used_shifts.pop();
    });
  }
  let plain_state = state;
  shift["from"].forEach(function(from){
    plain_state = run_shift(plain_state, from, shift["to"][0]);
  });
  used_shifts.push(undefined);
  recurse_search(plain_state, remaining_shifts);
  used_shifts.pop()
}
recurse_search(state, shifts);
console.log(loops)
*/


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
