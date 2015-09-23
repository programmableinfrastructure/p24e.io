// Generate the nested sidebar nav for guides from the heading elements.
$(function() {

  var $nav = $('.guide-nav');
  if (!$nav.length) return;

  var nav = '', lastLevel = 0;

  $('.guide-content').find('h1, h2, h3, h4, h5, h6').each(function(i, el) {
    var level = Number(el.tagName[1]);
    if (!lastLevel) {
       lastLevel = level;
    }

    var link = '<a href="#' + el.id + '">' + el.innerText + '</a>';
    if (level == lastLevel) {
      if (nav) nav += '</li>';
      nav += '<li>' + link;
    } else if (level > lastLevel) {
      nav += '<ul class="nav nav-stacked"><li>' + link;
    } else { // level < lastLevel
      nav += '</li></ul><li>' + link;
    }
    lastLevel = level;
  });
  nav += '</li>';

  $nav.html('<ul class="nav nav-stacked">' + nav + '</ul>');

  $('body').scrollspy({
    target: '.guide-nav'
  });

});
