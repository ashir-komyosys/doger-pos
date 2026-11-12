export const MENU_FOOD_SHEET = "/images/menu-food-sheet.png";

const POSITIONS = ["0% 0%", "50% 0%", "100% 0%", "0% 100%", "50% 100%", "100% 100%"];

export function menuFoodTile(name: string, index = 0) {
  const value = name.toLowerCase();
  let tile: number;
  if (/zinger|crispy chicken/.test(value)) tile = 0;
  else if (/beef|smash|burger/.test(value)) tile = 1;
  else if (/boti|tikka|bbq|kebab/.test(value)) tile = 2;
  else if (/pizza/.test(value)) tile = 3;
  else if (/fries|potato/.test(value)) tile = 4;
  else if (/drink|margarita|juice|soda|mojito/.test(value)) tile = 5;
  else tile = index % POSITIONS.length;

  return {
    backgroundImage: "url('" + MENU_FOOD_SHEET + "')",
    backgroundSize: "300% 200%",
    backgroundPosition: POSITIONS[tile],
  } as const;
}

