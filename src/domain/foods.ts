// Built-in food list. Values are approximate reference values per serving, rounded from
// standard food-composition tables; home recipes vary, so the UI always calls them approximate.
// The first 30 entries keep their Liftbook names so imported history lines up with the list.
export interface FoodDef {
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  /** Weight (g) or volume (ml) of one serving, when it makes sense to enter an amount instead. */
  grams?: number;
  /** 'ml' for drinks. Defaults to grams. */
  per?: 'g' | 'ml';
  /** Other words people use for it. Used by search and by "describe your meal". */
  aka?: string[];
  custom?: boolean;
}

const F = (name: string, kcal: number, p: number, c: number, f: number, extra: Partial<FoodDef> = {}): FoodDef => ({ name, kcal, p, c, f, ...extra });
const g = (grams: number, aka: string[] = []): Partial<FoodDef> => ({ grams, aka });
const ml = (grams: number, aka: string[] = []): Partial<FoodDef> => ({ grams, per: 'ml', aka });
const a = (...aka: string[]): Partial<FoodDef> => ({ aka });

export const FOODS: FoodDef[] = [
  // ----- eggs, meat, fish -----
  F('Egg, whole (1 large)', 72, 6.3, 0.4, 4.8, a('egg', 'eggs', 'boiled egg', 'fried egg')),
  F('Egg white (1)', 17, 3.6, 0.2, 0, a('egg whites', 'whites')),
  F('Egg bhurji (2 eggs)', 200, 13, 3, 15, a('bhurji', 'scrambled eggs', 'anda bhurji')),
  F('Omelette (2 eggs)', 190, 13, 1, 15, a('omelet')),
  F('Egg curry (2 eggs)', 250, 14, 6, 19, a('anda curry')),
  F('Chicken breast, cooked (100 g)', 165, 31, 0, 3.6, g(100, ['chicken', 'grilled chicken'])),
  F('Chicken thigh, cooked (100 g)', 209, 26, 0, 10.9, g(100)),
  F('Chicken curry (1 bowl, 200 g)', 300, 28, 8, 17, g(200)),
  F('Chicken tikka (100 g)', 150, 25, 3, 4, g(100, ['tandoori chicken'])),
  F('Butter chicken (1 bowl, 200 g)', 440, 28, 10, 32, g(200, ['murgh makhani'])),
  F('Chicken biryani (1 plate, 300 g)', 480, 25, 55, 17, g(300, ['biryani'])),
  F('Mutton curry (1 bowl, 200 g)', 380, 28, 8, 26, g(200, ['lamb curry', 'mutton'])),
  F('Fish, cooked (100 g)', 120, 24, 0, 2.5, g(100, ['fish fry', 'grilled fish'])),
  F('Salmon, cooked (100 g)', 206, 22, 0, 12, g(100)),
  F('Tuna, canned in water (100 g)', 116, 26, 0, 1, g(100)),
  F('Prawns, cooked (100 g)', 99, 24, 0.2, 0.3, g(100, ['shrimp'])),
  // ----- dairy, soy -----
  F('Paneer (100 g)', 265, 18, 1.2, 20.8, g(100)),
  F('Paneer bhurji (1 bowl, 150 g)', 330, 19, 8, 25, g(150)),
  F('Palak paneer (1 bowl, 200 g)', 280, 14, 10, 20, g(200)),
  F('Tofu, firm (100 g)', 144, 16, 3, 9, g(100)),
  F('Soya chunks, dry (50 g)', 173, 26, 17, 0.3, g(50, ['soy chunks', 'nutrela'])),
  F('Milk, toned (250 ml)', 145, 8, 12, 7.5, ml(250, ['milk', 'glass of milk'])),
  F('Milk, full cream (250 ml)', 155, 8, 12, 8.5, ml(250, ['whole milk'])),
  F('Curd / dahi (100 g)', 61, 3.5, 4.7, 3.3, g(100, ['curd', 'dahi', 'yogurt', 'yoghurt'])),
  F('Greek yogurt, plain (100 g)', 59, 10, 3.6, 0.4, g(100)),
  F('Buttermilk / chaas (1 glass, 250 ml)', 50, 2.5, 4, 1.5, ml(250, ['chaas', 'buttermilk', 'chhaas'])),
  F('Lassi, sweet (1 glass, 250 ml)', 180, 6, 28, 5, ml(250)),
  F('Cheese slice (1)', 60, 3.5, 1, 4.5, a('cheese')),
  // ----- pulses -----
  F('Dal, cooked (1 bowl)', 230, 14, 36, 4, a('dal', 'daal', 'lentils', 'dal tadka')),
  F('Dal makhani (1 bowl)', 330, 13, 32, 16),
  F('Rajma / chole (1 bowl)', 250, 12, 38, 6, a('rajma', 'chole', 'chana masala')),
  F('Chickpeas, boiled (100 g)', 164, 8.9, 27, 2.6, g(100, ['chana', 'kabuli chana'])),
  F('Sambar (1 bowl)', 150, 7, 22, 4),
  F('Moong sprouts (1 cup, 100 g)', 30, 3, 6, 0.2, g(100, ['sprouts'])),
  F('Moong dal chilla (1)', 120, 7, 15, 3.5, a('chilla', 'cheela')),
  F('Besan chilla (1)', 130, 6, 14, 5),
  F('Roasted chana (50 g)', 180, 10, 29, 3, g(50)),
  // ----- breads, rice, grains -----
  F('Roti / chapati (1 medium)', 120, 3.5, 20, 3, a('roti', 'rotis', 'chapati', 'chapatis', 'phulka')),
  F('Paratha, plain (1)', 220, 5, 30, 9, a('paratha')),
  F('Aloo paratha (1)', 290, 6, 40, 12),
  F('Naan (1)', 260, 8, 45, 5),
  F('White rice, cooked (1 cup)', 205, 4.3, 45, 0.4, g(158, ['rice', 'steamed rice', 'chawal'])),
  F('Brown rice, cooked (1 cup)', 215, 5, 45, 1.8, g(195)),
  F('Jeera rice (1 cup)', 250, 4.5, 45, 5.5),
  F('Veg pulao (1 cup)', 230, 5, 40, 6, a('pulao', 'pulav')),
  F('Khichdi (1 bowl)', 220, 8, 36, 5),
  F('Poha (1 plate)', 250, 5, 45, 6),
  F('Upma (1 bowl)', 250, 6, 38, 8),
  F('Idli (1)', 39, 2, 8, 0.2, a('idlis')),
  F('Plain dosa (1)', 170, 4, 28, 4.5, a('dosa')),
  F('Masala dosa (1)', 360, 8, 55, 12),
  F('Uttapam (1)', 200, 5, 32, 5),
  F('Medu vada (1)', 135, 4, 12, 8, a('vada')),
  F('Oats, dry (40 g)', 150, 5, 27, 2.6, g(40, ['oatmeal', 'porridge'])),
  F('Cornflakes (30 g)', 113, 2, 25, 0.3, g(30)),
  F('Muesli (40 g)', 150, 4, 26, 3, g(40)),
  F('Whole wheat bread (1 slice)', 80, 4, 14, 1, a('bread', 'brown bread', 'toast')),
  F('White bread (1 slice)', 75, 2.5, 14, 1),
  F('Pasta, cooked (1 cup)', 220, 8, 43, 1.3, g(140)),
  F('Instant noodles (1 pack, 70 g)', 310, 7, 45, 11, a('noodles', 'maggi')),
  // ----- vegetables -----
  F('Mixed veg sabzi (1 bowl)', 120, 3, 12, 7, a('sabzi', 'sabji', 'vegetables', 'veg curry')),
  F('Aloo sabzi (1 bowl)', 180, 3, 26, 7),
  F('Bhindi sabzi (1 bowl)', 140, 3, 12, 9, a('okra')),
  F('Potato, boiled (100 g)', 87, 1.9, 20, 0.1, g(100, ['potato', 'aloo'])),
  F('Sweet potato, boiled (100 g)', 86, 1.6, 20, 0.1, g(100)),
  F('Salad, mixed (1 bowl)', 35, 2, 7, 0.3, a('salad')),
  // ----- fruit -----
  F('Banana (1 medium)', 105, 1.3, 27, 0.4, a('bananas')),
  F('Apple (1 medium)', 95, 0.5, 25, 0.3, a('apples')),
  F('Orange (1 medium)', 62, 1.2, 15, 0.2),
  F('Mango (1 cup)', 99, 1.4, 25, 0.6),
  F('Papaya (1 cup)', 62, 0.7, 16, 0.4),
  F('Watermelon (1 cup)', 46, 0.9, 11.5, 0.2),
  F('Grapes (1 cup)', 104, 1.1, 27, 0.2),
  F('Dates (2 pieces)', 46, 0.4, 12, 0, a('khajur')),
  // ----- nuts, fats, sweeteners -----
  F('Peanut butter (1 tbsp)', 95, 3.5, 3.5, 8),
  F('Peanuts (30 g)', 170, 7.7, 4.8, 14.8, g(30)),
  F('Almonds (20 g)', 116, 4.2, 4.3, 10, g(20, ['badam'])),
  F('Cashews (20 g)', 111, 3.6, 6, 8.8, g(20, ['kaju'])),
  F('Walnuts (20 g)', 131, 3, 2.7, 13, g(20)),
  F('Makhana, roasted (30 g)', 104, 2.9, 23, 0.1, g(30, ['fox nuts'])),
  F('Ghee (1 tsp)', 45, 0, 0, 5),
  F('Butter (1 tsp)', 34, 0, 0, 3.8),
  F('Cooking oil (1 tsp)', 40, 0, 0, 4.5, a('oil')),
  F('Sugar (1 tsp)', 16, 0, 4, 0),
  F('Honey (1 tsp)', 21, 0, 5.7, 0),
  F('Dark chocolate (20 g)', 120, 1.5, 9, 8.6, g(20)),
  // ----- snacks, eating out -----
  F('Samosa (1)', 260, 4, 30, 14, a('samosas')),
  F('Vada pav (1)', 290, 6, 40, 12),
  F('Pav bhaji (1 plate)', 400, 9, 55, 16),
  F('Veg sandwich (1)', 250, 8, 35, 8, a('sandwich')),
  F('Pizza (1 slice)', 285, 12, 36, 10),
  F('French fries (medium)', 365, 4, 48, 17, a('fries')),
  // ----- drinks -----
  F('Tea with milk and sugar (1 cup)', 70, 2, 10, 2.5, a('chai', 'tea')),
  F('Coffee with milk (1 cup)', 60, 2, 8, 2, a('coffee')),
  F('Black coffee (1 cup)', 2, 0.3, 0, 0),
  F('Coconut water (250 ml)', 48, 1.8, 9, 0.5, ml(250)),
  F('Orange juice (250 ml)', 112, 1.7, 26, 0.5, ml(250, ['juice'])),
  F('Soft drink (330 ml)', 139, 0, 35, 0, ml(330, ['cola', 'soda'])),
];
