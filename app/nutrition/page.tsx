"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { Upload, Camera, X, Settings, MessageSquare, Sparkles, ChevronRight, Plus, Clock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toLocalDateString } from "@/lib/date-utils";
import { recommendedRecipes, recipeCardImageSrc, type Recipe } from "@/lib/recommended-recipes";

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

function RecipeDetailModal({
  recipe,
  onClose,
  onAddMeal,
  favouriteIds,
  onToggleFavourite,
}: {
  recipe: Recipe | null;
  onClose: () => void;
  onAddMeal: (meal: Recipe) => void;
  favouriteIds: string[];
  onToggleFavourite: (id: string) => void;
}) {
  if (!recipe) return null;
  const img = recipeCardImageSrc(recipe.id);
  const ingredients = recipe.ingredients ?? [];
  const steps = recipe.steps ?? [];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Close recipe"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] bg-[#0c1422] border border-white/8 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex-shrink-0 h-44 sm:h-48 bg-gray-800 relative">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={recipe.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-5xl bg-gradient-to-br from-gray-700 to-gray-900">
              🍽️
            </div>
          )}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onToggleFavourite(recipe.id)}
              className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm ${
                favouriteIds.includes(recipe.id) ? "bg-red-500/90 text-white" : "bg-black/50 text-white hover:bg-black/70"
              }`}
              aria-label="Favourite"
            >
              <svg className="w-4 h-4" fill={favouriteIds.includes(recipe.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3 space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-400/90 mb-0.5">{recipe.category}</p>
            <h2 className="text-xl font-bold text-white leading-tight">{recipe.name}</h2>
            {recipe.prepTime && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {recipe.prepTime}
              </p>
            )}
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">{recipe.description}</p>
          </div>

          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wide mb-2">Nutrition (per serving)</h3>
            <p className="text-[10px] text-gray-500 mb-2">
              Calories match protein, carbs, and fat (4 kcal/g protein &amp; carbs, 9 kcal/g fat).
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white/5 border border-white/8 px-3 py-2">
                <span className="text-gray-500 block">Calories</span>
                <span className="text-lg font-bold text-teal-400 tabular-nums">{recipe.calories} kcal</span>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/8 px-3 py-2">
                <span className="text-gray-500 block">Protein</span>
                <span className="text-lg font-bold text-white tabular-nums">{recipe.protein} g</span>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/8 px-3 py-2">
                <span className="text-gray-500 block">Carbs</span>
                <span className="text-lg font-bold text-white tabular-nums">{recipe.carbs} g</span>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/8 px-3 py-2">
                <span className="text-gray-500 block">Fat</span>
                <span className="text-lg font-bold text-white tabular-nums">{recipe.fats} g</span>
              </div>
              {recipe.sugar != null && (
                <div className="rounded-lg bg-white/5 border border-white/8 px-3 py-2">
                  <span className="text-gray-500 block">Sugar</span>
                  <span className="text-lg font-bold text-white tabular-nums">{recipe.sugar} g</span>
                </div>
              )}
              {recipe.fiber != null && (
                <div className="rounded-lg bg-white/5 border border-white/8 px-3 py-2">
                  <span className="text-gray-500 block">Fiber</span>
                  <span className="text-lg font-bold text-white tabular-nums">{recipe.fiber} g</span>
                </div>
              )}
              {recipe.sodium != null && (
                <div className="rounded-lg bg-white/5 border border-white/8 px-3 py-2 col-span-2">
                  <span className="text-gray-500 block">Sodium</span>
                  <span className="text-lg font-bold text-white tabular-nums">{recipe.sodium} mg</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wide mb-2">Ingredients</h3>
            {ingredients.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1.5 marker:text-teal-500">
                {ingredients.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No ingredient list for this recipe.</p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wide mb-2">Directions</h3>
            {steps.length > 0 ? (
              <ol className="list-decimal list-inside text-sm text-gray-300 space-y-2 marker:text-teal-500 marker:font-semibold">
                {steps.map((line, i) => (
                  <li key={i} className="leading-relaxed pl-0.5">
                    <span className="-ml-1">{line}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-gray-500">No steps for this recipe.</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onAddMeal(recipe);
                onClose();
              }}
              className="flex-1 py-3 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black rounded-xl font-bold text-sm shadow-lg shadow-teal-500/30"
            >
              Add to log
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl border border-white/20 text-gray-300 text-sm font-medium hover:bg-white/5"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Recipes View Component - Delivery App Style
function RecipesView({ onAddMeal }: { onAddMeal: (meal: Recipe) => void }) {
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);
  const [favourites, setFavourites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("favouriteRecipes");
    return stored ? JSON.parse(stored) : [];
  });

  const scrollCategory = (category: string, direction: "left" | "right") => {
    const el = scrollRefs.current[category];
    if (el) el.scrollBy({ left: direction === "right" ? 240 : -240, behavior: "smooth" });
  };

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
      <RecipeDetailModal
        recipe={detailRecipe}
        onClose={() => setDetailRecipe(null)}
        onAddMeal={onAddMeal}
        favouriteIds={favourites}
        onToggleFavourite={toggleFavourite}
      />
      {categories.map((category) => {
        const categoryRecipes = getRecipesByCategory(category);
        if (categoryRecipes.length === 0) return null;

        return (
          <div key={category} className="space-y-2">
            {/* Category Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{category}</h2>
              <div className="flex gap-1">
                <button onClick={() => scrollCategory(category, "left")} className="w-7 h-7 rounded-full bg-teal-400/20 flex items-center justify-center text-teal-400 hover:bg-teal-400/30 transition-colors">
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <button onClick={() => scrollCategory(category, "right")} className="w-7 h-7 rounded-full bg-teal-400/20 flex items-center justify-center text-teal-400 hover:bg-teal-400/30 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horizontal Scrollable Recipe Cards */}
            <div ref={(el) => { scrollRefs.current[category] = el; }} className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {categoryRecipes.map((recipe) => {
                const cardImage = recipeCardImageSrc(recipe.id);
                return (
                <div
                  key={recipe.id}
                  className="flex-shrink-0 w-[220px] bg-[#0c1422] rounded-lg overflow-hidden border border-white/8 hover:border-teal-400/40 transition-all"
                >
                  {/* Recipe photo or placeholder */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailRecipe(recipe)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetailRecipe(recipe);
                      }
                    }}
                    className="w-full h-28 bg-gradient-to-br from-gray-700 to-gray-900 relative overflow-hidden cursor-pointer group"
                  >
                    {cardImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cardImage}
                        alt={recipe.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl">🍽️</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavourite(recipe.id);
                      }}
                      className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors z-10 ${
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
                    <button
                      type="button"
                      onClick={() => setDetailRecipe(recipe)}
                      className="text-left w-full"
                    >
                      <h3 className="text-sm font-bold text-white mb-1 hover:text-teal-200 transition-colors">{recipe.name}</h3>
                      <p className="text-[10px] text-gray-400 mb-2 line-clamp-2">{recipe.description}</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDetailRecipe(recipe)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-1.5 text-[9px] text-gray-300 mb-1">
                        <span className="font-semibold text-teal-400">{recipe.calories} kcal</span>
                        <span>•</span>
                        <span>P: {recipe.protein}g</span>
                        <span>•</span>
                        <span>C: {recipe.carbs}g</span>
                        <span>•</span>
                        <span>F: {recipe.fats}g</span>
                      </div>
                      <p className="text-[9px] text-teal-400/80 font-medium mb-2">Tap for full recipe &amp; macros</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => onAddMeal(recipe)}
                      className="w-full py-2 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black rounded-lg font-bold text-xs transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30"
                    >
                      Add
                    </button>
                  </div>
                </div>
              );
              })}
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

  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);

  const toggleFavourite = (recipeId: string) => {
    const updated = favourites.includes(recipeId)
      ? favourites.filter((id) => id !== recipeId)
      : [...favourites, recipeId];
    setFavourites(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("favouriteRecipes", JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-4">
      <RecipeDetailModal
        recipe={detailRecipe}
        onClose={() => setDetailRecipe(null)}
        onAddMeal={onAddMeal}
        favouriteIds={favourites}
        onToggleFavourite={toggleFavourite}
      />
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
              className="bg-[#0c1422] rounded-xl p-4 border border-white/8"
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setDetailRecipe(recipe)}
                  className="flex-1 min-w-0 text-left"
                >
                  <h3 className="text-base font-bold text-white mb-1 hover:text-teal-200 transition-colors">{recipe.name}</h3>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-3">{recipe.description}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-300">
                    <span className="font-semibold text-teal-400">{recipe.calories} kcal</span>
                    <span>•</span>
                    <span>P: {recipe.protein}g</span>
                    <span>C: {recipe.carbs}g</span>
                    <span>F: {recipe.fats}g</span>
                  </div>
                  <p className="text-[10px] text-teal-400/80 font-medium mt-1.5">Tap for details &amp; recipe</p>
                </button>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onAddMeal(recipe)}
                    className="py-2 px-3 bg-teal-400 hover:bg-teal-500 text-black text-xs font-bold rounded-lg transition-colors"
                  >
                    Add
                  </button>
                  {recipe.id.startsWith("personal-") && (
                    <button
                      type="button"
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
          <div className="bg-[#0c1422] rounded-2xl p-6 w-full max-w-md border border-white/8">
            <h3 className="text-lg font-bold text-white mb-4">Add personal recipe</h3>
            <div className="space-y-3">
              <input
                value={newRecipe.name}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Recipe name *"
                className="w-full bg-black/40 border border-white/8 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400"
              />
              <input
                type="number"
                value={newRecipe.calories}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, calories: e.target.value }))}
                placeholder="Calories *"
                className="w-full bg-black/40 border border-white/8 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={newRecipe.protein}
                  onChange={(e) => setNewRecipe(prev => ({ ...prev, protein: e.target.value }))}
                  placeholder="Protein (g)"
                  className="w-full bg-black/40 border border-white/8 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400 text-sm"
                />
                <input
                  type="number"
                  value={newRecipe.carbs}
                  onChange={(e) => setNewRecipe(prev => ({ ...prev, carbs: e.target.value }))}
                  placeholder="Carbs (g)"
                  className="w-full bg-black/40 border border-white/8 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400 text-sm"
                />
                <input
                  type="number"
                  value={newRecipe.fats}
                  onChange={(e) => setNewRecipe(prev => ({ ...prev, fats: e.target.value }))}
                  placeholder="Fats (g)"
                  className="w-full bg-black/40 border border-white/8 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400 text-sm"
                />
              </div>
              <input
                value={newRecipe.description}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description (optional)"
                className="w-full bg-black/40 border border-white/8 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400"
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
  const [showScanOptions, setShowScanOptions] = useState(false);
  const [scanStep, setScanStep] = useState<1 | 2>(1);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [foodToScan, setFoodToScan] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAIConsultation, setShowAIConsultation] = useState(false);
  const [aiConsultationMessage, setAiConsultationMessage] = useState("");
  const [aiConsultationResponse, setAiConsultationResponse] = useState("");
  const [isConsultingAI, setIsConsultingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<"macros" | "recipes" | "favourites">("macros");
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

  // Listen for native scan upload started (show Analyzing only when image is picked)
  useEffect(() => {
    const uploadStartedHandler = () => setIsAnalyzing(true);
    window.addEventListener("mogifiScanUploadStarted" as any, uploadStartedHandler);
    return () => window.removeEventListener("mogifiScanUploadStarted" as any, uploadStartedHandler);
  }, []);

  // Listen for native scan complete (clear Analyzing state)
  useEffect(() => {
    const completeHandler = () => setIsAnalyzing(false);
    window.addEventListener("mogifiScanComplete" as any, completeHandler);
    return () => window.removeEventListener("mogifiScanComplete" as any, completeHandler);
  }, []);

  // Listen for meal added from native iOS food scan (bypasses WebView to avoid load failed)
  useEffect(() => {
    const handler = (e: CustomEvent<{ name: string; calories: number; protein: number; carbs: number; fats: number }>) => {
      const m = e.detail;
      if (!m?.name || typeof m.calories !== "number") return;
      const meal: Meal = {
        id: Date.now().toString(),
        name: m.name,
        calories: m.calories,
        protein: m.protein || 0,
        carbs: m.carbs || 0,
        fats: m.fats || 0,
        sugar: 0,
        sodium: 0,
        fiber: 0,
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      };
      setMeals((prev) => [...prev, meal]);
    };
    window.addEventListener("mogifiMealAdded" as any, handler as any);
    return () => window.removeEventListener("mogifiMealAdded" as any, handler as any);
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

  // Food scan: default = web only (`analyzeFood` → Railway or `/api/food-estimate` on Vercel).
  // Set NEXT_PUBLIC_USE_NATIVE_FOOD_SCAN=true in Vercel only if you want the iOS Swift camera bridge.
  const useNativeFoodScan =
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_USE_NATIVE_FOOD_SCAN === "true" &&
    !!(window as any).webkit?.messageHandlers?.mogifiFoodScan;

  const openCamera = () => {
    if (useNativeFoodScan) {
      triggerNativeFoodScan();
    } else {
      cameraInputRef.current?.click();
    }
  };

  const triggerNativeFoodScan = (preferLibrary = false) => {
    let railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_API_URL || "";
    if (railwayUrl && !railwayUrl.startsWith("http")) railwayUrl = `https://${railwayUrl}`;
    railwayUrl = railwayUrl.replace(/\/+$/, "");
    const apiUrl = railwayUrl ? `${railwayUrl}/api/food-estimate` : `${typeof window !== "undefined" ? window.location.origin : ""}/api/food-estimate`;
    const callbackId = `scan_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    (window as any).__mogifiFoodScanCallbacks = (window as any).__mogifiFoodScanCallbacks || {};
    (window as any).__mogifiFoodScanCallbacks[callbackId] = (result: { estimate?: { name: string; calories: number; protein: number; carbs: number; fats: number }; error?: string }) => {
      setIsAnalyzing(false);
      if (result.error) {
        alert(result.error);
        return;
      }
      if (result.estimate) {
        const e = result.estimate;
        setCapturedImage(null);
        setNewMeal({
          name: e.name || "",
          calories: String(e.calories ?? ""),
          protein: String(e.protein ?? ""),
          carbs: String(e.carbs ?? ""),
          fats: String(e.fats ?? ""),
          sugar: "",
          sodium: "",
          fiber: "",
        });
        setShowAddMeal(true);
      }
    };
    setIsAnalyzing(true);
    setShowScanOptions(false);
    (window as any).webkit.messageHandlers.mogifiFoodScan.postMessage({
      action: "scan",
      apiUrl,
      label: foodToScan || "Unknown meal",
      callbackId,
      preferLibrary,
    });
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setShowScanOptions(false);
      setIsAnalyzing(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        analyzeFood(imageData);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setShowScanOptions(false);
      setIsAnalyzing(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        analyzeFood(imageData);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
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
        // Use small size for mobile to avoid WebView memory crash
        compressedImage = await compressImage(imageData, 600, 0.5);
        
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: compressedImage,
          label: foodToScan || "Unknown meal",
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

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
        if (response.status === 502 || response.status === 504) {
          throw new Error("The server took too long to respond. Please try again—you can use a smaller photo or try in a moment.");
        }
        throw new Error(err || `Server error (${response.status}). Please try again.`);
      }

      const estimate = data.estimate as { name: string; calories: number; protein: number; carbs: number; fats: number } | undefined;
      if (!estimate || !estimate.name || typeof estimate.calories !== "number") {
        throw new Error("No estimate data received");
      }

      setCapturedImage(compressedImage);
      setNewMeal({
        name: estimate.name || "",
        calories: String(estimate.calories ?? ""),
        protein: String(estimate.protein ?? ""),
        carbs: String(estimate.carbs ?? ""),
        fats: String(estimate.fats ?? ""),
        sugar: "",
        sodium: "",
        fiber: "",
      });
      setShowAddMeal(true);
    } catch (error: any) {
      console.error("AI food analysis failed", error);
      const railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_API_URL || "";
      let msg = error?.message || "Unable to analyze this photo right now. Please try again.";
      if (error?.name === "AbortError") {
        msg = "Request timed out. Check your connection and try again. If using Vercel free tier, the 10s limit may be too short—consider using Railway for the API.";
      } else if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Load failed")) {
        msg = "Network error. Check your internet connection and try again.";
      } else if (msg.includes("API key") || msg.includes("OPENAI") || msg.includes("configured")) {
        msg += railwayUrl
          ? "\n\nEnsure OPENAI_API_KEY is set in your Railway project environment variables."
          : "\n\nAdd OPENAI_API_KEY to Vercel env vars, or set NEXT_PUBLIC_RAILWAY_API_URL to use Railway backend.";
      }
      alert(msg);
      setCapturedImage(null);
    } finally {
      setIsAnalyzing(false);
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
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="max-w-md mx-auto px-4 pt-6">
      {/* Tab Selection Bar - At the very top */}
      <div className="flex gap-1 mb-5 bg-white/5 border border-white/8 rounded-2xl p-1">
        <button
          onClick={() => setActiveTab("macros")}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${
            activeTab === "macros" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Macros
        </button>
        <button
          onClick={() => setActiveTab("recipes")}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${
            activeTab === "recipes" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Recipes
        </button>
        <button
          onClick={() => setActiveTab("favourites")}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${
            activeTab === "favourites" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
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
              className="px-3 py-1.5 bg-[#0c1422] border border-white/8 text-white rounded-xl text-xs font-medium hover:bg-white/10 transition-all transform hover:scale-105 flex items-center gap-1.5 shadow-lg"
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
              sugar: meal.sugar?.toString() ?? "",
              sodium: meal.sodium?.toString() ?? "",
              fiber: meal.fiber?.toString() ?? "",
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
          <div className="w-40 h-40 rounded-full border-4 border-white/8 flex items-center justify-center bg-gradient-to-br from-teal-900/20 to-cyan-900/20 shadow-lg">
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
                <p className="text-3xl font-bold text-white leading-none">
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
            { label: "Fibre", value: totals.fiber, target: dailyGoals.fiber, percent: fiberPercentage, color: "from-green-400 to-emerald-500", unit: "g" },
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
        <div className="mb-4 bg-[#0c1422] rounded-2xl p-4 border border-white/8 shadow-lg shadow-teal-500/10">
          <h3 className="text-base font-bold text-white mb-3">
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
      <div className="mb-4 bg-[#0c1422] rounded-2xl p-4 border border-white/8 shadow-lg shadow-teal-500/10 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white">Today's Meals</h2>
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
                  className="flex justify-between items-start bg-[#0c1422] rounded-xl p-3 border border-white/8 hover:border-teal-400/40 transition-all hover:shadow-lg hover:shadow-teal-500/10"
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
                                {meal.fiber > 0 && <span>Fibre: {meal.fiber}g</span>}
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
          <div className="bg-[#0c1422] rounded-2xl p-5 max-w-md w-full border border-white/8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Add Meal</h2>
                    <button
                      onClick={() => {
                  setShowAddMeal(false);
                  setNewMeal({ name: "", calories: "", protein: "", carbs: "", fats: "", sugar: "", sodium: "", fiber: "" });
                        setCapturedImage(null);
                      }}
                className="text-white/40 hover:text-white"
                    >
                <X className="w-5 h-5" />
                    </button>
                  </div>

            <p className="text-xs text-gray-500 mb-3 -mt-1">
              Use Scan to auto-fill from a photo, or type below. Adjust any values, then Add Meal.
            </p>

            <div className="space-y-3">
                <div>
                <label className="block text-sm font-medium mb-1.5">Food Name</label>
                  <input
                    type="text"
                    value={newMeal.name}
                    onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
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
                    className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="200"
                  />
                </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Protein (g)</label>
                    <input
                      type="number"
                      value={newMeal.protein}
                      onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })}
                    className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="20"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Carbs (g)</label>
                    <input
                      type="number"
                      value={newMeal.carbs}
                      onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })}
                    className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="30"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Fats (g)</label>
                    <input
                      type="number"
                      value={newMeal.fats}
                      onChange={(e) => setNewMeal({ ...newMeal, fats: e.target.value })}
                    className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="10"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Sugar (g)</label>
                    <input
                      type="number"
                      value={newMeal.sugar}
                      onChange={(e) => setNewMeal({ ...newMeal, sugar: e.target.value })}
                    className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="5"
                    />
                </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Sodium (mg)</label>
                    <input
                      type="number"
                      value={newMeal.sodium}
                      onChange={(e) => setNewMeal({ ...newMeal, sodium: e.target.value })}
                    className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="500"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium mb-1.5">Fibre (g)</label>
                    <input
                      type="number"
                      value={newMeal.fiber}
                      onChange={(e) => setNewMeal({ ...newMeal, fiber: e.target.value })}
                    className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                    placeholder="5"
                    />
                  </div>
                </div>
              <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setFoodToScan("");
                      setScanStep(1);
                      setShowScanOptions(true);
                      setShowAddMeal(false);
                    }}
                  className="flex-1 py-2.5 bg-white/5 border border-white/8 rounded-lg font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm"
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
      {/* SCAN OPTIONS MODAL */}
      {showScanOptions && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c1422] rounded-2xl p-5 max-w-md w-full border border-white/8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{scanStep === 1 ? "What are you eating?" : "Scan Food"}</h2>
              <button
                onClick={() => {
                  setShowScanOptions(false);
                  setFoodToScan("");
                  setScanStep(1);
                }}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {scanStep === 1 ? (
              <>
                <input
                  type="text"
                  value={foodToScan}
                  onChange={(e) => setFoodToScan(e.target.value)}
                  placeholder="e.g. chicken salad, pizza, oatmeal..."
                  className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm mb-4 focus:outline-none focus:border-[#14f1d9]"
                />
                <button
                  onClick={() => setScanStep(2)}
                  className="w-full py-3 bg-[#14f1d9] text-black rounded-lg font-medium hover:bg-[#0ddfc8] transition-colors text-sm"
                >
                  Continue
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setScanStep(1)}
                  className="w-full py-2 text-sm text-gray-400 hover:text-white mb-3"
                >
                  ← Back
                </button>
                <div className="space-y-2">
                <button
                  onClick={openCamera}
                  className="w-full py-3 bg-white/5 border border-white/8 rounded-lg font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
                {useNativeFoodScan ? (
                  <button
                    onClick={() => triggerNativeFoodScan(true)}
                    className="w-full py-3 bg-white/5 border border-white/8 rounded-lg font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Photo
                  </button>
                ) : (
                  <label className="w-full py-3 bg-white/5 border border-white/8 rounded-lg font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer block">
                    <Upload className="w-4 h-4" />
                    Upload Photo
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
              </>
            )}
            {/* Native iOS camera input - opens native camera UI */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />
                    </div>
                </div>
              )}
              

      {/* AI ESTIMATE MODAL */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#0c1422] rounded-2xl p-8 border border-white/8 max-w-sm">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full border-2 border-[#14f1d9]/50 border-t-[#14f1d9] animate-spin" />
            </div>
            <p className="text-lg font-semibold mb-1 text-center">Analyzing food</p>
            <p className="text-sm text-[#9aa7ad] text-center">AI is analyzing your food for macros...</p>
          </div>
        </div>
      )}

      {/* AI CONSULTATION MODAL */}
      {showAIConsultation && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c1422] rounded-2xl p-5 max-w-md w-full border border-white/8 max-h-[90vh] overflow-y-auto">
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
                  className="w-full bg-[rgba(10,15,20,0.6)] border border-white/8 rounded-lg p-3 text-sm mb-3 focus:outline-none focus:border-[#14f1d9] resize-none"
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
                  className="w-full py-2.5 bg-[rgba(10,15,20,0.6)] border border-white/8 rounded-lg text-sm font-medium hover:bg-[rgba(10,15,20,0.8)] transition-colors"
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
          <div className="bg-[#0c1422] rounded-2xl p-5 max-w-md w-full border border-white/8 max-h-[90vh] overflow-y-auto">
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
                  className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Protein (g)</label>
                <input
                  type="number"
                  value={macroSettings.protein}
                  onChange={(e) => setMacroSettings({ ...macroSettings, protein: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Carbs (g)</label>
                <input
                  type="number"
                  value={macroSettings.carbs}
                  onChange={(e) => setMacroSettings({ ...macroSettings, carbs: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Fats (g)</label>
                <input
                  type="number"
                  value={macroSettings.fats}
                  onChange={(e) => setMacroSettings({ ...macroSettings, fats: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Sugar (g)</label>
                <input
                  type="number"
                  value={macroSettings.sugar}
                  onChange={(e) => setMacroSettings({ ...macroSettings, sugar: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
            </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Sodium (mg)</label>
                <input
                  type="number"
                  value={macroSettings.sodium}
                  onChange={(e) => setMacroSettings({ ...macroSettings, sodium: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Fibre (g)</label>
                <input
                  type="number"
                  value={macroSettings.fiber}
                  onChange={(e) => setMacroSettings({ ...macroSettings, fiber: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/8 rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#14f1d9]"
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
    </div>
  );
}
