"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { Upload, Camera, X, Settings, MessageSquare, Sparkles, ChevronRight, Plus } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toLocalDateString } from "@/lib/date-utils";

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sugar: number;
  sodium: number;
  fiber: number;
  time: string;
  imageUrl?: string;
}

interface Recipe {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sugar?: number;
  sodium?: number;
  fiber?: number;
  description: string;
  category: string;
}

// Recommended Healthy Recipes organized by category
const recommendedRecipes: Recipe[] = [
  // Chicken Category
  {
    id: "1",
    name: "Grilled Chicken Salad",
    calories: 350,
    protein: 35,
    carbs: 15,
    fats: 18,
    sugar: 5,
    sodium: 400,
    fiber: 4,
    description: "Fresh mixed greens with grilled chicken breast, cherry tomatoes, and olive oil dressing",
    category: "Chicken"
  },
  {
    id: "12",
    name: "Chicken and Brown Rice",
    calories: 450,
    protein: 38,
    carbs: 48,
    fats: 10,
    sugar: 2,
    sodium: 450,
    fiber: 4,
    description: "Grilled chicken breast with brown rice and steamed broccoli",
    category: "Chicken"
  },
  {
    id: "13",
    name: "Chicken Teriyaki Bowl",
    calories: 420,
    protein: 36,
    carbs: 52,
    fats: 8,
    sugar: 12,
    sodium: 680,
    fiber: 3,
    description: "Grilled teriyaki chicken with jasmine rice and vegetables",
    category: "Chicken"
  },
  {
    id: "14",
    name: "Chicken Caesar Wrap",
    calories: 380,
    protein: 32,
    carbs: 38,
    fats: 14,
    sugar: 4,
    sodium: 720,
    fiber: 5,
    description: "Grilled chicken, romaine lettuce, parmesan, and caesar dressing in a whole wheat wrap",
    category: "Chicken"
  },
  {
    id: "15",
    name: "Lemon Herb Chicken",
    calories: 320,
    protein: 34,
    carbs: 12,
    fats: 14,
    sugar: 3,
    sodium: 380,
    fiber: 2,
    description: "Baked chicken breast with lemon, herbs, and roasted vegetables",
    category: "Chicken"
  },
  // Protein Category
  {
    id: "2",
    name: "Salmon with Quinoa",
    calories: 420,
    protein: 32,
    carbs: 35,
    fats: 18,
    sugar: 2,
    sodium: 350,
    fiber: 5,
    description: "Baked salmon fillet served with quinoa and steamed vegetables",
    category: "Protein"
  },
  {
    id: "10",
    name: "Baked Cod with Sweet Potato",
    calories: 360,
    protein: 30,
    carbs: 42,
    fats: 8,
    sugar: 12,
    sodium: 320,
    fiber: 7,
    description: "Oven-baked cod fillet with roasted sweet potato and green beans",
    category: "Protein"
  },
  {
    id: "5",
    name: "Turkey Wrap",
    calories: 380,
    protein: 28,
    carbs: 42,
    fats: 12,
    sugar: 4,
    sodium: 680,
    fiber: 6,
    description: "Whole wheat wrap with lean turkey, avocado, lettuce, and tomato",
    category: "Protein"
  },
  {
    id: "16",
    name: "Tuna Poke Bowl",
    calories: 390,
    protein: 30,
    carbs: 45,
    fats: 10,
    sugar: 6,
    sodium: 520,
    fiber: 4,
    description: "Fresh tuna, brown rice, edamame, avocado, and sesame dressing",
    category: "Protein"
  },
  {
    id: "17",
    name: "Beef Stir Fry",
    calories: 410,
    protein: 35,
    carbs: 38,
    fats: 14,
    sugar: 8,
    sodium: 580,
    fiber: 5,
    description: "Lean beef strips with mixed vegetables in a light soy-ginger sauce",
    category: "Protein"
  },
  // Vegetarian Category
  {
    id: "6",
    name: "Vegetable Stir Fry",
    calories: 290,
    protein: 15,
    carbs: 38,
    fats: 10,
    sugar: 8,
    sodium: 520,
    fiber: 7,
    description: "Mixed vegetables stir-fried with tofu in a light soy sauce",
    category: "Vegetarian"
  },
  {
    id: "9",
    name: "Quinoa Bowl",
    calories: 410,
    protein: 18,
    carbs: 58,
    fats: 12,
    sugar: 6,
    sodium: 380,
    fiber: 9,
    description: "Quinoa base with black beans, corn, avocado, and salsa",
    category: "Vegetarian"
  },
  {
    id: "18",
    name: "Mediterranean Bowl",
    calories: 380,
    protein: 16,
    carbs: 48,
    fats: 16,
    sugar: 8,
    sodium: 420,
    fiber: 10,
    description: "Chickpeas, cucumber, tomatoes, olives, feta cheese, and tahini",
    category: "Vegetarian"
  },
  {
    id: "19",
    name: "Veggie Burger",
    calories: 350,
    protein: 18,
    carbs: 42,
    fats: 12,
    sugar: 6,
    sodium: 580,
    fiber: 8,
    description: "Plant-based patty with lettuce, tomato, and whole grain bun",
    category: "Vegetarian"
  },
  {
    id: "20",
    name: "Lentil Curry",
    calories: 320,
    protein: 20,
    carbs: 52,
    fats: 6,
    sugar: 8,
    sodium: 480,
    fiber: 16,
    description: "Spiced red lentils with basmati rice and naan",
    category: "Vegetarian"
  },
  // Breakfast Category
  {
    id: "3",
    name: "Greek Yogurt Parfait",
    calories: 280,
    protein: 20,
    carbs: 35,
    fats: 8,
    sugar: 22,
    sodium: 120,
    fiber: 4,
    description: "Layered Greek yogurt with fresh berries, granola, and honey",
    category: "Breakfast"
  },
  {
    id: "4",
    name: "Oatmeal with Berries",
    calories: 320,
    protein: 12,
    carbs: 55,
    fats: 8,
    sugar: 18,
    sodium: 150,
    fiber: 8,
    description: "Steel-cut oats topped with mixed berries, almonds, and a drizzle of honey",
    category: "Breakfast"
  },
  {
    id: "8",
    name: "Egg White Scramble",
    calories: 220,
    protein: 24,
    carbs: 8,
    fats: 10,
    sugar: 3,
    sodium: 420,
    fiber: 2,
    description: "Scrambled egg whites with spinach, mushrooms, and whole grain toast",
    category: "Breakfast"
  },
  {
    id: "21",
    name: "Avocado Toast",
    calories: 290,
    protein: 10,
    carbs: 32,
    fats: 16,
    sugar: 4,
    sodium: 380,
    fiber: 12,
    description: "Whole grain toast with mashed avocado, poached egg, and cherry tomatoes",
    category: "Breakfast"
  },
  {
    id: "22",
    name: "Protein Pancakes",
    calories: 340,
    protein: 28,
    carbs: 38,
    fats: 8,
    sugar: 12,
    sodium: 320,
    fiber: 6,
    description: "Protein-rich pancakes with Greek yogurt and fresh fruit",
    category: "Breakfast"
  },
  // Snacks Category
  {
    id: "7",
    name: "Protein Smoothie",
    calories: 250,
    protein: 25,
    carbs: 28,
    fats: 4,
    sugar: 20,
    sodium: 80,
    fiber: 3,
    description: "Banana, spinach, protein powder, and almond milk blend",
    category: "Snacks"
  },
  {
    id: "11",
    name: "Cottage Cheese Bowl",
    calories: 200,
    protein: 22,
    carbs: 15,
    fats: 6,
    sugar: 10,
    sodium: 380,
    fiber: 0,
    description: "Low-fat cottage cheese with fresh peaches and a sprinkle of cinnamon",
    category: "Snacks"
  },
  {
    id: "23",
    name: "Protein Bar",
    calories: 240,
    protein: 20,
    carbs: 22,
    fats: 8,
    sugar: 14,
    sodium: 180,
    fiber: 4,
    description: "Homemade protein bar with nuts, dates, and chocolate",
    category: "Snacks"
  },
  {
    id: "24",
    name: "Hummus & Veggies",
    calories: 180,
    protein: 8,
    carbs: 22,
    fats: 8,
    sugar: 4,
    sodium: 320,
    fiber: 8,
    description: "Fresh hummus with carrot sticks, cucumber, and bell peppers",
    category: "Snacks"
  }
];

// Recipes View Component - Delivery App Style
function RecipesView({ onAddMeal }: { onAddMeal: (meal: Recipe) => void }) {
  const [favourites, setFavourites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("favouriteRecipes");
    return stored ? JSON.parse(stored) : [];
  });

  const toggleFavourite = (recipeId: string) => {
    const updated = favourites.includes(recipeId)
      ? favourites.filter(id => id !== recipeId)
      : [...favourites, recipeId];
    setFavourites(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("favouriteRecipes", JSON.stringify(updated));
    }
  };

  const categories = ["Chicken", "Protein", "Vegetarian", "Breakfast", "Snacks"];
  
  const getRecipesByCategory = (category: string) => {
    return recommendedRecipes.filter(r => r.category === category);
  };

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const categoryRecipes = getRecipesByCategory(category);
        if (categoryRecipes.length === 0) return null;

        return (
          <div key={category} className="space-y-2">
            {/* Category Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{category}</h2>
              <button className="w-7 h-7 rounded-full bg-teal-400/20 flex items-center justify-center text-teal-400 hover:bg-teal-400/30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Horizontal Scrollable Recipe Cards */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {categoryRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex-shrink-0 w-[220px] bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-lg overflow-hidden border border-teal-500/20 hover:border-teal-400/40 transition-all"
                >
                  {/* Food Image Placeholder */}
                  <div className="w-full h-28 bg-gradient-to-br from-gray-700 to-gray-900 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl">🍽️</span>
                    </div>
                    {/* Favourite Button */}
                    <button
                      onClick={() => toggleFavourite(recipe.id)}
                      className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${
                        favourites.includes(recipe.id)
                          ? "bg-red-500/90 text-white"
                          : "bg-white/20 text-gray-300 hover:bg-white/30"
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill={favourites.includes(recipe.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>

                  {/* Recipe Info */}
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-white mb-1">{recipe.name}</h3>
                    <p className="text-[10px] text-gray-400 mb-2 line-clamp-2">{recipe.description}</p>
                    
                    {/* Nutrition Info */}
                    <div className="flex items-center gap-1.5 text-[9px] text-gray-300 mb-2">
                      <span className="font-semibold text-teal-400">{recipe.calories} kcal</span>
                      <span>•</span>
                      <span>P: {recipe.protein}g</span>
                      <span>•</span>
                      <span>C: {recipe.carbs}g</span>
                      <span>•</span>
                      <span>F: {recipe.fats}g</span>
                    </div>

                    {/* Add Button */}
                    <button
                      onClick={() => onAddMeal(recipe)}
                      className="w-full py-2 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black rounded-lg font-bold text-xs transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Favourites View Component
function FavouritesView({ meals, onAddMeal }: { meals: Meal[]; onAddMeal: (meal: Recipe) => void }) {
  const [favourites, setFavourites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("favouriteRecipes");
    return stored ? JSON.parse(stored) : [];
  });
  const [personalRecipes, setPersonalRecipes] = useState<Recipe[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("personalRecipes");
    return stored ? JSON.parse(stored) : [];
  });
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    description: "",
  });

  const favouriteRecipes = recommendedRecipes.filter(r => favourites.includes(r.id));
  const allRecipes = [...favouriteRecipes, ...personalRecipes];

  const savePersonalRecipes = (recipes: Recipe[]) => {
    setPersonalRecipes(recipes);
    if (typeof window !== "undefined") {
      localStorage.setItem("personalRecipes", JSON.stringify(recipes));
    }
  };

  const handleAddPersonalRecipe = () => {
    if (!newRecipe.name.trim() || !newRecipe.calories) return;
    const recipe: Recipe = {
      id: `personal-${Date.now()}`,
      name: newRecipe.name.trim(),
      calories: parseInt(newRecipe.calories) || 0,
      protein: parseInt(newRecipe.protein) || 0,
      carbs: parseInt(newRecipe.carbs) || 0,
      fats: parseInt(newRecipe.fats) || 0,
      description: newRecipe.description.trim() || "Personal recipe",
      category: "Personal",
    };
    savePersonalRecipes([...personalRecipes, recipe]);
    setNewRecipe({ name: "", calories: "", protein: "", carbs: "", fats: "", description: "" });
    setShowAddRecipe(false);
  };

  const handleRemovePersonalRecipe = (id: string) => {
    savePersonalRecipes(personalRecipes.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowAddRecipe(true)}
        className="w-full py-3 rounded-xl border-2 border-dashed border-teal-500/40 text-teal-400 font-semibold flex items-center justify-center gap-2 hover:bg-teal-500/10 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Add personal recipe
      </button>

      {allRecipes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">❤️</div>
          <p className="text-gray-400 mb-2">No favourite recipes yet</p>
          <p className="text-xs text-gray-500 mb-4">Go to Recipes tab and heart your favorites, or add a personal recipe above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {allRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-teal-500/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white mb-1">{recipe.name}</h3>
                  <p className="text-xs text-gray-400 mb-2">{recipe.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-300">
                    <span className="font-semibold text-teal-400">{recipe.calories} kcal</span>
                    <span>•</span>
                    <span>P: {recipe.protein}g</span>
                    <span>C: {recipe.carbs}g</span>
                    <span>F: {recipe.fats}g</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => onAddMeal(recipe)}
                    className="py-2 px-3 bg-teal-400 hover:bg-teal-500 text-black text-xs font-bold rounded-lg transition-colors"
                  >
                    Add
                  </button>
                  {recipe.id.startsWith("personal-") && (
                    <button
                      onClick={() => handleRemovePersonalRecipe(recipe.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddRecipe && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 w-full max-w-md border border-teal-500/30">
            <h3 className="text-lg font-bold text-white mb-4">Add personal recipe</h3>
            <div className="space-y-3">
              <input
                value={newRecipe.name}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Recipe name *"
                className="w-full bg-black/40 border border-teal-500/30 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400"
              />
              <input
                type="number"
                value={newRecipe.calories}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, calories: e.target.value }))}
                placeholder="Calories *"
                className="w-full bg-black/40 border border-teal-500/30 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={newRecipe.protein}
                  onChange={(e) => setNewRecipe(prev => ({ ...prev, protein: e.target.value }))}
                  placeholder="Protein (g)"
                  className="w-full bg-black/40 border border-teal-500/30 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400 text-sm"
                />
                <input
                  type="number"
                  value={newRecipe.carbs}
                  onChange={(e) => setNewRecipe(prev => ({ ...prev, carbs: e.target.value }))}
                  placeholder="Carbs (g)"
                  className="w-full bg-black/40 border border-teal-500/30 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400 text-sm"
                />
                <input
                  type="number"
                  value={newRecipe.fats}
                  onChange={(e) => setNewRecipe(prev => ({ ...prev, fats: e.target.value }))}
                  placeholder="Fats (g)"
                  className="w-full bg-black/40 border border-teal-500/30 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400 text-sm"
                />
              </div>
              <input
                value={newRecipe.description}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description (optional)"
                className="w-full bg-black/40 border border-teal-500/30 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowAddRecipe(false); setNewRecipe({ name: "", calories: "", protein: "", carbs: "", fats: "", description: "" }); }}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPersonalRecipe}
                disabled={!newRecipe.name.trim() || !newRecipe.calories}
                className="flex-1 py-3 bg-teal-400 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl font-semibold transition-colors"
              >
                Add recipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NutritionPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showScanIntro, setShowScanIntro] = useState(false);
  const [showScanOptions, setShowScanOptions] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [foodToScan, setFoodToScan] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAIConsultation, setShowAIConsultation] = useState(false);
  const [aiConsultationMessage, setAiConsultationMessage] = useState("");
  const [aiConsultationResponse, setAiConsultationResponse] = useState("");
  const [isConsultingAI, setIsConsultingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<"macros" | "recipes" | "favourites">("macros");
  const [aiEstimate, setAiEstimate] = useState<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newMeal, setNewMeal] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    sugar: "",
    sodium: "",
    fiber: "",
  });

  const [dailyGoals, setDailyGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fats: 65,
    sugar: 50,
    sodium: 2300,
    fiber: 30,
  });

  const [showMacroSettings, setShowMacroSettings] = useState(false);
  const [macroSettings, setMacroSettings] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fats: 65,
    sugar: 50,
    sodium: 2300,
    fiber: 30,
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load meals and macro goals from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Load meals
    const storedMeals = localStorage.getItem("meals");
    if (storedMeals) {
      try {
        const parsedMeals = JSON.parse(storedMeals);
        const today = toLocalDateString(new Date());
        const todayMeals = parsedMeals.filter((m: Meal & { date?: string }) => {
          if (m.date) return m.date === today;
          return true;
        });
        setMeals(todayMeals);
      } catch (e) {
        console.error("Error loading meals:", e);
      }
    }

    // Load macro goals
    const storedGoals = localStorage.getItem("macroGoals");
    if (storedGoals) {
      try {
        const goals = JSON.parse(storedGoals);
        setDailyGoals(goals);
        setMacroSettings(goals);
      } catch (e) {
        console.error("Error loading macro goals:", e);
      }
    } else {
      const nutritionPlan = localStorage.getItem("customNutritionPlan");
      if (nutritionPlan) {
        try {
          const plan = JSON.parse(nutritionPlan);
          if (plan.dailyCalories && plan.macros) {
            const goals = {
              calories: plan.dailyCalories,
              protein: plan.macros.protein || 150,
              carbs: plan.macros.carbs || 250,
              fats: plan.macros.fats || 65,
              sugar: 50,
              sodium: 2300,
              fiber: 30,
            };
            setDailyGoals(goals);
            setMacroSettings(goals);
            localStorage.setItem("macroGoals", JSON.stringify(goals));
          }
        } catch (e) {
          console.error("Error loading nutrition plan:", e);
        }
      }
    }
    
    setIsLoaded(true);
  }, []);

  // Save meals to localStorage whenever meals change
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;
    const today = toLocalDateString(new Date());
    const mealsWithDate = meals.map(meal => ({ ...meal, date: today }));
    
    const storedMeals = localStorage.getItem("meals");
    let allMeals: (Meal & { date: string })[] = [];
    if (storedMeals) {
      try {
        allMeals = JSON.parse(storedMeals);
      } catch (e) {}
    }
    
    allMeals = allMeals.filter((m: Meal & { date?: string }) => m.date !== today);
    allMeals = [...allMeals, ...mealsWithDate];
    
    localStorage.setItem("meals", JSON.stringify(allMeals));
    const totalsForToday = mealsWithDate.reduce(
      (acc, m) => ({
        calories: acc.calories + (m.calories || 0),
        protein: acc.protein + (m.protein || 0),
        carbs: acc.carbs + (m.carbs || 0),
        fats: acc.fats + (m.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
    localStorage.setItem(`nutritionTotals_${today}`, JSON.stringify(totalsForToday));
    window.dispatchEvent(new CustomEvent("mealsUpdated"));
  }, [meals, isLoaded]);


  const totals = useMemo(() => {
    return meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + (meal.protein || 0),
      carbs: acc.carbs + (meal.carbs || 0),
      fats: acc.fats + (meal.fats || 0),
      sugar: acc.sugar + (meal.sugar || 0),
      sodium: acc.sodium + (meal.sodium || 0),
      fiber: acc.fiber + (meal.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0, sodium: 0, fiber: 0 }
  );
  }, [meals]);

  const caloriesPercentage = dailyGoals.calories > 0 
    ? Math.min(Math.round((totals.calories / dailyGoals.calories) * 100), 100) 
    : 0;
  const proteinPercentage = dailyGoals.protein > 0 
    ? Math.min(Math.round((totals.protein / dailyGoals.protein) * 100), 100) 
    : 0;
  const carbsPercentage = dailyGoals.carbs > 0 
    ? Math.min(Math.round((totals.carbs / dailyGoals.carbs) * 100), 100) 
    : 0;
  const fatsPercentage = dailyGoals.fats > 0 
    ? Math.min(Math.round((totals.fats / dailyGoals.fats) * 100), 100) 
    : 0;
  const sugarPercentage = dailyGoals.sugar > 0 
    ? Math.min(Math.round((totals.sugar / dailyGoals.sugar) * 100), 100) 
    : 0;
  const sodiumPercentage = dailyGoals.sodium > 0 
    ? Math.min(Math.round((totals.sodium / dailyGoals.sodium) * 100), 100) 
    : 0;
  const fiberPercentage = dailyGoals.fiber > 0 
    ? Math.min(Math.round((totals.fiber / dailyGoals.fiber) * 100), 100) 
    : 0;

  // Check if at least one macro target is hit (>= 100%)
  const hasTargetHit = useMemo(() => {
    return caloriesPercentage >= 100 || proteinPercentage >= 100 || carbsPercentage >= 100 || fatsPercentage >= 100;
  }, [caloriesPercentage, proteinPercentage, carbsPercentage, fatsPercentage]);

  const [mealAnalysis, setMealAnalysis] = useState<string | null>(null);
  const [isAnalyzingMeals, setIsAnalyzingMeals] = useState(false);
  const mealAnalysisAttemptedRef = useRef(false);

  // Fetch meal analysis when at least one target is hit (only once per session)
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded || !hasTargetHit || meals.length === 0) return;
    if (mealAnalysisAttemptedRef.current) return;
    
    const todayStr = new Date().toISOString().split("T")[0];
    const analysisKey = `mealAnalysis_${todayStr}`;
    
    // Check if analysis already exists for today
    const storedAnalysis = localStorage.getItem(analysisKey);
    if (storedAnalysis) {
      setMealAnalysis(storedAnalysis);
      mealAnalysisAttemptedRef.current = true;
      return;
    }

    if (isAnalyzingMeals) return;
    
    mealAnalysisAttemptedRef.current = true;
    const fetchAnalysis = async () => {
      setIsAnalyzingMeals(true);
      try {
        const response = await fetch("/api/meal-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meals,
            totals,
            goals: dailyGoals,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.analysis) {
            setMealAnalysis(data.analysis);
            localStorage.setItem(analysisKey, data.analysis);
          }
        }
      } catch (error) {
        console.error("Error fetching meal analysis:", error);
        mealAnalysisAttemptedRef.current = false;
      } finally {
        setIsAnalyzingMeals(false);
      }
    };

    fetchAnalysis();
  }, [hasTargetHit, meals.length, isLoaded]);

  const handleDeleteMeal = (mealId: string) => {
    setMeals(meals.filter(m => m.id !== mealId));
  };

  const handleManualMealAnalysis = async () => {
    if (meals.length === 0) {
      alert("Please add at least one meal before analyzing.");
      return;
    }

    setIsAnalyzingMeals(true);
    try {
      const response = await fetch("/api/meal-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meals,
          totals,
          goals: dailyGoals,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.analysis) {
          const todayStr = new Date().toISOString().split("T")[0];
          const analysisKey = `mealAnalysis_${todayStr}`;
          setMealAnalysis(data.analysis);
          // Store analysis for today
          localStorage.setItem(analysisKey, data.analysis);
          // Close the AI Coach modal
          setShowAIConsultation(false);
          setAiConsultationResponse("");
          setAiConsultationMessage("");
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to analyze meals. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching meal analysis:", error);
      alert("Failed to analyze meals. Please try again.");
    } finally {
      setIsAnalyzingMeals(false);
    }
  };

  const openCamera = () => {
    // Open native iOS camera using file input with capture attribute
    cameraInputRef.current?.click();
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setCapturedImage(imageData);
        setShowScanOptions(false);
        setShowScanIntro(false);
        analyzeFood(imageData);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setCapturedImage(imageData);
        setShowScanOptions(false);
        analyzeFood(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const compressImage = (dataUrl: string, maxWidth: number = 1024, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Validate input
      if (!dataUrl || !dataUrl.startsWith("data:image/")) {
        console.error("Invalid data URL format:", dataUrl?.substring(0, 50));
        reject(new Error("Invalid image data format"));
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        try {
          // Validate image dimensions
          if (img.width === 0 || img.height === 0) {
            console.error("Invalid image dimensions:", img.width, img.height);
            reject(new Error("Invalid image dimensions"));
            return;
          }
          
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          // Ensure minimum dimensions
          if (width < 1 || height < 1) {
            console.error("Compressed dimensions too small:", width, height);
            reject(new Error("Image too small to compress"));
            return;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          
          if (!ctx) {
            console.error("Failed to get canvas context for compression");
            reject(new Error("Failed to compress image"));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", quality);
          
          // Validate compressed output
          if (!compressed || !compressed.startsWith("data:image/jpeg")) {
            console.error("Compression produced invalid data URL");
            reject(new Error("Compression failed"));
            return;
          }
          
          console.log("Image compressed successfully, size:", compressed.length, "bytes");
          resolve(compressed);
        } catch (error) {
          console.error("Error during image compression:", error);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        console.error("Error loading image for compression:", error);
        reject(new Error("Failed to load image"));
      };
      
      img.src = dataUrl;
    });
  };

  const analyzeFood = async (imageData: string) => {
    setIsAnalyzing(true);
    setAiEstimate(null);
    try {
      // Validate input image data
      if (!imageData || !imageData.startsWith("data:image/")) {
        console.error("Invalid image data format in analyzeFood:", imageData?.substring(0, 50));
        alert("Invalid image format. Please try capturing the photo again.");
        setIsAnalyzing(false);
        return;
      }
      
      let compressedImage: string;
      try {
        compressedImage = await compressImage(imageData, 1024, 0.8);
        
        // Validate compressed image
        if (!compressedImage || !compressedImage.startsWith("data:image/jpeg")) {
          console.error("Compression failed, using original image");
          compressedImage = imageData;
        }
      } catch (compressError) {
        console.error("Image compression failed, using original:", compressError);
        // Fallback to original image if compression fails
        compressedImage = imageData;
      }
      
      // Final validation before sending
      if (!compressedImage || !compressedImage.startsWith("data:image/")) {
        console.error("Final validation failed - invalid image format");
        alert("Invalid image format. Please try capturing the photo again.");
        setIsAnalyzing(false);
        return;
      }
      
      console.log("Sending image to API, size:", compressedImage.length, "bytes");

      // Use Railway backend if available (where API keys are configured), else Vercel /api/food-estimate
      let railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_API_URL || "";
      if (railwayUrl && !railwayUrl.startsWith("http://") && !railwayUrl.startsWith("https://")) {
        railwayUrl = `https://${railwayUrl}`;
      }
      railwayUrl = railwayUrl.replace(/\/+$/, "");
      const apiUrl = railwayUrl ? `${railwayUrl}/api/food-estimate` : "/api/food-estimate";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: compressedImage,
          label: foodToScan || "Unknown meal",
        }),
      });

      const text = await response.text();

      // Try to parse as JSON even if content-type is wrong (some servers send JSON with wrong headers)
      let data: { estimate?: unknown; error?: string };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        if (text.includes("OPENAI_API_KEY") || text.includes("API key")) {
          throw new Error("OpenAI API key is not configured.");
        }
        const snippet = text.slice(0, 150).replace(/\s+/g, " ");
        throw new Error(
          `Server returned an invalid response (${response.status}). ${snippet ? `Response: ${snippet}...` : "Empty or non-JSON response."}`
        );
      }

      if (response.status === 0) {
        throw new Error("Request blocked (check CORS or network). Ensure Railway allows requests from your app.");
      }
      if (!response.ok) {
        const err = (data as { error?: string }).error;
        if (response.status === 413) {
          throw new Error("Image too large. Try a smaller photo.");
        }
        throw new Error(err || `Server error (${response.status}). Please try again.`);
      }

      const estimate = data.estimate as { name: string; calories: number; protein: number; carbs: number; fats: number } | undefined;
      if (!estimate || !estimate.name || typeof estimate.calories !== "number") {
        throw new Error("No estimate data received");
      }

      setAiEstimate(estimate);
      setShowAddMeal(true); // Open Add Meal modal so user sees the result and can add it
    } catch (error: any) {
      console.error("AI food analysis failed", error);
      const railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_API_URL || "";
      let msg = error?.message || "Unable to analyze this photo right now. Please try again.";
      if (msg.includes("API key") || msg.includes("OPENAI") || msg.includes("configured")) {
        msg += railwayUrl
          ? "\n\nEnsure OPENAI_API_KEY is set in your Railway project environment variables."
          : "\n\nAdd OPENAI_API_KEY to Vercel env vars, or set NEXT_PUBLIC_RAILWAY_API_URL to use Railway backend.";
      }
      alert(msg);
      setCapturedImage(null);
      setAiEstimate(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const useAiEstimate = () => {
    if (aiEstimate) {
      // Add meal directly from AI estimate
      setMeals([
        ...meals,
        {
          id: Date.now().toString(),
          name: aiEstimate.name,
          calories: aiEstimate.calories,
          protein: aiEstimate.protein,
          carbs: aiEstimate.carbs,
          fats: aiEstimate.fats,
          sugar: 0,
          sodium: 0,
          fiber: 0,
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          imageUrl: capturedImage || undefined,
        },
      ]);
      setNewMeal({ name: "", calories: "", protein: "", carbs: "", fats: "", sugar: "", sodium: "", fiber: "" });
      setShowAddMeal(false);
      setCapturedImage(null);
      setAiEstimate(null);
    }
  };

  const handleAddMeal = () => {
    if (newMeal.name && newMeal.calories) {
      setMeals([
        ...meals,
        {
          id: Date.now().toString(),
          name: newMeal.name,
          calories: parseInt(newMeal.calories),
          protein: parseInt(newMeal.protein) || 0,
          carbs: parseInt(newMeal.carbs) || 0,
          fats: parseInt(newMeal.fats) || 0,
          sugar: parseInt(newMeal.sugar) || 0,
          sodium: parseInt(newMeal.sodium) || 0,
          fiber: parseInt(newMeal.fiber) || 0,
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          imageUrl: capturedImage || undefined,
        },
      ]);
      setNewMeal({ name: "", calories: "", protein: "", carbs: "", fats: "", sugar: "", sodium: "", fiber: "" });
      setShowAddMeal(false);
      setCapturedImage(null);
      setAiEstimate(null);
    }
  };

  const handleAIConsultation = async () => {
    if (!aiConsultationMessage.trim()) return;
    setIsConsultingAI(true);
    setAiConsultationResponse("");
    
    try {
      // Build prompt with nutrition context
      const prompt = `You are a helpful nutrition coach. Answer the user's question about nutrition and fitness.

Current nutrition status:
- Calories: ${totals.calories} / ${dailyGoals.calories}
- Protein: ${totals.protein}g / ${dailyGoals.protein}g
- Carbs: ${totals.carbs}g / ${dailyGoals.carbs}g
- Fats: ${totals.fats}g / ${dailyGoals.fats}g

User question: ${aiConsultationMessage}

Provide a helpful, conversational response.`;

      // Use Railway backend if available, otherwise fallback to local API
      // Note: NEXT_PUBLIC_ env vars are embedded at build time, so redeploy after adding!
      let railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_API_URL || '';
      
      // Ensure Railway URL has https:// protocol
      if (railwayUrl && !railwayUrl.startsWith('http://') && !railwayUrl.startsWith('https://')) {
        railwayUrl = `https://${railwayUrl}`;
      }
      
      // Remove trailing slash to avoid double slashes
      railwayUrl = railwayUrl.replace(/\/+$/, '');
      
      const apiUrl = railwayUrl ? `${railwayUrl}/api/ai` : '/api/ai';
      
      // Debug logging
      console.log('[AI Debug] Railway URL from env:', railwayUrl || 'NOT SET - Need to redeploy Vercel!');
      console.log('[AI Debug] Using API URL:', apiUrl);
      console.log('[AI Debug] Request body:', { prompt: prompt.substring(0, 50) + '...' });
      
      let response;
      try {
        response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        
        console.log('[AI Debug] Response status:', response.status, response.statusText);
        console.log('[AI Debug] Response headers:', Object.fromEntries(response.headers.entries()));
      } catch (fetchError: any) {
        console.error('[AI Debug] Fetch error:', fetchError);
        throw new Error(`Network error: ${fetchError.message}. Check Railway URL: ${railwayUrl || 'NOT SET'}`);
      }

      if (!response.ok) {
        let errorData;
        try {
          const text = await response.text();
          console.error('[AI Debug] Error response text:', text);
          errorData = JSON.parse(text);
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.error('[AI Debug] Error details:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          apiUrl
        });
        
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to get AI response`);
      }

      let data;
      try {
        const text = await response.text();
        console.log('[AI Debug] Response text:', text.substring(0, 200));
        data = JSON.parse(text);
      } catch (e) {
        console.error('[AI Debug] Failed to parse response:', e);
        throw new Error('Invalid response from server');
      }
      
      console.log('[AI Debug] Parsed response data:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.response) {
        setAiConsultationResponse(data.response);
      } else {
        throw new Error("No response from AI");
      }
    } catch (error: any) {
      console.error("AI consultation failed", error);
      console.error("Error details:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      
      // More detailed error message with Railway URL info
      const railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_API_URL || '';
      let errorMsg = "Unable to get AI consultation. Please try again.";
      
      if (error?.message) {
        errorMsg = error.message;
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMsg = `Failed to connect to AI service. ${railwayUrl ? `Railway URL: ${railwayUrl}` : 'Railway URL not set - check Vercel env vars and redeploy.'}`;
      }
      
      // Show detailed error in alert
      const fullError = `Error: ${errorMsg}\n\n` +
        `Railway URL: ${railwayUrl || 'NOT SET'}\n` +
        `API URL: ${railwayUrl ? `${railwayUrl}/api/ai` : '/api/ai'}\n\n` +
        `Check:\n` +
        `1. Railway is online\n` +
        `2. Vercel env var NEXT_PUBLIC_RAILWAY_API_URL is set\n` +
        `3. Vercel has been redeployed after adding env var`;
      
      alert(fullError);
    } finally {
      setIsConsultingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0c1422] to-black text-white px-4 pt-4 pb-28">
      {/* Tab Selection Bar - At the very top */}
      <div className="flex gap-2 mb-5 border-b border-teal-500/30">
        <button
          onClick={() => setActiveTab("macros")}
          className={`flex-1 px-4 py-2 font-semibold transition-all transform hover:scale-105 ${
            activeTab === "macros"
              ? "text-teal-400 border-b-2 border-teal-400 bg-gradient-to-t from-teal-400/10 to-transparent"
              : "text-gray-400 hover:text-teal-300"
          }`}
        >
          Macros
        </button>
        <button
          onClick={() => setActiveTab("recipes")}
          className={`flex-1 px-4 py-2 font-semibold transition-all transform hover:scale-105 ${
            activeTab === "recipes"
              ? "text-teal-400 border-b-2 border-teal-400 bg-gradient-to-t from-teal-400/10 to-transparent"
              : "text-gray-400 hover:text-teal-300"
          }`}
        >
          Recipes
        </button>
        <button
          onClick={() => setActiveTab("favourites")}
          className={`flex-1 px-4 py-2 font-semibold transition-all transform hover:scale-105 ${
            activeTab === "favourites"
              ? "text-teal-400 border-b-2 border-teal-400 bg-gradient-to-t from-teal-400/10 to-transparent"
              : "text-gray-400 hover:text-teal-300"
          }`}
        >
          Favourites
        </button>
      </div>

      {/* HEADER - Only show on Macros tab */}
      {activeTab === "macros" && (
        <div className="mb-5 flex items-start justify-end">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAIConsultation(true)}
              className="px-3 py-1.5 bg-gradient-to-b from-[#0c1422] to-black border border-white/10 text-white rounded-xl text-xs font-medium hover:bg-[rgba(20,30,35,1)] transition-all transform hover:scale-105 flex items-center gap-1.5 shadow-lg"
            >
              <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
              AI Coach
            </button>
            <button
              onClick={() => setShowAddMeal(true)}
              className="px-4 py-2 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black rounded-xl text-xs font-bold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30 flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              Add/Scan
            </button>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === "recipes" ? (
        <RecipesView onAddMeal={(meal) => {
          setNewMeal({
            name: meal.name,
            calories: meal.calories.toString(),
            protein: meal.protein.toString(),
            carbs: meal.carbs.toString(),
            fats: meal.fats.toString(),
            sugar: meal.sugar?.toString() || "",
            sodium: meal.sodium?.toString() || "",
            fiber: meal.fiber?.toString() || "",
          });
          setShowAddMeal(true);
        }} />
      ) : activeTab === "favourites" ? (
        <FavouritesView
          meals={meals}
          onAddMeal={(meal) => {
            setNewMeal({
              name: meal.name,
              calories: meal.calories.toString(),
              protein: meal.protein.toString(),
              carbs: meal.carbs.toString(),
              fats: meal.fats.toString(),
              sugar: "",
              sodium: "",
              fiber: "",
            });
            setShowAddMeal(true);
          }}
        />
      ) : (
        <>
      {/* CALORIES CIRCLE + MACROS - No box, on hard background */}
      <div className="mb-5 flex items-center gap-6">
        {/* Left Macros - 3 macros */}
        <div className="flex-1 space-y-3">
          {[
            { label: "Protein", value: totals.protein, target: dailyGoals.protein, percent: proteinPercentage, color: "from-blue-400 to-cyan-500", unit: "g" },
            { label: "Carbs", value: totals.carbs, target: dailyGoals.carbs, percent: carbsPercentage, color: "from-purple-400 to-pink-500", unit: "g" },
            { label: "Fats", value: totals.fats, target: dailyGoals.fats, percent: fatsPercentage, color: "from-yellow-400 to-orange-500", unit: "g" },
          ].map((m) => (
            <div key={m.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-300">{m.label}</span>
                <span className="text-[9px] text-gray-400">{m.value}/{m.target}{m.unit}</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden shadow-inner">
                <div
                  className={`h-2.5 rounded-full bg-gradient-to-r ${m.color} transition-all duration-500 shadow-lg`}
                  style={{ width: `${m.percent}%` }}
            />
          </div>
            </div>
          ))}
        </div>

        {/* Calories Circle - Center - Much Bigger */}
        <div className="flex-shrink-0 relative flex flex-col items-center">
          <p className="text-[10px] font-semibold text-gray-300 mb-1.5">Calories</p>
          <div className="w-40 h-40 rounded-full border-4 border-teal-500/30 flex items-center justify-center bg-gradient-to-br from-teal-900/20 to-cyan-900/20 shadow-lg">
            <div className="w-36 h-36 rounded-full border-4 border-transparent flex items-center justify-center relative">
              <svg className="w-36 h-36 transform -rotate-90 absolute inset-0">
                <circle
                  cx="72"
                  cy="72"
                  r="66"
                  fill="none"
                  stroke="rgba(20, 241, 217, 0.2)"
                  strokeWidth="8"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="66"
                  fill="none"
                  stroke="url(#caloriesGradient)"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 66}
                  strokeDashoffset={2 * Math.PI * 66 - (2 * Math.PI * 66 * caloriesPercentage) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
                <defs>
                  <linearGradient id="caloriesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14f1d9" />
                    <stop offset="100%" stopColor="#0ddfc8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="text-center z-10">
                <p className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent leading-none">
                  {totals.calories.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">/{dailyGoals.calories.toLocaleString()}</p>
                <p className="text-sm font-bold text-teal-400 mt-1.5">{caloriesPercentage}%</p>
                </div>
              </div>
            </div>
          </div>

        {/* Right Macros - 3 macros */}
        <div className="flex-1 space-y-3">
          {[
            { label: "Sugar", value: totals.sugar, target: dailyGoals.sugar, percent: sugarPercentage, color: "from-pink-400 to-rose-500", unit: "g" },
            { label: "Sodium", value: totals.sodium, target: dailyGoals.sodium, percent: sodiumPercentage, color: "from-indigo-400 to-purple-500", unit: "mg" },
            { label: "Fiber", value: totals.fiber, target: dailyGoals.fiber, percent: fiberPercentage, color: "from-green-400 to-emerald-500", unit: "g" },
          ].map((m) => (
            <div key={m.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-300">{m.label}</span>
                <span className="text-[9px] text-gray-400">{m.value}/{m.target}{m.unit}</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden shadow-inner">
                <div
                  className={`h-2.5 rounded-full bg-gradient-to-r ${m.color} transition-all duration-500 shadow-lg`}
                  style={{ width: `${m.percent}%` }}
                />
            </div>
          </div>
          ))}
        </div>
      </div>

      {/* Meal Analysis - Show when at least one target is hit */}
      {hasTargetHit && (mealAnalysis || isAnalyzingMeals) && (
        <div className="mb-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-2xl p-4 border-2 border-teal-500/30 shadow-lg shadow-teal-500/10">
          <h3 className="text-base font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent mb-3">
            📊 Daily Meal Analysis
          </h3>
          {isAnalyzingMeals ? (
            <div className="text-gray-400 text-sm">Analyzing your meals...</div>
          ) : mealAnalysis ? (
            <div className="text-gray-300 text-sm whitespace-pre-line leading-relaxed">
              {mealAnalysis}
            </div>
          ) : null}
        </div>
      )}

      {/* MEALS BOX - Fun design */}
      <div className="mb-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-2xl p-4 border-2 border-teal-500/30 shadow-lg shadow-teal-500/10 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">Today's Meals</h2>
              <button
              onClick={() => setShowMacroSettings(true)}
              className="text-[10px] text-teal-400 hover:text-teal-300 transition-colors font-medium"
              >
              Edit Goals
              </button>
            </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {meals.length > 0 ? (
              meals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex justify-between items-start bg-gradient-to-br from-[rgba(10,15,20,0.8)] to-[rgba(5,10,15,0.8)] rounded-xl p-3 border border-teal-500/20 hover:border-teal-400/40 transition-all hover:shadow-lg hover:shadow-teal-500/10"
                >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{meal.name}</p>
                    <span className="text-[10px] text-[#9aa7ad]">{meal.time}</span>
              </div>
                          <div className="flex items-center gap-2 text-[10px] text-[#9aa7ad] flex-wrap">
                            <span className="font-semibold text-white">{meal.calories} kcal</span>
                            <span>•</span>
                            <span>Protein: {meal.protein || 0}g</span>
                            <span>Carbs: {meal.carbs || 0}g</span>
                            <span>Fats: {meal.fats || 0}g</span>
                            {(meal.sugar || meal.sodium || meal.fiber) && (
                              <>
                                {meal.sugar > 0 && <span>Sugar: {meal.sugar}g</span>}
                                {meal.sodium > 0 && <span>Sodium: {meal.sodium}mg</span>}
                                {meal.fiber > 0 && <span>Fiber: {meal.fiber}g</span>}
                              </>
                            )}
                          </div>
          </div>
              <button
                  onClick={() => handleDeleteMeal(meal.id)}
                  className="text-white/30 hover:text-white transition-colors ml-2 flex-shrink-0"
              >
                  <X className="w-4 h-4" />
              </button>
            </div>
            ))
          ) : (
            <div className="text-center py-6">
              <div className="text-4xl mb-2 animate-bounce">🍽️</div>
              <p className="text-sm text-gray-400">No meals logged today</p>
              <p className="text-xs text-gray-500 mt-1">Start tracking your nutrition!</p>
          </div>
        )}
                </div>
                      </div>
                      </div>

        </>
      )}

      {/* ADD MEAL MODAL */}
      {showAddMeal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-5 max-w-md w-full border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Add Meal</h2>
                    <button
                      onClick={() => {
                  setShowAddMeal(false);
                  setNewMeal({ name: "", calories: "", protein: "", carbs: "", fats: "", sugar: "", sodium: "", fiber: "" });
                        setCapturedImage(null);
                        setAiEstimate(null);
                      }}
                className="text-white/40 hover:text-white"
                    >
                <X className="w-5 h-5" />
                    </button>
                  </div>

            {aiEstimate && (
              <div className="mb-4 p-3 bg-[#0ddfc8]/10 rounded-lg border border-[#14f1d9]/20">
                <p className="text-sm font-semibold text-[#14f1d9] mb-2">AI Analysis Result</p>
                <p className="text-sm font-medium text-white mb-1">{aiEstimate.name}</p>
                <p className="text-xs text-gray-400 mb-2">
                  {aiEstimate.calories} kcal · P: {aiEstimate.protein}g · C: {aiEstimate.carbs}g · F: {aiEstimate.fats}g
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={useAiEstimate}
                    className="flex-1 py-2 bg-[#14f1d9] text-black rounded-lg text-sm font-semibold hover:bg-[#0ddfc8] transition-colors"
                  >
                    Add to Meals
                  </button>
                  <button
                    onClick={() => {
                      setNewMeal({
                        name: aiEstimate.name,
                        calories: aiEstimate.calories.toString(),
                        protein: aiEstimate.protein.toString(),
                        carbs: aiEstimate.carbs.toString(),
                        fats: aiEstimate.fats.toString(),
                        sugar: "",
                        sodium: "",
                        fiber: "",
                      });
                      setAiEstimate(null);
                    }}
                    className="px-3 py-2 border border-white/20 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Edit
                  </button>
                </div>
          </div>
        )}

            <div className="space-y-3">
                <div>
                <label className="block text-sm font-medium mb-1.5">Food Name</label>
                  <input
                    type="text"
                    value={newMeal.name}
                    onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                  placeholder="e.g., Grilled chicken"
                  />
                </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Calories</label>
                  <input
                    type="number"
                    value={newMeal.calories}
                    onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="200"
                  />
                </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Protein (g)</label>
                    <input
                      type="number"
                      value={newMeal.protein}
                      onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="20"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Carbs (g)</label>
                    <input
                      type="number"
                      value={newMeal.carbs}
                      onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="30"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Fats (g)</label>
                    <input
                      type="number"
                      value={newMeal.fats}
                      onChange={(e) => setNewMeal({ ...newMeal, fats: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="10"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Sugar (g)</label>
                    <input
                      type="number"
                      value={newMeal.sugar}
                      onChange={(e) => setNewMeal({ ...newMeal, sugar: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="5"
                    />
                </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Sodium (mg)</label>
                    <input
                      type="number"
                      value={newMeal.sodium}
                      onChange={(e) => setNewMeal({ ...newMeal, sodium: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="500"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Fiber (g)</label>
                    <input
                      type="number"
                      value={newMeal.fiber}
                      onChange={(e) => setNewMeal({ ...newMeal, fiber: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="5"
                    />
                  </div>
                </div>
              <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                    setFoodToScan("");
                    setShowScanIntro(true);
                      setShowAddMeal(false);
                  }}
                  className="flex-1 py-2.5 bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg font-medium hover:bg-[rgba(20,30,35,1)] transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Camera className="w-4 h-4" />
                  Scan
                </button>
                <button
                  onClick={handleAddMeal}
                  className="flex-1 py-2.5 bg-[#14f1d9] text-black rounded-lg font-medium hover:bg-[#0ddfc8] transition-colors text-sm"
                  >
                  Add Meal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* SCAN INTRO MODAL */}
      {showScanIntro && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-5 max-w-md w-full border border-white/10">
            <h2 className="text-lg font-semibold mb-2">Confirm Food</h2>
            <p className="text-sm text-[#9aa7ad] mb-4">
              Let me know what food you're about to scan so I can label it correctly.
            </p>
            <input
              type="text"
              value={foodToScan}
              onChange={(e) => setFoodToScan(e.target.value)}
              placeholder="e.g., Grilled chicken salad"
              className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm mb-4 focus:outline-none focus:border-[#14f1d9]"
              />
            <div className="flex gap-2">
          <button
            onClick={() => {
                  setShowScanIntro(false);
                  setFoodToScan("");
            }}
                className="flex-1 py-2.5 bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg font-medium hover:bg-[rgba(20,30,35,1)] transition-colors text-sm"
              >
                Cancel
          </button>
          <button
            onClick={() => {
                  setShowScanOptions(true);
                  setShowScanIntro(false);
            }}
                className="flex-1 py-2.5 bg-[#14f1d9] text-black rounded-lg font-medium hover:bg-[#0ddfc8] transition-colors text-sm"
              >
                Continue
          </button>
            </div>
            </div>
        </div>
      )}

      {/* SCAN OPTIONS MODAL */}
      {showScanOptions && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-5 max-w-md w-full border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Scan Food</h2>
              <button
                  onClick={() => {
                  setShowScanOptions(false);
                    setFoodToScan("");
                }}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
          </div>
            <div className="space-y-2">
                <button
                onClick={openCamera}
                className="w-full py-3 bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg font-medium hover:bg-[rgba(20,30,35,1)] transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Camera className="w-4 h-4" />
                Take Photo
                </button>
                <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg font-medium hover:bg-[rgba(20,30,35,1)] transition-colors flex items-center justify-center gap-2 text-sm"
                >
                <Upload className="w-4 h-4" />
                Upload Photo
                </button>
              </div>
            {/* Native iOS camera input - opens native camera UI */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />
            {/* File upload input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
                    </div>
                </div>
              )}
              

      {/* AI ESTIMATE MODAL */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 border border-white/10">
            <p className="text-lg font-semibold mb-2">Analyzing food...</p>
            <p className="text-sm text-[#9aa7ad]">Please wait</p>
        </div>
          </div>
        )}

      {/* AI CONSULTATION MODAL */}
      {showAIConsultation && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-5 max-w-md w-full border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#14f1d9]" />
                <h2 className="text-lg font-semibold">AI Nutrition Coach</h2>
              </div>
                <button
                onClick={() => {
                  setShowAIConsultation(false);
                  setAiConsultationResponse("");
                  setAiConsultationMessage("");
                }}
                className="text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            {!aiConsultationResponse ? (
                    <div>
                <textarea
                  value={aiConsultationMessage}
                  onChange={(e) => setAiConsultationMessage(e.target.value)}
                  placeholder="Ask: How should I change my calorie plan now that I've lost weight?"
                  className="w-full bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg p-3 text-sm mb-3 focus:outline-none focus:border-[#14f1d9] resize-none"
                  rows={4}
                />
                <button
                  onClick={handleAIConsultation}
                  disabled={isConsultingAI || !aiConsultationMessage.trim()}
                  className="w-full py-2.5 bg-[#14f1d9] text-black rounded-lg text-sm font-medium hover:bg-[#0ddfc8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2"
                >
                  {isConsultingAI ? "Consulting AI..." : "Ask AI"}
                </button>
                <div className="text-xs text-gray-400 text-center mb-2">or</div>
                <button
                  onClick={handleManualMealAnalysis}
                  disabled={isAnalyzingMeals || meals.length === 0}
                  className="w-full py-2.5 bg-[rgba(10,15,20,0.6)] border border-teal-500/50 text-teal-400 rounded-lg text-sm font-medium hover:bg-[rgba(10,15,20,0.8)] hover:border-teal-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAnalyzingMeals ? "Analyzing Meals..." : "Analyze Today's Meals"}
                </button>
                  </div>
                ) : (
                        <div>
                <p className="text-sm text-[#9aa7ad] mb-4 whitespace-pre-wrap">{aiConsultationResponse}</p>
                        <button
                          onClick={() => {
                    setAiConsultationResponse("");
                    setAiConsultationMessage("");
                          }}
                  className="w-full py-2.5 bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg text-sm font-medium hover:bg-[rgba(10,15,20,0.8)] transition-colors"
                        >
                  New Question
                        </button>
                      </div>
                )}
            </div>
          </div>
        )}

      {/* MACRO SETTINGS MODAL */}
      {showMacroSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-5 max-w-md w-full border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Edit Macro Goals</h2>
              <button
                onClick={() => setShowMacroSettings(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Calories</label>
                <input
                  type="number"
                  value={macroSettings.calories}
                  onChange={(e) => setMacroSettings({ ...macroSettings, calories: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Protein (g)</label>
                <input
                  type="number"
                  value={macroSettings.protein}
                  onChange={(e) => setMacroSettings({ ...macroSettings, protein: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Carbs (g)</label>
                <input
                  type="number"
                  value={macroSettings.carbs}
                  onChange={(e) => setMacroSettings({ ...macroSettings, carbs: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Fats (g)</label>
                <input
                  type="number"
                  value={macroSettings.fats}
                  onChange={(e) => setMacroSettings({ ...macroSettings, fats: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Sugar (g)</label>
                <input
                  type="number"
                  value={macroSettings.sugar}
                  onChange={(e) => setMacroSettings({ ...macroSettings, sugar: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
            </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Sodium (mg)</label>
                <input
                  type="number"
                  value={macroSettings.sodium}
                  onChange={(e) => setMacroSettings({ ...macroSettings, sodium: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Fiber (g)</label>
                <input
                  type="number"
                  value={macroSettings.fiber}
                  onChange={(e) => setMacroSettings({ ...macroSettings, fiber: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <button
                onClick={() => {
                  setDailyGoals(macroSettings);
                  localStorage.setItem("macroGoals", JSON.stringify(macroSettings));
                  setShowMacroSettings(false);
                }}
                className="w-full py-2.5 bg-[#14f1d9] text-black rounded-lg font-medium hover:bg-[#0ddfc8] transition-colors text-sm"
              >
                Save Goals
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
