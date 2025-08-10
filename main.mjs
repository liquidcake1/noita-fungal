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
  });
}
shifts.forEach(function(shift){
  state = run_shift(state, shift[0], shift[1]);
  console.log(`After shifting ${shift[0]} into ${shift[1]}:`);
  print_state(state, "  ");
  console.log("");
});
