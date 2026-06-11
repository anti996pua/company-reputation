/**
 * Client-side search engine
 * Uses ALL_DATA (companies + departments + positions) from data.js
 */

var SEARCH_DATA = typeof ALL_DATA !== 'undefined' ? ALL_DATA : (typeof companyData !== 'undefined' ? companyData : []);

function searchCompanies(query, limit) {
  if (!query || !query.trim()) return [];
  var q = query.toLowerCase().trim();
  var scored = [];

  for (var i = 0; i < SEARCH_DATA.length; i++) {
    var c = SEARCH_DATA[i];
    var name = (c.n || '').toLowerCase();
    var nameEn = (c.nameEn || '').toLowerCase();
    var nameJa = (c.nameJa || '').toLowerCase();
    var desc = (c.d || '').toLowerCase();
    var city = (c.city || '').toLowerCase();
    var industry = (c.industry || '').toLowerCase();
    var aliases = c.aliases || [];
    var tags = c.tags || [];
    var score = 0;

    // Primary name match
    if (name === q) score = 100;
    else if (name.indexOf(q) === 0) score = 80;
    else if (name.indexOf(q) > 0) score = 60;

    // Secondary name match (English / Japanese / aliases)
    if (score < 50) {
      if (nameEn === q || nameJa === q) score = 75;
      else if (nameEn.indexOf(q) === 0 || nameJa.indexOf(q) === 0) score = 65;
      else if (nameEn.indexOf(q) > 0 || nameJa.indexOf(q) > 0) score = 50;
    }
    // Alias match (independent of English name — exact alias should win over contains)
    if (score < 70) {
      for (var a = 0; a < aliases.length; a++) {
        var alias = (aliases[a] || '').toLowerCase();
        if (alias === q) { score = Math.max(score, 70); break; }
        else if (alias.indexOf(q) === 0) { score = Math.max(score, 60); }
        else if (alias.indexOf(q) > 0) { score = Math.max(score, 45); }
      }
    }

    // Tag match
    if (score < 40) {
      for (var t = 0; t < tags.length; t++) {
        var tag = (tags[t] || '').toLowerCase();
        if (tag.indexOf(q) >= 0) { score = 35; break; }
      }
    }

    // Description / city / industry match
    if (score < 30) {
      if (desc.indexOf(q) >= 0) score = 30;
      else if (city.indexOf(q) >= 0) score = 20;
      else if (industry.indexOf(q) >= 0) score = 20;
    }

    // fuzzy fallback
    if (score === 0) {
      var ratio = fuzzyMatch(q, name);
      if (ratio > 60) score = ratio * 0.3;
    }

    if (score > 0) {
      scored.push({ score: score, company: c });
    }
  }

  scored.sort(function(a, b) {
    if (a.score !== b.score) return b.score - a.score;
    return (b.company.reviewCount || 0) - (a.company.reviewCount || 0);
  });

  var len = Math.min(limit || scored.length, scored.length);
  var result = [];
  for (var i = 0; i < len; i++) {
    result.push(scored[i].company);
  }
  return result;
}

function fuzzyMatch(q, str) {
  if (!q || !str) return 0;
  q = q.toLowerCase();
  str = str.toLowerCase();
  var qLen = q.length;
  var sLen = str.length;
  if (qLen > sLen) return 0;

  var maxRatio = 0;
  for (var i = 0; i <= sLen - qLen; i++) {
    var match = 0;
    for (var j = 0; j < qLen; j++) {
      if (q[j] === str[i + j]) match++;
    }
    var ratio = (match / qLen) * 100;
    if (ratio > maxRatio) maxRatio = ratio;
  }
  return maxRatio;
}
