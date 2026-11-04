(function () {
  const config = window.NETWORK_CONFIG;
  const data = window.TEXT_NETWORK;
  const stage = document.getElementById("stage");
  const world = document.getElementById("world");
  const debugPanel = document.getElementById("debug");

  document.documentElement.style.setProperty("--bg", data.design.background);
  document.documentElement.style.setProperty("--focus-opacity", config.focusOpacity);
  document.documentElement.style.setProperty(
    "--lyrics-inactive",
    config.lyricsInactiveOpacity
  );
  document.documentElement.style.setProperty(
    "--lyrics-scale",
    config.lyricsActiveScale
  );
  world.style.width = data.design.width + "px";
  world.style.height = data.design.height + "px";

  const pointer = { x: 0, y: 0, active: false };
  const params = new URLSearchParams(window.location.search);
  const forcedLayout = params.get("layout");

  let activeId = null;
  let activeLyricsItem = null;
  let lyricsClock = 0;
  let lastPinchDistance = null;

  const items = data.texts.map(buildItem);
  const byId = {};
  items.forEach(function (item) {
    byId[item.data.id] = item;
  });

  function buildItem(entry) {
    const category = data.categories[entry.category];
    const el = document.createElement("div");
    el.className = "text";
    el.dataset.id = entry.id;
    el.style.width = entry.width + "px";
    el.style.fontFamily = category.fontFamily;
    el.style.fontSize = category.fontSize + "px";
    el.style.fontWeight = String(category.fontWeight);
    el.style.lineHeight = category.lineHeight + "px";
    el.style.letterSpacing = category.letterSpacing;
    el.style.color = category.color;
    el.style.textTransform = category.textTransform;
    el.style.zIndex = String(entry.z || 1);
    el.style.setProperty("--rot", (entry.rotation || 0) + "deg");

    const item = {
      data: entry,
      el: el,
      width: entry.width,
      height: 0,
      x: entry.overlap.x,
      y: entry.overlap.y,
      lyrics: null,
      lyricIndex: 0
    };

    if (entry.lyrics) {
      el.classList.add("has-lyrics");
      buildLyrics(item, entry.lines || entry.content.split("\n"));
    } else {
      el.textContent = entry.content;
    }

    world.appendChild(el);
    return item;
  }

  function buildLyrics(item, lines) {
    const viewport = document.createElement("div");
    viewport.className = "lyrics";

    const track = document.createElement("div");
    track.className = "lyrics__track";

    const els = [];
    const order = [];

    lines.forEach(function (text, index) {
      const line = document.createElement("div");
      line.className = "lyric";
      if (text.trim()) {
        line.textContent = text;
        order.push(index);
      } else {
        line.classList.add("is-blank");
        line.textContent = "\u00a0";
      }
      track.appendChild(line);
      els.push(line);
    });

    viewport.appendChild(track);
    item.el.appendChild(viewport);

    item.lyrics = {
      viewport: viewport,
      track: track,
      els: els,
      order: order
    };

    item.lyricIndex = order.length ? order[0] : 0;
    paintLyric(item);
  }

  function paintLyric(item) {
    const lyrics = item.lyrics;
    if (!lyrics) {
      return;
    }

    for (let i = 0; i < lyrics.els.length; i += 1) {
      lyrics.els[i].classList.toggle("is-active", i === item.lyricIndex);
    }

    if (item.el.classList.contains("is-lyrics")) {
      centerLyric(item);
    }
  }

  function centerLyric(item) {
    const lyrics = item.lyrics;
    const line = lyrics.els[item.lyricIndex];
    if (!line) {
      return;
    }
    const offset = line.offsetTop + line.offsetHeight / 2;
    const height = lyrics.viewport.clientHeight;
    lyrics.track.style.transform =
      "translate3d(0, " + (height / 2 - offset) + "px, 0)";
  }

  function enterLyrics(item) {
    const track = item.lyrics.track;
    track.style.transition = "none";
    item.el.classList.add("is-lyrics");
    paintLyric(item);
    centerLyric(item);
    void track.offsetHeight;
    track.style.transition = "";
  }

  function advanceLyric(item) {
    const order = item.lyrics.order;
    if (!order.length) {
      return;
    }
    const position = order.indexOf(item.lyricIndex);
    item.lyricIndex = order[(position + 1) % order.length];
    paintLyric(item);
  }

  const camera = {
    vw: 0,
    vh: 0,
    zoom: 1,
    x: 0,
    y: 0,
    targetZoom: 1,
    targetX: 0,
    targetY: 0,
    fitZoom: 1,
    minZoom: 1,
    maxZoom: 1,
    homeZoom: 0,
    homeX: 0,
    homeY: 0,
    setViewport: function (vw, vh, reset) {
      const previousCenter = this.vw
        ? this.screenToWorld(this.vw / 2, this.vh / 2, true)
        : null;

      this.vw = vw;
      this.vh = vh;
      this.fitZoom =
        Math.min(vw / data.design.width, vh / data.design.height) *
        config.fitPadding;
      this.minZoom = this.fitZoom * config.minZoomFactor;
      this.maxZoom = Math.max(config.maxZoom, this.fitZoom * 1.9);

      if (reset || !previousCenter) {
        this.zoom = this.targetZoom = this.fitZoom;
        this.x = this.targetX = (vw - data.design.width * this.zoom) / 2;
        this.y = this.targetY = (vh - data.design.height * this.zoom) / 2;
        return;
      }

      this.targetZoom = clamp(this.targetZoom, this.minZoom, this.maxZoom);
      this.targetX = vw / 2 - previousCenter.x * this.targetZoom;
      this.targetY = vh / 2 - previousCenter.y * this.targetZoom;
      this.constrain();
    },
    // Encuadre inicial: ajusta el conjunto de textos (no el lienzo vacío),
    // así la red ocupa el cuadro desde el principio. `amount` permite medir
    // también el layout legible para el modo de desarrollo ?layout=read.
    computeHome: function (amount) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        const cx = lerp(item.data.overlap.x, item.data.readable.x, amount);
        const cy = lerp(item.data.overlap.y, item.data.readable.y, amount);
        minX = Math.min(minX, cx - item.width / 2);
        maxX = Math.max(maxX, cx + item.width / 2);
        minY = Math.min(minY, cy - item.height / 2);
        maxY = Math.max(maxY, cy + item.height / 2);
      }

      if (!items.length) {
        return;
      }

      const boxWidth = Math.max(maxX - minX, 1);
      const boxHeight = Math.max(maxY - minY, 1);
      const zoom = Math.min(
        this.vw / (boxWidth / config.fitPadding),
        this.vh / (boxHeight / config.fitPadding)
      );

      this.homeZoom = clamp(zoom, this.fitZoom, this.maxZoom);
      this.homeX = this.vw / 2 - ((minX + maxX) / 2) * this.homeZoom;
      this.homeY = this.vh / 2 - ((minY + maxY) / 2) * this.homeZoom;

      const width = data.design.width * this.homeZoom;
      const height = data.design.height * this.homeZoom;
      this.homeX =
        width <= this.vw
          ? (this.vw - width) / 2
          : clamp(this.homeX, this.vw - width, 0);
      this.homeY =
        height <= this.vh
          ? (this.vh - height) / 2
          : clamp(this.homeY, this.vh - height, 0);
    },
    reset: function (instant) {
      if (this.homeZoom) {
        this.targetZoom = this.homeZoom;
        this.targetX = this.homeX;
        this.targetY = this.homeY;
      } else {
        this.targetZoom = this.fitZoom;
        this.targetX = (this.vw - data.design.width * this.fitZoom) / 2;
        this.targetY = (this.vh - data.design.height * this.fitZoom) / 2;
      }

      if (instant) {
        this.zoom = this.targetZoom;
        this.x = this.targetX;
        this.y = this.targetY;
      }
    },
    screenToWorld: function (sx, sy, useTarget) {
      const zoom = useTarget ? this.targetZoom : this.zoom;
      const x = useTarget ? this.targetX : this.x;
      const y = useTarget ? this.targetY : this.y;
      return {
        x: (sx - x) / zoom,
        y: (sy - y) / zoom
      };
    },
    zoomAt: function (sx, sy, factor) {
      const anchor = this.screenToWorld(sx, sy, true);
      this.targetZoom = clamp(
        this.targetZoom * factor,
        this.minZoom,
        this.maxZoom
      );
      this.targetX = sx - anchor.x * this.targetZoom;
      this.targetY = sy - anchor.y * this.targetZoom;
      this.constrain();
    },
    constrain: function () {
      const width = data.design.width * this.targetZoom;
      const height = data.design.height * this.targetZoom;
      this.targetX =
        width <= this.vw
          ? (this.vw - width) / 2
          : clamp(this.targetX, this.vw - width, 0);
      this.targetY =
        height <= this.vh
          ? (this.vh - height) / 2
          : clamp(this.targetY, this.vh - height, 0);
    },
    update: function (dt) {
      const k = 1 - Math.pow(1 - config.smoothing, dt * 60);
      this.zoom += (this.targetZoom - this.zoom) * k;
      this.x += (this.targetX - this.x) * k;
      this.y += (this.targetY - this.y) * k;
    },
    apply: function () {
      world.style.transform =
        "translate3d(" +
        this.x +
        "px, " +
        this.y +
        "px, 0) scale(" +
        this.zoom +
        ")";
    }
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function separationAmount() {
    if (forcedLayout === "read") {
      return 1;
    }
    if (forcedLayout === "overlap") {
      return 0;
    }
    const home = camera.homeZoom || camera.fitZoom;
    const span = Math.log(camera.maxZoom / home);
    const t =
      span > 0
        ? clamp(Math.log(camera.zoom / home) / span, 0, 1)
        : 1;
    return smoothstep(config.separationStart, config.separationEnd, t);
  }

  function positionItems(amount) {
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      item.x = lerp(item.data.overlap.x, item.data.readable.x, amount);
      item.y = lerp(item.data.overlap.y, item.data.readable.y, amount);
      item.el.style.setProperty("--tx", item.x + "px");
      item.el.style.setProperty("--ty", item.y + "px");
    }
  }

  function setFocus(id) {
    if (activeId === id) {
      return;
    }

    activeId = id;
    activeLyricsItem = null;
    lyricsClock = 0;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const isActive = item.data.id === id;

      item.el.classList.toggle("is-focus", isActive);
      item.el.classList.toggle("is-dim", id !== null && !isActive);

      if (isActive && item.lyrics) {
        enterLyrics(item);
        activeLyricsItem = item;
      } else {
        item.el.classList.remove("is-lyrics");
      }
    }
  }

  function updateFocus(amount) {
    if (!pointer.active || amount < config.focusStart) {
      setFocus(null);
      return;
    }

    let best = null;
    let bestDistance = Infinity;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const centerX = camera.x + item.x * camera.zoom;
      const centerY = camera.y + item.y * camera.zoom;
      const halfWidth = (item.width * camera.zoom) / 2;
      const halfHeight = (item.height * camera.zoom) / 2;
      const dx = Math.max(Math.abs(pointer.x - centerX) - halfWidth, 0);
      const dy = Math.max(Math.abs(pointer.y - centerY) - halfHeight, 0);
      const distance = Math.hypot(dx, dy);

      if (distance < bestDistance) {
        bestDistance = distance;
        best = item;
      }
    }

    setFocus(best && bestDistance <= config.focusRadius ? best.data.id : null);
  }

  function updateLyrics(dt) {
    if (!activeLyricsItem) {
      return;
    }

    const step = Math.max(config.lyricsInterval, 0.1);
    lyricsClock += dt;

    while (lyricsClock >= step) {
      lyricsClock -= step;
      advanceLyric(activeLyricsItem);
    }
  }

  function wheelDelta(event) {
    const mode = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? camera.vh : 1;
    return clamp(event.deltaY * mode, -160, 160);
  }

  stage.addEventListener(
    "wheel",
    function (event) {
      event.preventDefault();
      const delta = wheelDelta(event);
      if (!delta) {
        return;
      }
      const sensitivity = event.ctrlKey
        ? config.pinchSensitivity
        : config.wheelSensitivity;
      camera.zoomAt(event.clientX, event.clientY, Math.exp(-delta * sensitivity));
    },
    { passive: false }
  );

  stage.addEventListener(
    "touchmove",
    function (event) {
      if (event.touches.length !== 2) {
        lastPinchDistance = null;
        return;
      }

      event.preventDefault();
      const a = event.touches[0];
      const b = event.touches[1];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const midX = (a.clientX + b.clientX) / 2;
      const midY = (a.clientY + b.clientY) / 2;

      if (lastPinchDistance && distance > 0) {
        camera.zoomAt(midX, midY, distance / lastPinchDistance);
      }
      lastPinchDistance = distance;
    },
    { passive: false }
  );

  stage.addEventListener("touchend", function () {
    lastPinchDistance = null;
  });

  window.addEventListener("pointermove", function (event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  });

  document.addEventListener("pointerleave", function () {
    pointer.active = false;
  });

  window.addEventListener("blur", function () {
    pointer.active = false;
  });

  window.addEventListener("resize", function () {
    const wasHome =
      camera.homeZoom > 0 &&
      Math.abs(camera.targetZoom - camera.homeZoom) < 0.001;
    camera.setViewport(window.innerWidth, window.innerHeight, false);
    camera.computeHome(forcedLayout === "read" ? 1 : 0);
    if (wasHome) {
      camera.reset(true);
    }
  });

  let lastTime = 0;

  function frame(time) {
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0.016;
    lastTime = time;

    camera.update(dt);
    camera.apply();
    const amount = separationAmount();
    positionItems(amount);
    updateFocus(amount);
    updateLyrics(dt);

    requestAnimationFrame(frame);
  }

  function setupDebug() {
    const fields = [
      { key: "maxZoom", min: 1.5, max: 6, step: 0.1, digits: 1 },
      { key: "wheelSensitivity", min: 0.0004, max: 0.004, step: 0.0001, digits: 4 },
      { key: "separationStart", min: 0, max: 0.8, step: 0.01, digits: 2 },
      { key: "separationEnd", min: 0.2, max: 1, step: 0.01, digits: 2 },
      { key: "focusRadius", min: 40, max: 420, step: 10, digits: 0 },
      { key: "focusOpacity", min: 0, max: 0.9, step: 0.02, digits: 2 },
      { key: "smoothing", min: 0.04, max: 0.4, step: 0.01, digits: 2 }
    ];

    fields.forEach(function (field) {
      const input = document.getElementById("in-" + field.key);
      const output = document.getElementById("out-" + field.key);
      input.value = String(config[field.key]);
      output.value = String(config[field.key]);

      input.addEventListener("input", function () {
        const value = Number(input.value);
        config[field.key] = value;
        output.value = value.toFixed(field.digits);

        if (field.key === "maxZoom") {
          camera.maxZoom = Math.max(config.maxZoom, camera.fitZoom * 1.9);
          camera.targetZoom = clamp(camera.targetZoom, camera.minZoom, camera.maxZoom);
        }

        if (field.key === "separationStart" && value >= config.separationEnd) {
          config.separationEnd = Math.min(value + 0.02, 1);
          const endInput = document.getElementById("in-separationEnd");
          endInput.value = String(config.separationEnd);
          document.getElementById("out-separationEnd").value =
            config.separationEnd.toFixed(2);
        }

        if (field.key === "separationEnd" && value <= config.separationStart) {
          config.separationStart = Math.max(value - 0.02, 0);
          const startInput = document.getElementById("in-separationStart");
          startInput.value = String(config.separationStart);
          document.getElementById("out-separationStart").value =
            config.separationStart.toFixed(2);
        }

        if (field.key === "focusOpacity") {
          document.documentElement.style.setProperty(
            "--focus-opacity",
            config.focusOpacity
          );
        }
      });
    });

    document.getElementById("reset-view").addEventListener("click", function () {
      camera.reset();
    });

    const debugVisible = params.get("debug") === "1";
    debugPanel.hidden = !debugVisible;

    window.addEventListener("keydown", function (event) {
      if (
        event.key.toLowerCase() === "d" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        debugPanel.hidden = !debugPanel.hidden;
      }
    });
  }

  function ready() {
    if (document.fonts && document.fonts.ready) {
      return Promise.race([
        document.fonts.ready,
        new Promise(function (resolve) {
          window.setTimeout(resolve, 2500);
        })
      ]);
    }
    return Promise.resolve();
  }

  ready().then(function () {
    for (let i = 0; i < items.length; i += 1) {
      items[i].height = items[i].el.offsetHeight;
    }

    camera.setViewport(window.innerWidth, window.innerHeight, true);
    camera.computeHome(forcedLayout === "read" ? 1 : 0);

    const zoomParam = params.get("zoom");
    if (zoomParam) {
      const zoom =
        zoomParam === "max"
          ? camera.maxZoom
          : clamp(Number(zoomParam), camera.minZoom, camera.maxZoom);
      const centerX = Number(params.get("x") || data.design.width / 2);
      const centerY = Number(params.get("y") || data.design.height / 2);
      camera.zoom = camera.targetZoom = zoom;
      camera.x = camera.targetX = camera.vw / 2 - centerX * zoom;
      camera.y = camera.targetY = camera.vh / 2 - centerY * zoom;
      camera.constrain();
    } else {
      camera.reset(true);
    }

    positionItems(separationAmount());
    camera.apply();

    const focusId = params.get("focus");
    const focused = focusId ? byId[focusId] : null;
    if (focused) {
      pointer.x = camera.x + focused.x * camera.zoom;
      pointer.y = camera.y + focused.y * camera.zoom;
      pointer.active = true;
    }

    setupDebug();
    document.body.classList.add("is-ready");

    if (focused) {
      updateFocus(separationAmount());
      if (focused.lyrics) {
        // Arranca en la primera línea y deja correr el tiempo.
        lyricsClock = 0;
      }
    }

    requestAnimationFrame(frame);
  });
})();
