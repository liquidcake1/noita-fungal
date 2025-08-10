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
shifts.forEach(function(shift){
  state = run_shift(state, shift[0], shift[1]);
  console.log(`After shifting ${shift[0]} into ${shift[1]}:`);
  print_state(state, "  ");
  console.log("");
});

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
      shifts.push(parse_state["shift"]);
      console.log(parse_state["shift"]);
    }
  }
}
console.log(shifts);
shifts.forEach(function(shift){
  shift["from"].forEach(function (from) {
    state = run_shift(state, from, shift["to"]);
  });
  console.log(`After shifting ${shift["from"][0]} into ${shift["to"][0]}:`);
  print_state(state, "  ");
  console.log("");
});
state = {};
let constraints = {"Diamond": "Healthium", "Flammable Gas": "Healthium"};
let constraints_from = new Set(Object.keys(constraints));
let constraints_to = new Set(Object.values(constraints));
let loops = 0;
function recurse_search(state, shifts) {
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
      recurse_search(new_state, remaining_shifts);
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
      recurse_search(new_state, remaining_shifts);
    });
  }
  let plain_state = state;
  shift["from"].forEach(function(from){
    plain_state = run_shift(plain_state, from, shift["to"][0]);
  });
  recurse_search(plain_state, remaining_shifts);
}
recurse_search(state, shifts);
console.log(loops)
