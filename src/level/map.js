// Crystal Keep level. One character per tile.
//   #  wall          T  wall with a torch
//   .  floor         P  player start (floor)
//   C  crystal       H  guard patrolling left/right (floor)
//   V  guard patrolling up/down (floor)
// Row 0 is the top (north) edge. x = column, y = row.
export const LEVEL_MAP = `
####T#######T####
#P....#...C.....#
#.###.#.#####.#.#
#.#C..#...#...#.#
#.#.###.#.#.###.#
T...#...#V..#C..T
###.#.###.#.#.###
#C..H.....#.....#
#.#####.#.#####.#
#...#...#...#...#
#.#.#.#####.#.#.#
#...#..C..H.....#
####T#######T####
`;
