/* ═══════════════════════════════════════════════════════
   3D-Мастер Витебск — интерактив лендинга
   Бургер-меню · reveal-анимации · слайдер «до/после» ·
   drag-and-drop загрузка · квиз с валидацией ·
   отправка заявок в Telegram-бот / Email
   ═══════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ────────────────────────────────────────────────
     НАСТРОЙКИ ИНТЕГРАЦИИ (заполнить заказчику!)
     1) Создать бота у @BotFather → получить токен.
     2) Узнать свой chat_id (например, у @userinfobot).
     3) Вписать их ниже. Файлы шлются через sendDocument.
     Если токен не указан — заявка откроется в Telegram
     как предзаполненное сообщение + копирование в буфер.
     ──────────────────────────────────────────────── */
  var TG_CONFIG = {
    botToken: "",            // напр. "7123456789:AAF..."
    chatId: "",              // напр. "123456789"
    tgUsername: "vitebsk3d_test",
    fallbackEmail: ""        // напр. "zakaz@3d-master.by" — резервная отправка через mailto
  };

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ══════════ 1. Бургер-меню ══════════ */
  var burger = $("#burgerBtn");
  var nav = $("#mainNav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    });
    $$("a", nav).forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ══════════ 2. Появление блоков при скролле ══════════ */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ══════════ 3. Слайдер портфолио «До/После» ══════════ */
  (function sliderInit() {
    var slider = $("#portfolioSlider");
    if (!slider) return;
    var track = $("#sliderTrack", slider);
    var slides = $$(".slide", track);
    var dotsBox = $("#sliderDots", slider);
    var idx = 0, timer = null;

    slides.forEach(function (_, i) {
      var b = document.createElement("button");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", "Показать работу " + (i + 1));
      b.addEventListener("click", function () { go(i); restart(); });
      dotsBox.appendChild(b);
    });
    var dots = $$("button", dotsBox);

    function render() {
      track.style.transform = "translateX(-" + idx * 100 + "%)";
      track.style.transition = "transform .5s cubic-bezier(.22,.61,.36,1)";
      dots.forEach(function (d, i) {
        d.classList.toggle("active", i === idx);
        d.setAttribute("aria-selected", i === idx ? "true" : "false");
      });
    }
    function go(i) { idx = (i + slides.length) % slides.length; render(); }

    $("#sliderPrev", slider).addEventListener("click", function () { go(idx - 1); restart(); });
    $("#sliderNext", slider).addEventListener("click", function () { go(idx + 1); restart(); });

    // Клавиатура
    slider.setAttribute("tabindex", "0");
    slider.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { go(idx - 1); restart(); }
      if (e.key === "ArrowRight") { go(idx + 1); restart(); }
    });

    // Свайп на мобильных
    var startX = null;
    track.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) { go(idx + (dx < 0 ? 1 : -1)); restart(); }
      startX = null;
    }, { passive: true });

    // Автопрокрутка, пауза при наведении
    function start() { timer = setInterval(function () { go(idx + 1); }, 6000); }
    function restart() { clearInterval(timer); start(); }
    slider.addEventListener("mouseenter", function () { clearInterval(timer); });
    slider.addEventListener("mouseleave", start);

    render(); start();
  })();

  /* ══════════ 4. Drag-and-Drop загрузка файла ══════════ */
  var dz = $("#dropzone"), fileInput = $("#fileInput"), fileNameOut = $("#fileName");
  var pickedFile = null;
  var MAX_SIZE = 25 * 1024 * 1024; // 25 МБ

  if (dz && fileInput) {
    dz.addEventListener("click", function () { fileInput.click(); });
    dz.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
    });
    ["dragover", "dragenter"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("dragover"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("dragover"); });
    });
    dz.addEventListener("drop", function (e) {
      if (e.dataTransfer.files && e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", function () {
      if (fileInput.files.length) setFile(fileInput.files[0]);
    });
  }
  function setFile(f) {
    if (f.size > MAX_SIZE) {
      fileNameOut.textContent = "⚠ Файл больше 25 МБ — пришлите его, пожалуйста, в Telegram";
      pickedFile = null;
      return;
    }
    pickedFile = f;
    fileNameOut.textContent = "📎 " + f.name + " (" + (f.size / 1048576).toFixed(2) + " МБ)";
  }

  /* ══════════ 5. Вспомогательные функции ══════════ */
  function validContact(v) {
    v = v.trim();
    if (/^@?[A-Za-z0-9_]{4,32}$/.test(v) && v.replace("@", "").length >= 4) return true; // telegram-ник
    var digits = v.replace(/\D/g, "");
    return digits.length >= 9 && digits.length <= 15;                                     // телефон
  }
  function showError(name, on) {
    var err = $('[data-error-for="' + name + '"]');
    if (!err) return;
    var holder = err.closest(".field") || err.parentElement;
    holder.classList.toggle("has-error", !!on);
    err.classList.toggle("show", !!on);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Формируем текст заявки */
  function buildMessage(data) {
    var lines = [
      "🖨 НОВАЯ ЗАЯВКА · 3D-Мастер Витебск",
      "———————————————",
      "👤 Контакт: " + data.contact,
      "📦 Что есть: " + (data.files || "—"),
      "🧱 Материал: " + (data.material || "—"),
      "📄 Комментарий: " + (data.comment || "—"),
      "📎 Файл: " + (pickedFile ? pickedFile.name : "не прикреплён")
    ];
    return lines.join("\n");
  }

  /* Отправка в Telegram-бота (с файлом, если задан токен) */
  function sendToTelegram(text, file) {
    if (!TG_CONFIG.botToken || !TG_CONFIG.chatId) return Promise.resolve(false);

    var fd = new FormData();
    fd.append("chat_id", TG_CONFIG.chatId);
    fd.append("text", text);

    return new Promise(function (resolve) {
      // Сначала текст, затем файл отдельным запросом (sendDocument)
      fetch("https://api.telegram.org/bot" + TG_CONFIG.botToken + "/sendMessage", {
        method: "POST", body: fd
      }).then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res.ok) { resolve(false); return; }
          if (file) {
            var fd2 = new FormData();
            fd2.append("chat_id", TG_CONFIG.chatId);
            fd2.append("document", file);
            fd2.append("caption", "Файл к заявке");
            fetch("https://api.telegram.org/bot" + TG_CONFIG.botToken + "/sendDocument", {
              method: "POST", body: fd2
            }).then(function () { resolve(true); }, function () { resolve(true); });
          } else resolve(true);
        })
        .catch(function () { resolve(false); });
    });
  }

  /* Резервный вариант: открываем чат боту/менеджеру с готовым текстом */
  function fallbackOpenTg(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {});
      }
    } catch (e) { /* игнорируем */ }
    var url = "https://t.me/" + TG_CONFIG.tgUsername + "?text=" + encodeURIComponent(text.split("\n")[1] || text);
    window.open(url, "_blank", "noopener");
  }

  function statusBox(html, ok) {
    return '<div class="status-msg ' + (ok ? "ok" : "err") + '">' + html + "</div>";
  }

  /* ══════════ 6. Форма квиза (блок 4) ══════════ */
  var quoteForm = $("#quoteForm"), formStatus = $("#formStatus");
  if (quoteForm) {
    quoteForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var data = {
        files: (quoteForm.querySelector('input[name="files"]:checked') || {}).value || "",
        material: (quoteForm.querySelector('input[name="material"]:checked') || {}).value || "",
        contact: ($("#contactInput").value || ""),
        comment: ($("#commentInput").value || "")
      };

      var ok = true;
      if (!data.files) { showError("files", true); ok = false; } else showError("files", false);
      if (!data.material) { showError("material", true); ok = false; } else showError("material", false);
      if (!validContact(data.contact)) { showError("contact", true); ok = false; } else showError("contact", false);
      if (!quoteForm.consent.checked) { showError("consent", true); ok = false; } else showError("consent", false);

      if (!ok) {
        formStatus.innerHTML = statusBox("Проверьте выделенные поля формы.", false);
        var firstErr = quoteForm.querySelector(".has-error input, .has-error .radio-face");
        if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      var btn = quoteForm.querySelector(".submit-btn");
      btn.disabled = true;
      btn.textContent = "Отправляем…";

      var msg = buildMessage(data);
      sendToTelegram(msg, pickedFile).then(function (sent) {
        btn.disabled = false;
        btn.innerHTML = "Получить расчёт стоимости";
        if (sent) {
          formStatus.innerHTML = statusBox(
            "✅ Заявка отправлена! Мы свяжемся с вами в течение рабочего дня.<br><small>Заявка также продублирована менеджеру.</small>", true);
        } else {
          fallbackOpenTg(msg);
          formStatus.innerHTML = statusBox(
            "✅ Спасибо! Открылся чат Telegram — текст заявки уже скопирован, просто вставьте его и отправьте. " +
            "Либо позвоните: <a href=\"tel:+37529XXXXXXXX\" style=\"text-decoration:underline\">+375 (29) XXX-XX-XX</a>.", true);
        }
        quoteForm.reset();
        pickedFile = null;
        if (fileNameOut) fileNameOut.textContent = "";
        setTimeout(function () { formStatus.innerHTML = ""; }, 15000);
      });
    });

    // Живая очистка ошибок при выборе
    $$('input[name="files"], input[name="material"]', quoteForm).forEach(function (r) {
      r.addEventListener("change", function () { showError(r.name, false); });
    });
    $("#contactInput").addEventListener("input", function () { showError("contact", false); });
  }

  /* ══════════ 7. Форма обратного звонка (блок 8) ══════════ */
  var cbForm = $("#callbackForm"), cbNote = $("#cbNote");
  if (cbForm) {
    cbForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var phone = $("#cbPhone").value;
      if (!validContact(phone)) { showError("cbPhone", true); cbNote.className = "cb-note err"; cbNote.textContent = "Проверьте номер телефона"; return; }
      showError("cbPhone", false);

      var msg = "📞 ЗАПРОС ЗВОНКА · 3D-Мастер Витебск\nПерезвонить по номеру: " + phone;
      sendToTelegram(msg, null).then(function (sent) {
        cbNote.className = "cb-note ok";
        if (sent) {
          cbNote.textContent = "✅ Заявка принята — перезвоним в ближайшее время!";
        } else {
          fallbackOpenTg(msg);
          cbNote.textContent = "Открыли чат в Telegram — подтвердите, пожалуйста, заявку сообщением.";
        }
        cbForm.reset();
      });
    });
    $("#cbPhone").addEventListener("input", function () { showError("cbPhone", false); });
  }

  /* ══════════ 8. Лёгкая маскировка телефона ══════════ */
  $$('input[type="tel"]').forEach(function (inp) {
    inp.addEventListener("blur", function () {
      var d = inp.value.replace(/\D/g, "");
      if (d.startsWith("375") && d.length === 12) {
        inp.value = "+375 (" + d.slice(3, 5) + ") " + d.slice(5, 8) + "-" + d.slice(8, 10) + "-" + d.slice(10, 12);
      }
    });
  });

})();
