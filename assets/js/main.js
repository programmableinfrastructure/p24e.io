$(function() {

  // prettify tables in guides
  $('.guide table').addClass('table');

  // add hints to labels
  $('.label-oss').attr('title', 'Open Source Software');
  $('.label-xaas').attr('title', 'SaaS, PaaS or IaaS offering');
  $('.label-proprietary').attr('title', 'Proprietary software on-premise');
  $('.label-supported').attr('title', 'Commercial support or "enterprise version" available from vendor');
  $('.label-stalled').attr('title', 'Development seems to have stalled');
  $('.tech-labels .label').tooltip();

  // Generate the nested sidebar nav for guides from the heading elements.
  var $nav = $('.guide-nav');
  if (!$nav.length) return;

  var nav = '', lastLevel = 0;

  $('.guide-content').find('h1, h2, h3, h4, h5, h6').each(function(i, el) {
    var level = Number(el.tagName[1]);
    if (!lastLevel) {
       lastLevel = level;
    }
    var delta = level - lastLevel;

    var link = '<a href="#' + el.id + '">' + el.innerText + '</a>';
    if (delta == 0) {
      if (nav) nav += '</li>';
      nav += '<li>' + link;
    } else if (delta > 0) {
      for (var i=delta; i > 1; i--) {
        nav += '<ul class="nav nav-stacked"><li>';
      }
      nav += '<ul class="nav nav-stacked"><li>' + link;
    } else { // delta < 0
      for (var i=delta; i < -1; i++) {
        nav += '</li></ul>';
      }
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
