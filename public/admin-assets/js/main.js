(function ($) {
  "use strict";

  // Toggle submenu
  $(".menu-item.has-submenu .menu-link").on("click", function (e) {
    e.preventDefault();

    // Slide up other open submenus
    if ($(this).next(".submenu").is(":hidden")) {
      $(this).parent(".has-submenu").siblings().find(".submenu").slideUp(200);
    }

    // Toggle current submenu
    $(this).next(".submenu").slideToggle(200);
  });

  // Toggle offcanvas and overlay
  $("[data-trigger]").on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();

    const target = $(this).attr("data-trigger");
    $(target).toggleClass("show");
    $("body").toggleClass("offcanvas-active");
    $(".screen-overlay").toggleClass("show");
  });

  // Close offcanvas
  $(".screen-overlay, .btn-close").on("click", function () {
    $(".screen-overlay").removeClass("show");
    $(".mobile-offcanvas, .show").removeClass("show");
    $("body").removeClass("offcanvas-active");
  });

  // Aside minimize (responsive)
  $(".btn-aside-minimize").on("click", function () {
    if (window.innerWidth < 768) {
      $("body").removeClass("aside-mini");
      $(".screen-overlay").removeClass("show");
      $(".navbar-aside").removeClass("show");
      $("body").removeClass("offcanvas-active");
    } else {
      $("body").toggleClass("aside-mini");
    }
  });

  // Initialize Select2
  if ($(".select-nice").length) {
    $(".select-nice").select2();
  }

  // Initialize PerfectScrollbar
  if ($("#offcanvas_aside").length) {
    const aside = document.querySelector("#offcanvas_aside");
    new PerfectScrollbar(aside);
  }

  // Toggle dark mode
  $(".darkmode").on("click", function () {
    $("body").toggleClass("dark");
  });

})(jQuery);
