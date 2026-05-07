/**
 * RecipeShare – Frontend Application Logic
 * =========================================
 * Handles media uploads, recipe CRUD, and dynamic UI rendering.
 */

(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------
  const API_BASE = '/api'; // Azure Functions proxy or local dev

  // ---------------------------------------------------------------------------
  // DOM References
  // ---------------------------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const uploadZone      = $('#uploadZone');
  const fileInput        = $('#fileInput');
  const uploadPreview    = $('#uploadPreview');
  const uploadProgress   = $('#uploadProgress');
  const progressFill     = $('#uploadProgressFill');
  const recipeForm       = $('#recipeForm');
  const recipeTitle      = $('#recipeTitle');
  const recipeDescription = $('#recipeDescription');
  const addStepBtn       = $('#addStepBtn');
  const stepsList        = $('#stepsList');
  const submitBtn        = $('#submitRecipeBtn');
  const recipeGrid       = $('#recipeGrid');
  const feedLoading      = $('#feedLoading');
  const feedEmpty        = $('#feedEmpty');
  const toastContainer   = $('#toastContainer');
  const navToggle        = $('#navToggle');
  const navLinks         = $('#navLinks');

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let uploadedMediaUrl = '';
  let uploadedMediaType = '';   // 'image' or 'video'
  let stepCounter = 0;

  // ---------------------------------------------------------------------------
  // Toast Notification System
  // ---------------------------------------------------------------------------
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
  }

  // ---------------------------------------------------------------------------
  // Mobile Navigation Toggle
  // ---------------------------------------------------------------------------
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // ---------------------------------------------------------------------------
  // Drag & Drop Upload Zone
  // ---------------------------------------------------------------------------
  function initUploadZone() {
    if (!uploadZone || !fileInput) return;

    // Click to browse
    uploadZone.addEventListener('click', (e) => {
      if (e.target === fileInput) return;
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
    });

    // Drag events
    ['dragenter', 'dragover'].forEach((evt) => {
      uploadZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach((evt) => {
      uploadZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('drag-over');
      });
    });

    uploadZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) handleFile(files[0]);
    });
  }

  function handleFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      showToast('Unsupported file type. Use JPG, PNG, MP4, or MOV.', 'error');
      return;
    }

    // Validate size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      showToast('File too large. Maximum size is 100MB.', 'error');
      return;
    }

    // Show preview
    showPreview(file);

    // Upload to backend
    uploadMedia(file);
  }

  function showPreview(file) {
    uploadPreview.innerHTML = '';
    const isVideo = file.type.startsWith('video/');
    uploadedMediaType = isVideo ? 'video' : 'image';

    if (isVideo) {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.controls = true;
      video.muted = true;
      uploadPreview.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = 'Upload preview';
      uploadPreview.appendChild(img);
    }

    const nameEl = document.createElement('p');
    nameEl.className = 'upload-zone__filename';
    nameEl.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
    uploadPreview.appendChild(nameEl);
  }

  // ---------------------------------------------------------------------------
  // Upload Media to /api/upload
  // ---------------------------------------------------------------------------
  async function uploadMedia(file) {
    const formData = new FormData();
    formData.append('file', file);

    uploadProgress.classList.add('active');
    progressFill.style.width = '0%';

    try {
      // Simulate progress (XHR would give real progress)
      const progressInterval = simulateProgress();

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      progressFill.style.width = '100%';

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await response.json();
      uploadedMediaUrl = data.url;
      showToast('Media uploaded successfully!', 'success');

      setTimeout(() => {
        uploadProgress.classList.remove('active');
      }, 1000);
    } catch (error) {
      progressFill.style.width = '0%';
      uploadProgress.classList.remove('active');
      showToast(`Upload failed: ${error.message}`, 'error');
      console.error('Upload error:', error);
    }
  }

  function simulateProgress() {
    let progress = 0;
    return setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      progressFill.style.width = `${progress}%`;
    }, 300);
  }

  // ---------------------------------------------------------------------------
  // Steps Builder
  // ---------------------------------------------------------------------------
  function initStepsBuilder() {
    if (!addStepBtn || !stepsList) return;

    // Add initial step
    addStep();

    addStepBtn.addEventListener('click', () => addStep());
  }

  function addStep() {
    stepCounter++;
    const stepEl = document.createElement('div');
    stepEl.className = 'step-item';
    stepEl.dataset.step = stepCounter;
    stepEl.innerHTML = `
      <div class="step-item__number">${stepCounter}</div>
      <div class="step-item__content">
        <textarea placeholder="Describe this step..." rows="2"></textarea>
        <input type="text" placeholder="Image URL (optional)" />
      </div>
      <button type="button" class="step-item__remove" title="Remove step">&times;</button>
    `;

    stepEl.querySelector('.step-item__remove').addEventListener('click', () => {
      stepEl.remove();
      renumberSteps();
    });

    stepsList.appendChild(stepEl);
  }

  function renumberSteps() {
    const items = stepsList.querySelectorAll('.step-item');
    items.forEach((item, idx) => {
      item.querySelector('.step-item__number').textContent = idx + 1;
    });
  }

  function getStepsData() {
    const items = stepsList.querySelectorAll('.step-item');
    const steps = [];
    items.forEach((item, idx) => {
      const instructions = item.querySelector('textarea').value.trim();
      const imageUrl = item.querySelector('input').value.trim();
      if (instructions) {
        steps.push({
          stepNumber: idx + 1,
          instructions,
          imageUrl,
        });
      }
    });
    return steps;
  }

  // ---------------------------------------------------------------------------
  // Submit Recipe to /api/recipes (POST)
  // ---------------------------------------------------------------------------
  function initRecipeForm() {
    if (!recipeForm) return;

    recipeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitRecipe();
    });
  }

  async function submitRecipe() {
    const title = recipeTitle.value.trim();
    const description = recipeDescription.value.trim();
    const steps = getStepsData();

    // Validation
    if (!title) {
      showToast('Please enter a recipe title.', 'warning');
      recipeTitle.focus();
      return;
    }

    if (steps.length === 0) {
      showToast('Add at least one step with instructions.', 'warning');
      return;
    }

    const payload = {
      userId: 1,
      title,
      description,
      videoUrl: uploadedMediaType === 'video' ? uploadedMediaUrl : '',
      steps: steps.map((s) => ({
        ...s,
        imageUrl: s.imageUrl || (uploadedMediaType === 'image' ? uploadedMediaUrl : ''),
      })),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Publishing...';

    try {
      const response = await fetch(`${API_BASE}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create recipe');
      }

      const data = await response.json();
      showToast(`Recipe "${data.title}" published!`, 'success');

      // Reset form
      recipeForm.reset();
      uploadPreview.innerHTML = '';
      uploadedMediaUrl = '';
      uploadedMediaType = '';
      stepsList.innerHTML = '';
      stepCounter = 0;
      addStep();

      // Reload feed
      loadRecipes();
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
      console.error('Submit error:', error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '🚀 Publish Recipe';
    }
  }

  // ---------------------------------------------------------------------------
  // Load Recipes from /api/recipes (GET)
  // ---------------------------------------------------------------------------
  async function loadRecipes() {
    if (!recipeGrid) return;

    feedLoading.style.display = 'flex';
    feedEmpty.style.display = 'none';
    recipeGrid.innerHTML = '';

    try {
      const response = await fetch(`${API_BASE}/recipes`);

      if (!response.ok) throw new Error('Failed to load recipes');

      const recipes = await response.json();
      feedLoading.style.display = 'none';

      if (recipes.length === 0) {
        feedEmpty.style.display = 'block';
        return;
      }

      recipes.forEach((recipe, index) => {
        const card = createRecipeCard(recipe, index);
        recipeGrid.appendChild(card);
      });
    } catch (error) {
      feedLoading.style.display = 'none';
      feedEmpty.style.display = 'block';
      console.error('Load recipes error:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // Dynamic Recipe Card Rendering
  // ---------------------------------------------------------------------------
  function createRecipeCard(recipe, index) {
    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.style.animationDelay = `${index * 0.1}s`;

    const mediaHtml = getMediaHtml(recipe);
    const authorInitial = recipe.user?.username?.[0]?.toUpperCase() || '?';
    const authorName = recipe.user?.username || 'Anonymous';
    const stepsCount = recipe.steps?.length || 0;
    const dateStr = recipe.createdAt
      ? new Date(recipe.createdAt).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })
      : '';

    card.innerHTML = `
      <div class="recipe-card__media">
        ${mediaHtml}
        <span class="recipe-card__media-badge">${recipe.videoUrl ? '🎬 Video' : '📸 Photo'}</span>
      </div>
      <div class="recipe-card__body">
        <h3 class="recipe-card__title">${escapeHtml(recipe.title)}</h3>
        <p class="recipe-card__desc">${escapeHtml(recipe.description || 'No description provided.')}</p>
        <div class="recipe-card__meta">
          <div class="recipe-card__author">
            <span class="recipe-card__author-avatar">${authorInitial}</span>
            <span>${escapeHtml(authorName)}</span>
          </div>
          <span class="recipe-card__steps-count">${stepsCount} step${stepsCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `;

    return card;
  }

  function getMediaHtml(recipe) {
    if (recipe.videoUrl) {
      return `<video src="${escapeHtml(recipe.videoUrl)}" muted preload="metadata"></video>`;
    }

    // Check first step for an image
    const firstImage = recipe.steps?.find((s) => s.imageUrl)?.imageUrl;
    if (firstImage) {
      return `<img src="${escapeHtml(firstImage)}" alt="${escapeHtml(recipe.title)}" loading="lazy" />`;
    }

    // Placeholder
    return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem;">🍳</div>`;
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Initialise
  // ---------------------------------------------------------------------------
  function init() {
    initUploadZone();
    initStepsBuilder();
    initRecipeForm();
    loadRecipes();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
