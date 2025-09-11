let state = {};
let materials = [
	"Worm Blood",
	"Water",
	"Pheromone",
	"Poison",
	"Polymorphine",
	"Ambrosia",
	"Lava",
];
let shifts = [
  ["Pheromone", "Poison"],
  ["Water", "Pheromone"],
  ["Pheromone", "Ambrosia"],
  ["Poison", "Polymorphine"],
  ["Polymorphine", "Lava"],
  ["Worm Blood", "Water"],
];
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

let test_data = "1	\nFungus Blood\nWeird Fungus\nFungal Soil\n	→	\n?\nHeld Material\nGold\n→\nSilver\nDivine Ground\n→\nGrass\nSima\n	\n2	\nFungus Blood\nWeird Fungus\nFungal Soil\n	→	\n?\nHeld Material\nGold\n→\nToxic Meat\nDivine Ground\n→\nGrass\nLava\n	\n3	\n?\nHeld Material\nWater\nBrine\nChilly Water\n	→	\nWeird Fungus\n	\n4	\n?\nHeld Material\nFlammable Gas\nPoison Gas\nFungal Gas\nToxic Gas\n	→	\nVomit\n	\n5	\nAcid\n	→	\n?\nHeld Material\nGold\n→\nSilver\nDivine Ground\n→\nGrass\nFungus Blood\n	\n6	\n?\nHeld Material\nToxic Sludge\nPoison\nOminous Liquid\n	→	\nAcid\n	\n7	\nOil\nSwamp\nPeat\n	→	\n?\nHeld Material\nGold\n→\nSilver\nDivine Ground\n→\nGrass\nWorm Blood\n	\n8	\nFungus Blood\nWeird Fungus\nFungal Soil\n	→	\nWhiskey\n	\n9	\nBlood\n	→	\nFlummoxium\n	\n10	\n?\nHeld Material\nSnow\n	→	\nRock\n	\n11	\nSilver\nBrass\nCopper\n	→	\n?\nHeld Material\nGold\n→\nExcrement\nDivine Ground\n→\nGrass\nFungus Blood\n	\n12	\nOil\nSwamp\nPeat\n	→	\nWater\n	\n13	\n?\nHeld Material\nWater\nBrine\nChilly Water\n	→	\nToxic Rock\n	\n14	\n?\nHeld Material\nSnow\n	→	\nFungus Blood\n	\n15	\n?\nHeld Material\nToxic Sludge\nPoison\nOminous Liquid\n	→	\nWhiskey\n	\n16	\nBlood\n	→	\n?\nHeld Material\nGold\n→\nExcrement\nDivine Ground\n→\nGrass\nOil\n	\n17	\nLava\n	→	\n?\nHeld Material\nGold\n→\nBrass\nDivine Ground\n→\nGrass\nFungus Blood\n	\n18	\nOil\nSwamp\nPeat\n	→	\nSand\n	\n19	\nFlammable Gas\nPoison Gas\nFungal Gas\nToxic Gas\n	→	\n?\nHeld Material\nGold\n→\nPea Soup\nDivine Ground\n→\nGrass\nToxic Rock\n	\n20	\n?\nHeld Material\nSnow\n	→	\nSima ";
test_data = test_data.split("\n");
let seed_shifts = [];
let parse_state = {"state": 0};
shifts = [];
state = {};
String.prototype.strip = function (){
  return this.replace(/[ \t]*$|^[ \t]/g, "");
}
for(let i=0; i<test_data.length; i++) {
  let line = test_data[i];
  if (parse_state["state"] == 0 && line[0] >= '0' && line[1] <= '9') {
    parse_state["shift"] = {};
    parse_state["state"] = 1;
  } else if (parse_state["state"] == 1) {
    if (line == "?") {
      if (test_data[i+1] != "Held Material") {
        console.log("Unexpected held line", test_data[i]);
      }
      i += 2;
      parse_state["shift"]["from_held"] = true;
    }
    parse_state["shift"]["from"] = [test_data[i]];
    i += 1;
    while (test_data[i] != "	→	" && test_data[i] !== undefined) {
      parse_state["shift"]["from"].push(test_data[i]);
      i += 1;
    }
    parse_state["state"] = 2;
  } else if (parse_state["state"] == 2) {
    if (line == "?") {
      if (test_data[i+1] != "Held Material") {
        console.log("Unexpected held line", test_data[i]);
      }
      i += 8;
      parse_state["shift"]["to_held"] = true;
    }
    parse_state["shift"]["to"] = [test_data[i].strip()];
    i += 1;
    while (test_data[i] != "	" && test_data[i] !== undefined) {
      parse_state["shift"]["to"].push(test_data[i]);
      i += 1;
    }
    parse_state["state"] = 0;
    if (parse_state["shift"]) {
      if (parse_state.shift.to.length != 1) {
        console.log("Ouch");
      }
      parse_state.shift.i = shifts.length;
      parse_state.shift.to = parse_state.shift.to[0];
      shifts.push(parse_state["shift"]);
      //console.log(parse_state["shift"]);
    }
  }
}
// TODO : Check that shifts are not overwritten before use
//shifts[1].to_held = false;
//shifts[1].from = [ "Fake" ];
//console.log(shifts);
shifts.forEach(function(shift){
  shift["from"].forEach(function (from) {
    state = run_shift(state, from, shift["to"]);
  });
  //console.log(`After shifting ${shift["from"][0]} into ${shift["to"][0]}:`);
  //print_state(state, "  ");
  //console.log("");
});
state = {};
let full_constraints_list = [
  {
    "from": "Diamond",
    "to": "Healthium",
    // min_shift
    // max_shift
  },
  {
    "from": "Flammable Gas",
    "to": "Healthium",
  },
  {
    "from": "Urine",
    "to": "Void Liquid",
  },
  {
    "from": "Water",
    "to": "Sima",
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
