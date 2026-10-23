// Default profile pictures: "Big Smile" avatars by Ashley Seo, via DiceBear (CC BY 4.0).
// https://www.dicebear.com/styles/big-smile/
const BASE = 'https://api.dicebear.com/9.x/big-smile/png?size=256&accessoriesProbability=0';

export const DEFAULT_AVATARS = [
  `${BASE}&seed=Hana&hair=bunHair&hairColor=e66a8e&skinColor=f8d9ce&eyes=starstruck&mouth=kawaii&backgroundColor=ffd5dc`,
  `${BASE}&seed=Kuro&hair=shortHair&hairColor=220f00&skinColor=efcc9f&eyes=winking&mouth=openedSmile&backgroundColor=c0aede`,
  `${BASE}&seed=Sora&hair=bangs&hairColor=5aa9e6&skinColor=f8d9ce&eyes=cheery&mouth=gapSmile&backgroundColor=b6e3f4`,
  `${BASE}&seed=Mika&hair=straightHair&hairColor=e9b729&skinColor=ffe4c0&eyes=starstruck&mouth=teethSmile&backgroundColor=ffdfbf`,
  `${BASE}&seed=Riku&hair=froBun&hairColor=6c4545&skinColor=c99c62&eyes=cheery&mouth=kawaii&backgroundColor=d1d4f9`,
];

export const AVATAR_CREDIT = 'Avatars: "Big Smile" by Ashley Seo, via DiceBear (CC BY 4.0)';

export const randomAvatar = () => DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];

// The same avatar every time for a given user, for accounts that don't have one saved.
export const avatarFor = (userId = '') => {
  let hash = 0;
  for (const ch of String(userId)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return DEFAULT_AVATARS[hash % DEFAULT_AVATARS.length];
};
