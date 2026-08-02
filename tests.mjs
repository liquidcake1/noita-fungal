import * as shifts from "./tests/shifts.mjs";
for(let test of Object.entries(shifts)) {
  test[1]();
}
import * as search from "./tests/search.mjs";
for(let test of Object.entries(search)) {
  test[1]();
}
