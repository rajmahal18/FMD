// Event configuration transcribed from the seven organizer-supplied station posters.
// Physical challenges and assessment remain with the station facilitator.
export const operationStations = [
  {
    number: "1", legacyName: "Laser Station", name: "Laser Grid Breach",
    briefing: "Infiltrate a high-security safety box defended by a dense web of lasers. Every contact with a laser triggers an alarm, compromising squad stealth.",
    rules: [
      "Navigate from start to finish, one agent at a time.",
      "Avoid the lasers. Each contact adds 10 seconds to the squad's total time.",
      "If time runs out, add 1 minute for every agent who failed to cross."
    ],
    penalties: [{id:"laser-contact",label:"Laser contact",seconds:10},{id:"agent-not-crossed",label:"Time expired: agent did not cross",seconds:60}]
  },
  {
    number: "2", legacyName: "Minesweeper Station", name: "Minefield Matrix",
    briefing: "A tactical grid hides concealed landmines. Locate all safe tiles and clear the station with zero landmines triggered as fast as possible.",
    rules: [
      "Enter the grid simultaneously, with each agent standing on a single tile.",
      "Once all are positioned, sit, kneel, or crouch down to signal the handler for inspection.",
      "The handler announces the total number of landmines triggered.",
      "Stand up, strategize, and rearrange until zero landmines are triggered.",
      "If time runs out, add 1 minute for every agent standing on a mine."
    ],
    penalties: [{id:"agent-on-mine",label:"Time expired: agent standing on a mine",seconds:60}]
  },
  {
    number: "3A", legacyName: "Water Station", name: "Hydraulic Heist",
    briefing: "A hydraulic canister contains the squad's next badge. Fill the canister with water and raise the badge key.",
    rules: [
      "Use the provided unconventional materials to get water from the source and carry it to the vertical cylinder.",
      "Continuously pour water to raise the badge key inside.",
      "If time runs out, add 10 seconds for every inch of cylinder height that remains unfilled."
    ],
    penalties: [{id:"unfilled-inch",label:"Time expired: inch of cylinder unfilled",seconds:10}]
  },
  {
    number: "3B", legacyName: null, name: "Isotope Extraction",
    briefing: "Extract high-grade isotope capsules from a secured containment cage.",
    rules: [
      "All agents are equipped with one skewer each.",
      "Draw a color combination and memorize it in 30 seconds.",
      "Using the skewers, work together to extract the capsules in the exact order of the drawn combination. Carry and place each capsule into the designated capsule rack.",
      "Only the skewers may touch the balls from inside the mesh until they are secured in the capsule rack. No hands or body contact is permitted.",
      "Add 10 seconds for each non-skewer touch. Add 1 minute for every wrong-color or out-of-order capsule placed."
    ],
    penalties: [{id:"non-skewer-touch",label:"Non-skewer touch",seconds:10},{id:"wrong-capsule",label:"Wrong-color or out-of-order capsule",seconds:60}]
  },
  {
    number: "4", legacyName: "Stone Balancing Station", name: "Titan's Cairn",
    briefing: "Build a stable, free-standing stone cairn through a relay without knocking it over.",
    rules: [
      "Each agent holds one assigned stone. The team decides the stacking order.",
      "Place stones one at a time. Once done, go to the holding area.",
      "If the cairn falls, retrieve your stone, return to the queueing line, and rebuild the cairn.",
      "Once all stones are placed, the structure must stand unsupported for 10 seconds.",
      "If time runs out, add 1 minute for every stone left unplaced."
    ],
    penalties: [{id:"unplaced-stone",label:"Time expired: stone left unplaced",seconds:60}]
  },
  {
    number: "5", legacyName: "Attention to Detail Station", name: "Fragments of Memory",
    briefing: "Exercise your photographic memory to answer detailed interrogation questions regarding a squad roster wall.",
    rules: [
      "Draw one roster poster. Inspect, examine, and memorize every detail, including text, backgrounds, and features.",
      "At the commander's signal, the poster is removed and hidden. The station handler then asks a series of questions.",
      "Agents, led by their commander, must answer all questions purely from memory.",
      "If time runs out, add 1 minute for every incorrect answer."
    ],
    penalties: [{id:"incorrect-answer",label:"Time expired: incorrect answer",seconds:60}]
  },
  {
    number: "6", legacyName: "Emoji Station", name: "Silent Treatment",
    briefing: "Silently relay emoji faces down your squad line and match five emoji ID cards in the exact draw order.",
    rules: [
      "Stand in a single line facing away from the start.",
      "The first agent draws an emoji card. The handler taps the next agent. The first agent imitates the face, and the next agent guesses the emoji.",
      "Relay the emoji down the line, one agent at a time, until it reaches the final agent.",
      "The final agent guesses the emoji, steps out of the line, and wears the matching emoji card.",
      "Repeat with a new emoji until five agents are wearing emoji ID cards.",
      "The five agents wearing emoji IDs must line up in their exact draw order and recreate their assigned emojis.",
      "Add 10 seconds for every sound made and 1 minute for every wrong emoji."
    ],
    penalties: [{id:"sound-made",label:"Sound made",seconds:10},{id:"wrong-emoji",label:"Wrong emoji",seconds:60}]
  }
] as const;

export function stationInstructions(station: typeof operationStations[number]) {
  return ["Time limit: 10 minutes.", ...station.rules.map((rule,index)=>`${index+1}. ${rule}`), "Total time = completion time + total time penalties.", "Record each penalty once per occurrence or remaining item/agent. The facilitator assesses the physical challenge."].join("\n\n");
}
