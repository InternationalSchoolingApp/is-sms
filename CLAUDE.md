@AGENTS.md

# Image Optimization and Next.js Image Component Rules

These rules apply to the entire `is-sms` project, including all existing and newly created pages, components and features.

## 1. Prefer Next.js Image Component

- Always prefer `Image` from `next/image` instead of normal HTML `<img>` wherever appropriate.
- Avoid introducing new ESLint warnings related to `@next/next/no-img-element`.
- Do not blindly replace every `<img>` without understanding its purpose.

## 2. Image Dimensions and Layout

- Provide appropriate `width` and `height` for images.
- Use `fill` only when the parent container has proper positioning and dimensions.
- Use `sizes` for responsive images where appropriate.
- Preserve existing aspect ratios, object-fit, border radius, alignment and dimensions.
- Prevent layout shifts and image distortion.

## 3. External and Dynamic Images

- Configure trusted external domains using `images.remotePatterns` in the existing Next.js configuration.
- Safely handle dynamic image URLs received from APIs and databases.
- Handle null, undefined, empty and invalid image sources.
- Maintain existing fallback image functionality.
- Do not introduce overly permissive external image configurations.

## 4. Loading and Performance

- Use lazy loading for below-the-fold images.
- Prioritize only genuinely critical above-the-fold images.
- Avoid unnecessary preloading.
- Use blur placeholders only when valid blur data is available.
- Follow the installed Next.js version's supported Image API and recommendations.

## 5. Special Cases

Evaluate SVG, Base64, Blob URLs, canvas-generated images, animated GIFs, CSS background images and third-party integrations individually.

Normal `<img>` can remain where technically justified. Document the reason and use targeted ESLint suppression only when necessary.

Never globally disable `@next/next/no-img-element`.

## 6. Mandatory Development Workflow

Before implementing image-related changes:

1. Audit existing image implementations.
2. Read the relevant Next.js documentation from `node_modules/next/dist/docs/` before writing code.
3. Check existing project conventions and image configurations.
4. Prepare a safe implementation plan.
5. Implement without unrelated refactoring.
6. Verify UI, responsive behavior and image loading.
7. Run ESLint and production build checks.

## 7. Preserve Existing Functionality

Never change existing UI design, API behavior, authentication, enrollment workflow, dashboard functionality or routing as part of image optimization unless explicitly requested.

## 8. Project-Wide Enforcement

Whenever creating or modifying image-related code in the future, automatically follow these rules without requiring the user to repeat them.
