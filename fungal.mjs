// From Lymm's Telescope, https://github.com/Lymm37/noita-telescope/blob/main/js/fungal_shifts.js
import { NollaPrng } from './nolla_prng.mjs';

// Data Tables
const materialsFrom = [
  { probability: 1.0, materials: ["water", "water_static", "water_salt", "water_ice"], nameMaterial: "water" },
  { probability: 1.0, materials: ["lava"], nameMaterial: "lava" },
  { probability: 1.0, materials: ["radioactive_liquid", "poison", "material_darkness"], nameMaterial: "radioactive_liquid" },
  { probability: 1.0, materials: ["oil", "swamp", "peat"], nameMaterial: "oil" },
  { probability: 1.0, materials: ["blood"], nameMaterial: "blood" },
  { probability: 1.0, materials: ["blood_fungi", "fungi", "fungisoil"], nameMaterial: "fungi" },
  { probability: 1.0, materials: ["blood_cold", "blood_worm"], nameMaterial: "blood_cold" },
  { probability: 1.0, materials: ["acid"], nameMaterial: "acid" },
  { probability: 0.4, materials: ["acid_gas", "acid_gas_static", "poison_gas", "fungal_gas", "radioactive_gas", "radioactive_gas_static"], nameMaterial: "acid_gas" },
  { probability: 0.4, materials: ["magic_liquid_polymorph", "magic_liquid_unstable_polymorph"], nameMaterial: "magic_liquid_polymorph" },
  { probability: 0.4, materials: ["magic_liquid_berserk", "magic_liquid_charm", "magic_liquid_invisibility"], nameMaterial: "magic_liquid_berserk" },
  { probability: 0.6, materials: ["diamond"], nameMaterial: "diamond" },
  { probability: 0.6, materials: ["silver", "brass", "copper"], nameMaterial: "silver" },
  { probability: 0.2, materials: ["steam", "smoke"], nameMaterial: "steam" },
  { probability: 0.4, materials: ["sand"], nameMaterial: "sand" },
  { probability: 0.4, materials: ["snow_sticky"], nameMaterial: "snow_sticky" },
  { probability: 0.05, materials: ["rock_static"], nameMaterial: "rock_static" },
  { probability: 0.0003, materials: ["gold", "gold_box2d"], nameMaterial: "gold" }
];

const materialsTo = [
  { probability: 1.0, material: "water" },
  { probability: 1.0, material: "lava" },
  { probability: 1.0, material: "radioactive_liquid" },
  { probability: 1.0, material: "oil" },
  { probability: 1.0, material: "blood" },
  { probability: 1.0, material: "blood_fungi" },
  { probability: 1.0, material: "acid" },
  { probability: 1.0, material: "water_swamp" },
  { probability: 1.0, material: "alcohol" },
  { probability: 1.0, material: "sima" },
  { probability: 1.0, material: "blood_worm" },
  { probability: 1.0, material: "poison" },
  { probability: 1.0, material: "vomit" },
  { probability: 1.0, material: "pea_soup" },
  { probability: 1.0, material: "fungi" },
  { probability: 0.8, material: "sand" },
  { probability: 0.8, material: "diamond" },
  { probability: 0.8, material: "silver" },
  { probability: 0.8, material: "steam" },
  { probability: 0.5, material: "rock_static" },
  { probability: 0.5, material: "gunpowder" },
  { probability: 0.5, material: "material_darkness" },
  { probability: 0.5, material: "material_confusion" },
  { probability: 0.2, material: "rock_static_radioactive" },
  { probability: 0.02, material: "magic_liquid_polymorph" },
  { probability: 0.02, material: "magic_liquid_random_polymorph" },
  { probability: 0.15, material: "magic_liquid_teleportation" },
  { probability: 0.10, material: "mimic_liquid" },
  { probability: 0.01, material: "urine" },
  { probability: 0.01, material: "poo" },
  { probability: 0.01, material: "void_liquid" },
  { probability: 0.01, material: "cheese_static" }
];

const greedyMaterials = [
  "brass", "silver", "radioactive_liquid", "pea_soup",
  "acid_gas", "poo", "mammi", "rotten_meat_radioactive", "vomit"
];

// Helper Functions
function pickRandomFromTableWeighted(ws, items, rndState) {
  let table = [];
  let weightSum = 0.0;

  for (const item of items) {
    let newWeightMax = weightSum + item.probability;
    table.push({ item: item, min: weightSum, max: newWeightMax });
    weightSum = newWeightMax;
  }

  let val = randomNextFloat(ws, 0.0, weightSum, rndState);
  for (const it of table) {
    if (val >= it.min && val <= it.max) {
      return it.item;
    }
  }
  return items[0].item;
}

function randomNextFloat(seed, a, b, rndState) {
  let rng = new NollaPrng(0);
  rng.SetRandomSeed(seed, rndState.x, rndState.y);
  let result = a + ((b - a) * rng.Next());
  rndState.y += 1;
  return result;
}

function randomNext(seed, a, b, rndState) {
  let rng = new NollaPrng(0);
  rng.SetRandomSeed(seed, rndState.x, rndState.y);
  let result = rng.Random(Math.round(a), Math.round(b));
  rndState.y += 1;
  return result;
}

export function getFungalShiftRetries(ws, shift_number, held) {
  let convertTries = 0;
  let interesting_materials = [];

  while (1) {
    let seed2 = 42345 + shift_number + (1000 * convertTries);
    let rndState = { x: 9123, y: seed2 };

    let fromItem = pickRandomFromTableWeighted(ws, materialsFrom, rndState);
    let toItem = pickRandomFromTableWeighted(ws, materialsTo, rndState);
    let useHeld = null;
    let greedChange = null;

    if (randomNext(ws, 1, 100, rndState) <= 75) {
      if (randomNext(ws, 1, 100, rndState) <= 50) {
        useHeld = "from";
      } else {
        const rareRoll = randomNext(ws, 1, 1000, rndState);
        if (rareRoll === 1) {
          // Only one of gold/grass happens depending on what you are holding, so they share an RNG state.
          useHeld = "to";
          greedChange = false;
        } else if (held == "gold") {
          const prng = new NollaPrng(0);
          prng.SetRandomSeed(ws, 89346, seed2);
          const greedyIndex = Math.floor(prng.Next() * greedyMaterials.length);
          toItem = {material: greedyMaterials[greedyIndex]};
          greedChange = true;
        } else if (held == "grass_holy") {
          toItem = {material: "grass"};
          greedChange = true;
        } else {
          interesting_materials.push("gold", "grass_holy");
          useHeld = "to";
        }
      }
    }

    let fromMaterials = fromItem.materials;
    let toMaterial = toItem.material;

    // If we're called to deal with a held material, replace the correct material.
    if (useHeld == "from" && held) {
      fromMaterials = [held];
    }
    if (useHeld == "to" && held) {
      toMaterial = held;
    }

    // State = toxic -> oil, lava -> toxic (oil), hold toxic ==> shift lava -> toxic (which does nothing at all).
    // State = toxic -> oil, lava -> oil, hold toxic ==> shift lava -> toxic (which does nothing as toxic is already oil).
    // State = toxic -> oil, lava -> oil, hold oil ==> shift lava -> oil (which does nothing at all)
    // Seed: 1263167642, hold oil then have two lava to held
    // So this check is not "does the shift do anything to the world?" but "does the shift, considered alone, do anything?".
    // TL;DR we don't need to care about the world state.

    let convertedAny = false;
    if (fromMaterials.length > 1) {
      // By definition if there are multiple, at least one differs.
      convertedAny = true;
    } else {
      convertedAny = fromMaterials[0] != toMaterial;
    }

    // There are three cases:
    // * Holding something does nothing.
    // * Holding something can force one or more retries.
    // * Holding something can prevent one or more retries.
    if (!useHeld) {
      // Certainly nothing interesting here with held materials.
    } else if (held && held != "FAKE_MATERIAL") {
      // Nothing useful to do here.
    } else {
      // If we did convert something, perhaps we can prevent that.
      // If we did not convert something, perhaps we can make that happen.
      if (useHeld == "to" && fromMaterials.length == 1) {
        interesting_materials.push(fromMaterials[0]);
      } else {
        interesting_materials.push(toMaterial);
      }
    }
    if (convertedAny || convertTries >= 19) {
      return {
        shift: {
          convertTries: convertTries,
          fromMaterials: fromItem.materials,
          greedChange: greedChange,
          toMaterial: toItem.material,
          useHeld: useHeld,
        },
        interesting_materials: interesting_materials,
      };
    }
    convertTries += 1;
  }
}

export function getFungalShift(ws, shift_number) {
  let data = getFungalShiftRetries(ws, shift_number);
  let ret = {
    "NOTHING": data.shift,
  };
  let interesting_materials = new Set(data.interesting_materials.values());
  let data_other = getFungalShiftRetries(ws, shift_number, "FAKE_MATERIAL");
  if (data_other.shift.convertTries != data.shift.convertTries || data_other.shift.useHeld) {
    ret["OTHER"] = data_other.shift;
  }
  for(let material of data_other.interesting_materials.values()) {
    interesting_materials.add(material);
  }
  for(let material of interesting_materials.values()) {
    let data2 = getFungalShiftRetries(ws, shift_number, material);
    if (data2.shift.convertTries != data_other.shift.convertTries || data2.shift.greedChange) {
      // I'm relatively sure only one specific material can ever do anything, excepting greed.
      ret[material] = data2.shift;
    }
  }
  return ret;
}
let maxLength = 1;

export function getFungalShifts(seed, ngPlusCount = 0) {
  let shifts = [];
  for(let i=0; i<20; i++) {
    shifts.push(getFungalShift(seed + ngPlusCount, i));
  }
  return shifts;
}
