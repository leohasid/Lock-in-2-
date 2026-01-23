# Body Image Asset Setup

## Required Image File

You need to add a high-quality body diagram image to replace the SVG illustration.

### File Requirements:
- **Location**: `/public/body-diagram.png` (or `.webp`)
- **Format**: PNG or WebP with transparent background
- **Style**: Semi-realistic male torso, similar to 3D render or AI-generated fitness concept art
- **Quality**: High resolution (at least 240x400px, preferably 480x800px or higher)
- **Content**: Front-facing male torso showing:
  - Head, neck, shoulders
  - Chest and abdominal muscles
  - Arms (biceps, triceps, forearms)
  - Upper body only (or full body if preferred)

### Visual Requirements:
- **Base**: Dark, desaturated tones (#333333 or similar)
- **Highlights**: Red/pink muscle highlights (#ff4444, #ff9999) on:
  - Chest (pectorals)
  - Shoulders (deltoids)
  - Biceps and triceps
  - Abs (six-pack area)
  - Quadriceps (if full body)
- **Lighting**: Directional lighting with highlights and subtle shadows
- **Muscle Definition**: Clear muscle separation and volume
- **Background**: Transparent (PNG with alpha channel)

### Image Sources:
You can:
1. Generate using AI image tools (DALL-E, Midjourney, Stable Diffusion)
2. Use a 3D render from Blender or similar
3. Commission or purchase a fitness concept art asset
4. Use a high-quality stock image (ensure licensing)

### Prompt for AI Generation:
```
Semi-realistic male torso front view, fitness concept art, dark desaturated base color #333333, red/pink muscle highlights on chest shoulders biceps triceps abs, directional lighting with highlights and shadows, clear muscle definition, transparent background, high detail, 3D render style, professional fitness illustration
```

### CSS Effects Applied:
The code automatically applies:
- Glow effects when muscles are highlighted (red/pink drop-shadow)
- Smooth transitions
- Proper scaling and positioning

### Testing:
Once you add the image file, it will automatically appear in:
1. Today's Recommendation section (right side)
2. Body Recovery section (far right)

If the image is missing, a placeholder will show temporarily.
