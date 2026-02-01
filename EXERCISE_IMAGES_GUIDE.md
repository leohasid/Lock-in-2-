# How to Add Exercise Images

This guide explains how to add images to exercises in your workout app.

## Option 1: Store Images in Public Folder (Recommended)

1. **Create an exercises folder:**
   ```
   public/exercises/
   ```

2. **Add your exercise images:**
   - Name them based on exercise names (e.g., `bench-press.jpg`, `squat.jpg`)
   - Supported formats: `.jpg`, `.png`, `.webp`
   - Recommended size: 400x300px or similar aspect ratio

3. **Update the image mapping:**
   - Open `app/gym/workout/page.tsx`
   - Find the `exerciseImageMap` object in the `getExerciseImage` function
   - Add your exercise name mappings:
   ```typescript
   const exerciseImageMap: Record<string, string> = {
     "bench press": "/exercises/bench-press.jpg",
     "squat": "/exercises/squat.jpg",
     // Add more here
   };
   ```

## Option 2: Add Images Directly to Exercise Data

When creating or editing exercises, you can add an `imageUrl` field:

```typescript
{
  id: "exercise-1",
  name: "Bench Press",
  goalSets: 4,
  goalReps: 10,
  goalWeight: 0,
  imageUrl: "/exercises/bench-press.jpg", // Add this
  sets: []
}
```

## Option 3: Use External URLs

You can also use external image URLs:

```typescript
imageUrl: "https://example.com/images/bench-press.jpg"
```

## Where Images Are Displayed

1. **Exercise Grid (Main Page):** Shows thumbnail images in the 2-column grid
2. **Exercise Modal:** Shows larger image when you click on an exercise

## Adding Images When Creating Exercises

When you add exercises through the workout options page or custom workout modal, you can:

1. **Manually add imageUrl** when creating exercises in code
2. **Update the exercise mapping** to automatically assign images based on exercise name
3. **Add an image upload feature** (requires additional implementation)

## Example: Adding Images to Existing Exercises

To add images to exercises that are already saved in localStorage, you can:

1. Open browser DevTools
2. Go to Application > Local Storage
3. Find `workoutPlan` or `workoutOptions`
4. Edit the JSON to add `imageUrl` to each exercise
5. Or update the code to automatically add images when loading exercises

## Tips

- Use consistent naming: lowercase, hyphenated (e.g., `bench-press.jpg`)
- Optimize images for web (compress them)
- Use WebP format for better compression
- Recommended dimensions: 400x300px or 800x600px
- Keep file sizes under 200KB for faster loading
