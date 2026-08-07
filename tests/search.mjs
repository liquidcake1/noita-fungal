import { init, run_queue_step } from "../main.mjs";
 
import { strict as assert } from 'node:assert';

export function simple() {
  let state = init(12, [{"base": "something", "target": "something_else"}]);
  while(state.base_ng == 0 && state.shift_nr == 20) {
    run_queue_step(state);
  }
  assert.equal(state.world_state.best_length, 8);
  let found = 0;
  for(let sol of state.solutions) {
    if (sol.length == 8) {
      assert.deepEqual(
        sol.held_materials,
        [undefined, undefined, undefined, undefined, undefined, "something_else", undefined, "something"]
      );
      found += 1;
    }
  }
  assert(found > 0);
}

export function no_daft_infinite_loop() {
  // This specific input (and probably many others) would cause the search to
  // balloon up to "all of the RAM", which literally killed my PC.
  let state = init(970230895, [{"base": "blood", "target": "magic_liquid_hp_generation"}]);
  let loops = 0;
  while(!state.finished && loops < 10000) {
    run_queue_step(state);
  }
  assert(state.finished);
  let found = 0;
  for(let sol of state.solutions) {
    if (sol.length == 8) {
      found += 1;
    }
  }
  assert(found > 0);
}
