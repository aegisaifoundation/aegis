/**
 * Premium Minimalist Presentation Deck Engine
 * Designed for B.Tech Project: Distributed Intelligence Infrastructure
 * Controls slide state, keyboard bindings, resizing, and Canvas node-mesh morphing.
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================================================
  // Core Presentation State & Setup
  // ==========================================================================
  
  const state = {
    currentSlide: 1,
    totalSlides: 7,
    isFullscreen: false,
    isOverviewOpen: false,
    controlsTimeout: null,
    // Background animation settings per slide
    slideModes: {
      1: 'title',
      2: 'abstract',
      3: 'problem',
      4: 'solution',
      5: 'implementation',
      6: 'target',
      7: 'conclusion'
    }
  };

  const dom = {
    wrapper: document.querySelector('.presentation-wrapper'),
    container: document.getElementById('presentation'),
    slides: document.querySelectorAll('.slide'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnOverview: document.getElementById('btn-overview'),
    btnFullscreen: document.getElementById('btn-fullscreen'),
    currentSlideNum: document.getElementById('current-slide-num'),
    totalSlidesNum: document.querySelector('.total-slides-num'),
    progressBarFill: document.getElementById('presentation-progress'),
    controls: document.querySelector('.presentation-controls'),
    overviewModal: document.getElementById('overview-modal'),
    btnCloseOverview: document.getElementById('btn-close-overview'),
    overviewGrid: document.querySelector('.overview-grid-container'),
    canvas: document.getElementById('networkCanvas'),
    timelineProgress: document.getElementById('timeline-progress')
  };

  // Set total slide indicator
  if (dom.totalSlidesNum) {
    dom.totalSlidesNum.textContent = String(state.totalSlides).padStart(2, '0');
  }

  // ==========================================================================
  // 16:9 Responsive Scaling System
  // ==========================================================================
  
  const V_WIDTH = 1920;
  const V_HEIGHT = 1080;

  function handleResize() {
    if (!dom.container || !dom.wrapper) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const currentRatio = w / h;
    const targetRatio = V_WIDTH / V_HEIGHT;

    let scale = 1;
    if (currentRatio > targetRatio) {
      // Bound by height
      scale = h / V_HEIGHT;
    } else {
      // Bound by width
      scale = w / V_WIDTH;
    }

    // Set scale transform on container to keep it perfectly 16:9 centered
    dom.container.style.transform = `translate(-50%, -50%) scale(${scale})`;
    
    // Resize Canvas to take up the full screen
    if (dom.canvas) {
      dom.canvas.width = window.innerWidth;
      dom.canvas.height = window.innerHeight;
    }
  }

  window.addEventListener('resize', handleResize);
  // Run once to initialize
  handleResize();

  // ==========================================================================
  // Slide Navigation & State Transitions
  // ==========================================================================
  
  function updateSlideState() {
    // 1. Update slide active classes
    dom.slides.forEach((slide) => {
      const idx = parseInt(slide.getAttribute('data-slide-index'), 10);
      if (idx === state.currentSlide) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    // 2. Update controls text
    if (dom.currentSlideNum) {
      dom.currentSlideNum.textContent = String(state.currentSlide).padStart(2, '0');
    }

    // 3. Update bottom progress bar
    if (dom.progressBarFill) {
      const progressPercent = (state.currentSlide / state.totalSlides) * 100;
      dom.progressBarFill.style.width = `${progressPercent}%`;
    }

    // 4. Update specific slide elements (like timeline progress)
    if (state.currentSlide === 5) {
      setTimeout(() => {
        if (dom.timelineProgress) {
          dom.timelineProgress.style.width = '100%';
        }
      }, 300);
    } else {
      if (dom.timelineProgress) {
        dom.timelineProgress.style.width = '0%';
      }
    }

    // 5. Update Background Canvas Node Mode
    if (window.networkEngine) {
      window.networkEngine.setMode(state.slideModes[state.currentSlide]);
    }
    
    // Save state to hash so page refresh retains active slide
    window.location.hash = `slide=${state.currentSlide}`;
  }

  function goToSlide(index) {
    if (index < 1 || index > state.totalSlides) return;
    state.currentSlide = index;
    updateSlideState();
  }

  function prevSlide() {
    if (state.currentSlide > 1) {
      goToSlide(state.currentSlide - 1);
    }
  }

  function nextSlide() {
    if (state.currentSlide < state.totalSlides) {
      goToSlide(state.currentSlide + 1);
    }
  }

  // Check URL hash for direct slide loading
  function checkHashRoute() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#slide=')) {
      const index = parseInt(hash.replace('#slide=', ''), 10);
      if (!isNaN(index) && index >= 1 && index <= state.totalSlides) {
        goToSlide(index);
      }
    }
  }

  // ==========================================================================
  // Keyboard Bindings & Event Listeners
  // ==========================================================================
  
  window.addEventListener('keydown', (e) => {
    // If overview is open, escape closes it
    if (state.isOverviewOpen && e.key === 'Escape') {
      toggleOverview();
      return;
    }

    switch (e.key) {
      case 'ArrowRight':
      case ' ': // Space bar
      case 'PageDown':
        e.preventDefault();
        nextSlide();
        break;
      case 'ArrowLeft':
      case 'Backspace':
      case 'PageUp':
        e.preventDefault();
        prevSlide();
        break;
      case 'Home':
        e.preventDefault();
        goToSlide(1);
        break;
      case 'End':
        e.preventDefault();
        goToSlide(state.totalSlides);
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      case 'o':
      case 'O':
        toggleOverview();
        break;
    }
  });

  // Slide navigation click bindings
  dom.btnPrev.addEventListener('click', prevSlide);
  dom.btnNext.addEventListener('click', nextSlide);

  // Auto-hide controls bar on idle mouse
  function resetControlsAutohide() {
    dom.controls.classList.remove('autohide');
    clearTimeout(state.controlsTimeout);
    state.controlsTimeout = setTimeout(() => {
      // Don't autohide if overview is open or hover on it
      if (!state.isOverviewOpen) {
        dom.controls.classList.add('autohide');
      }
    }, 3000);
  }
  
  window.addEventListener('mousemove', resetControlsAutohide);
  resetControlsAutohide();

  // ==========================================================================
  // Fullscreen Mode Handler
  // ==========================================================================
  
  function toggleFullscreen() {
    const enterIcon = document.getElementById('fullscreen-svg-enter');
    const exitIcon = document.getElementById('fullscreen-svg-exit');

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => {
          state.isFullscreen = true;
          enterIcon.classList.add('hidden');
          exitIcon.classList.remove('hidden');
        })
        .catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
      document.exitFullscreen()
        .then(() => {
          state.isFullscreen = false;
          enterIcon.classList.remove('hidden');
          exitIcon.classList.add('hidden');
        });
    }
  }

  dom.btnFullscreen.addEventListener('click', toggleFullscreen);

  // Sync fullscreen state if user exits via Esc key instead of UI button
  document.addEventListener('fullscreenchange', () => {
    const enterIcon = document.getElementById('fullscreen-svg-enter');
    const exitIcon = document.getElementById('fullscreen-svg-exit');
    
    if (!document.fullscreenElement) {
      state.isFullscreen = false;
      enterIcon.classList.remove('hidden');
      exitIcon.classList.add('hidden');
    } else {
      state.isFullscreen = true;
      enterIcon.classList.add('hidden');
      exitIcon.classList.remove('hidden');
    }
  });

  // ==========================================================================
  // Slide Overview Grid Modal
  // ==========================================================================
  
  const slidePreviewsData = [
    { num: '01', title: 'Title Slide', desc: 'Connecting Intelligence Across Organizations' },
    { num: '02', title: 'Abstract', desc: 'Secure collaborative AI systems without compromising local control' },
    { num: '03', title: 'Problem Statement', desc: 'Isolated silos, privacy barriers, and lack of shared infrastructure' },
    { num: '04', title: 'Proposed Solution', desc: 'Distributed Intelligence Infrastructure (DII) network architecture' },
    { num: '05', title: 'Implementation Plan', desc: 'Timeline phases: Research, Design, Development, and Evaluation' },
    { num: '06', title: 'Target Users & Impact', desc: 'Grid analysis of potential sectors and positive collaboration output' },
    { num: '07', title: 'Conclusion', desc: 'Summary of contributions, trust validation, and future expansion vision' }
  ];

  function buildOverviewGrid() {
    if (!dom.overviewGrid) return;
    dom.overviewGrid.innerHTML = '';
    
    slidePreviewsData.forEach((slideData, index) => {
      const slideNum = index + 1;
      const previewCard = document.createElement('div');
      previewCard.className = `slide-preview-card ${slideNum === state.currentSlide ? 'active' : ''}`;
      
      previewCard.innerHTML = `
        <span class="preview-num">${slideData.num}</span>
        <div>
          <h4 class="preview-title">${slideData.title}</h4>
          <p class="preview-thumbnail-desc">${slideData.desc}</p>
        </div>
      `;
      
      previewCard.addEventListener('click', () => {
        goToSlide(slideNum);
        toggleOverview();
      });
      
      dom.overviewGrid.appendChild(previewCard);
    });
  }

  function toggleOverview() {
    state.isOverviewOpen = !state.isOverviewOpen;
    if (state.isOverviewOpen) {
      buildOverviewGrid();
      dom.overviewModal.classList.add('active');
      dom.controls.classList.remove('autohide');
    } else {
      dom.overviewModal.classList.remove('active');
    }
  }

  dom.btnOverview.addEventListener('click', toggleOverview);
  dom.btnCloseOverview.addEventListener('click', toggleOverview);
  dom.overviewModal.addEventListener('click', (e) => {
    if (e.target === dom.overviewModal) {
      toggleOverview();
    }
  });

  // ==========================================================================
  // Premium Background Canvas Interactive Particle Engine
  // ==========================================================================
  
  class NetworkAnimationEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.mode = 'title'; // title, abstract, problem, solution, implementation, target, conclusion
      this.particles = [];
      this.dataPackets = [];
      this.maxParticles = 30;
      this.initialized = false;
      this.pulseTimer = 0;
      this.initParticles();
    }

    initParticles() {
      this.particles = [];
      for (let i = 0; i < this.maxParticles; i++) {
        this.particles.push({
          x: Math.random() * V_WIDTH,
          y: Math.random() * V_HEIGHT,
          targetX: Math.random() * V_WIDTH,
          targetY: Math.random() * V_HEIGHT,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 2.5 + 2,
          opacity: Math.random() * 0.4 + 0.3,
          floatOffset: Math.random() * Math.PI * 2,
          floatSpeed: Math.random() * 0.02 + 0.005,
          color: '184, 115, 51', // Copper base
          isCore: false,
          label: '',
          isolated: false,
          group: 0
        });
      }
      this.initialized = true;
    }

    setMode(newMode) {
      this.mode = newMode;
      this.dataPackets = []; // Clear packets on slide transition
      
      const width = V_WIDTH;
      const height = V_HEIGHT;

      switch (newMode) {
        case 'title':
          // Standard distributed slow floating layout
          this.particles.forEach((p, idx) => {
            p.targetX = Math.random() * width;
            p.targetY = Math.random() * height;
            p.opacity = Math.random() * 0.35 + 0.25;
            p.color = '184, 115, 51'; // Copper
            p.radius = Math.random() * 2 + 2;
            p.isCore = false;
            p.isolated = false;
            p.group = 0;
          });
          break;

        case 'abstract':
          // Faint background clusters with one emerald central core representing collaboration
          this.particles.forEach((p, idx) => {
            if (idx === 0) {
              // Central collaboration core right on the abstract graphic card
              p.targetX = 1530; // Centered relative to Card on right
              p.targetY = 540;
              p.isCore = true;
              p.radius = 10;
              p.color = '16, 185, 129'; // Emerald green
              p.opacity = 1.0;
            } else {
              // Outer rings/clusters
              p.isCore = false;
              p.radius = Math.random() * 2 + 1.5;
              p.color = '184, 115, 51';
              p.opacity = Math.random() * 0.25 + 0.15;
              
              const angle = Math.random() * Math.PI * 2;
              const radius = Math.random() * 220 + 80;
              p.targetX = 1530 + Math.cos(angle) * radius;
              p.targetY = 540 + Math.sin(angle) * radius;
            }
          });
          break;

        case 'problem':
          // Slide 3: Split slide. Show 5 isolated organization nodes on the right card.
          // They should float slowly inside the card boundaries, with red boundary outlines.
          // No connections allowed.
          this.particles.forEach((p, idx) => {
            p.isCore = false;
            p.color = '134, 134, 139'; // Muted gray/red tint
            p.radius = 4;
            p.opacity = 0.8;
            p.isolated = true;
            
            // Map 5 principal nodes to the card layout coords
            if (idx === 0) { p.targetX = 1120; p.targetY = 376; p.label = 'Hospital'; }
            else if (idx === 1) { p.targetX = 1680; p.targetY = 352; p.label = 'Research Lab'; }
            else if (idx === 2) { p.targetX = 1360; p.targetY = 520; p.label = 'University'; }
            else if (idx === 3) { p.targetX = 1160; p.targetY = 664; p.label = 'Industry'; }
            else if (idx === 4) { p.targetX = 1640; p.targetY = 673; p.label = 'Government'; }
            else {
              // Drift remaining nodes to edges or hide
              p.targetX = Math.random() * 300 + 50; // Keep on left edge
              p.targetY = Math.random() * height;
              p.opacity = 0.05; // Faint background float
            }
          });
          break;

        case 'solution':
          // Slide 4: Same 5 nodes reconnecting via a central hub inside the right card.
          // Nodes change color back to bright copper and connect to an emerald core.
          this.particles.forEach((p, idx) => {
            p.isolated = false;
            
            if (idx === 5) {
              // Central infrastructure core node
              p.targetX = 1400;
              p.targetY = 520;
              p.isCore = true;
              p.radius = 8;
              p.color = '16, 185, 129'; // Emerald
              p.opacity = 1.0;
            } else if (idx === 0) { p.targetX = 1120; p.targetY = 376; p.color = '184, 115, 51'; p.radius = 5; p.opacity = 0.9; }
            else if (idx === 1) { p.targetX = 1680; p.targetY = 352; p.color = '184, 115, 51'; p.radius = 5; p.opacity = 0.9; }
            else if (idx === 2) { p.targetX = 1360; p.targetY = 520; p.color = '184, 115, 51'; p.radius = 5; p.opacity = 0.9; }
            else if (idx === 3) { p.targetX = 1160; p.targetY = 664; p.color = '184, 115, 51'; p.radius = 5; p.opacity = 0.9; }
            else if (idx === 4) { p.targetX = 1640; p.targetY = 673; p.color = '184, 115, 51'; p.radius = 5; p.opacity = 0.9; }
            else {
              // Faint background particles
              p.targetX = Math.random() * width;
              p.targetY = Math.random() * height;
              p.opacity = 0.06;
              p.isCore = false;
            }
          });
          break;

        case 'implementation':
          // Horizontal alignment matching the 4 timeline stage positions
          // Faint nodes float right behind the center of each of the 4 circles
          this.particles.forEach((p, idx) => {
            p.isCore = false;
            p.isolated = false;
            p.color = '184, 115, 51';
            p.radius = 3;
            
            if (idx === 0) { p.targetX = 240; p.targetY = 325; p.opacity = 0.45; }
            else if (idx === 1) { p.targetX = 720; p.targetY = 325; p.opacity = 0.45; }
            else if (idx === 2) { p.targetX = 1200; p.targetY = 325; p.opacity = 0.45; }
            else if (idx === 3) { p.targetX = 1680; p.targetY = 325; p.opacity = 0.45; }
            else {
              // Other particles form a thin straight horizontal axis line network
              p.targetX = Math.random() * (V_WIDTH - 200) + 100;
              p.targetY = 325;
              p.opacity = 0.08;
            }
          });
          break;

        case 'target':
          // Dual clusters matching target users (left) and impact list (right)
          // With bottom infographic connector pulse stream
          this.particles.forEach((p, idx) => {
            p.isCore = false;
            p.isolated = false;
            
            if (idx < 8) {
              // Left half cluster (users area background)
              p.targetX = Math.random() * 400 + 200;
              p.targetY = Math.random() * 300 + 300;
              p.color = '184, 115, 51'; // Copper
              p.opacity = 0.12;
            } else if (idx < 16) {
              // Right half cluster (impact area background)
              p.targetX = Math.random() * 400 + 1300;
              p.targetY = Math.random() * 300 + 300;
              p.color = '16, 185, 129'; // Emerald
              p.opacity = 0.12;
            } else {
              // Floating low horizontal particles
              p.targetX = Math.random() * V_WIDTH;
              p.targetY = 900;
              p.opacity = 0.08;
            }
          });
          break;

        case 'conclusion':
          // Expansion view. Many particles drifting outwards, forming a wide network.
          this.particles.forEach((p, idx) => {
            p.isCore = false;
            p.isolated = false;
            p.color = '184, 115, 51';
            p.radius = Math.random() * 2 + 1.5;
            p.opacity = Math.random() * 0.4 + 0.2;
            
            // Set targets moving away from center
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 700 + 300;
            p.targetX = (V_WIDTH / 2) + Math.cos(angle) * dist;
            p.targetY = (V_HEIGHT / 2) + Math.sin(angle) * dist;
          });
          break;
      }
    }

    draw() {
      const ctx = this.ctx;
      const canvas = this.canvas;
      
      // Setup high DPI canvas scale drawing bounds
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(canvas.width / V_WIDTH, canvas.height / V_HEIGHT);

      const width = V_WIDTH;
      const height = V_HEIGHT;

      // Update particle positions (lerp to target layout + local float wave)
      this.particles.forEach((p, i) => {
        p.floatOffset += p.floatSpeed;
        const waveX = Math.sin(p.floatOffset) * 12;
        const waveY = Math.cos(p.floatOffset) * 12;
        
        // Easing interpolation morph
        p.x += (p.targetX - p.x) * 0.06;
        p.y += (p.targetY - p.y) * 0.06;

        // Actual drawing coordinates include local floating movement
        const drawX = p.x + waveX;
        const drawY = p.y + waveY;

        // Render glow halo behind core nodes
        if (p.isCore) {
          const glowRad = p.radius * 3.5;
          const gradient = ctx.createRadialGradient(drawX, drawY, p.radius, drawX, drawY, glowRad);
          gradient.addColorStop(0, `rgba(${p.color}, 0.45)`);
          gradient.addColorStop(0.5, `rgba(${p.color}, 0.15)`);
          gradient.addColorStop(1, `rgba(${p.color}, 0)`);
          ctx.beginPath();
          ctx.arc(drawX, drawY, glowRad, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Draw node dot
        ctx.beginPath();
        ctx.arc(drawX, drawY, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx.fill();

        // Draw isolated boundary rings for Slide 3 (Problem)
        if (this.mode === 'problem' && p.label) {
          ctx.beginPath();
          ctx.arc(drawX, drawY, p.radius + 15, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Draw connection lines between nodes depending on modes
      ctx.lineWidth = 1;
      
      if (this.mode === 'title' || this.mode === 'conclusion') {
        const threshold = this.mode === 'title' ? 300 : 250;
        for (let i = 0; i < this.particles.length; i++) {
          for (let j = i + 1; j < this.particles.length; j++) {
            const p1 = this.particles[i];
            const p2 = this.particles[j];
            
            const dx = (p1.x + Math.sin(p1.floatOffset) * 12) - (p2.x + Math.sin(p2.floatOffset) * 12);
            const dy = (p1.y + Math.cos(p1.floatOffset) * 12) - (p2.y + Math.cos(p2.floatOffset) * 12);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < threshold) {
              const alpha = (1 - (dist / threshold)) * 0.15;
              ctx.strokeStyle = `rgba(184, 115, 51, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(p1.x + Math.sin(p1.floatOffset) * 12, p1.y + Math.cos(p1.floatOffset) * 12);
              ctx.lineTo(p2.x + Math.sin(p2.floatOffset) * 12, p2.y + Math.cos(p2.floatOffset) * 12);
              ctx.stroke();
            }
          }
        }
      } 
      else if (this.mode === 'abstract') {
        // Core node index is 0
        const core = this.particles[0];
        const coreX = core.x + Math.sin(core.floatOffset) * 12;
        const coreY = core.y + Math.cos(core.floatOffset) * 12;

        this.particles.forEach((p, idx) => {
          if (idx !== 0 && p.opacity > 0.08) {
            const px = p.x + Math.sin(p.floatOffset) * 12;
            const py = p.y + Math.cos(p.floatOffset) * 12;
            
            const dx = px - coreX;
            const dy = py - coreY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 400) {
              // Faint lines to represent bridge
              const alpha = (1 - (dist / 400)) * 0.08;
              ctx.strokeStyle = `rgba(184, 115, 51, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(px, py);
              ctx.lineTo(coreX, coreY);
              ctx.stroke();
            }
          }
        });
      }
      else if (this.mode === 'solution') {
        // Core is index 5. Nodes are 0, 1, 2, 3, 4.
        const core = this.particles[5];
        const coreX = core.x + Math.sin(core.floatOffset) * 12;
        const coreY = core.y + Math.cos(core.floatOffset) * 12;

        // Draw connections
        for (let i = 0; i < 5; i++) {
          const p = this.particles[i];
          const px = p.x + Math.sin(p.floatOffset) * 12;
          const py = p.y + Math.cos(p.floatOffset) * 12;
          
          ctx.strokeStyle = 'rgba(184, 115, 51, 0.2)';
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(coreX, coreY);
          ctx.stroke();
        }

        // Periodically spawn packet flows towards the hub
        this.pulseTimer++;
        if (this.pulseTimer > 40) {
          this.pulseTimer = 0;
          // Pick a random node from 0 to 4
          const sourceIdx = Math.floor(Math.random() * 5);
          const sourceNode = this.particles[sourceIdx];
          const dir = Math.random() > 0.5 ? 1 : -1; // 1 = outward to node, -1 = inward to core
          
          this.dataPackets.push({
            nodeIdx: sourceIdx,
            progress: dir === 1 ? 0 : 1, // start at core (0) or node (1)
            speed: 0.015,
            dir: dir,
            color: dir === 1 ? '16, 185, 129' : '184, 115, 51' // Emerald out, Copper in
          });
        }

        // Draw and update active packets (iterate backwards to handle splices safely)
        for (let pkIdx = this.dataPackets.length - 1; pkIdx >= 0; pkIdx--) {
          const pk = this.dataPackets[pkIdx];
          const p = this.particles[pk.nodeIdx];
          const px = p.x + Math.sin(p.floatOffset) * 12;
          const py = p.y + Math.cos(p.floatOffset) * 12;

          // Interpolate packet position on connector line
          const pkX = px * pk.progress + coreX * (1 - pk.progress);
          const pkY = py * pk.progress + coreY * (1 - pk.progress);

          // Draw small glowing pulse packet
          ctx.beginPath();
          ctx.arc(pkX, pkY, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgb(${pk.color})`;
          ctx.fill();

          // Move packet
          pk.progress += pk.speed * pk.dir;

          // Remove packet if finished
          if (pk.progress > 1.0 || pk.progress < 0.0) {
            this.dataPackets.splice(pkIdx, 1);
          }
        }
      }
      else if (this.mode === 'implementation') {
        // Thin glowing timeline progress line
        ctx.strokeStyle = 'rgba(184, 115, 51, 0.15)';
        ctx.beginPath();
        ctx.moveTo(240, 325);
        ctx.lineTo(1680, 325);
        ctx.stroke();
      }

      ctx.restore();
    }

    animate() {
      this.draw();
      requestAnimationFrame(() => this.animate());
    }
  }

  // Instantiate and run the Canvas engine
  const canvasEngine = new NetworkAnimationEngine(dom.canvas);
  window.networkEngine = canvasEngine;
  canvasEngine.animate();

  // ==========================================================================
  // Initialization Check
  // ==========================================================================
  
  // Load initially active slide
  checkHashRoute();
  updateSlideState();
  
  // Listen for external back/forward browser navigation
  window.addEventListener('hashchange', checkHashRoute);

});
