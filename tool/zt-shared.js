/*
 * Shared constants/helpers for the ZT Workshop Task Manager tools.
 * Plain script (not a module) so it works from file:// without CORS issues.
 */
(function (global) {
  "use strict";

  var STATUS_VALUES = [
    "not-reviewed", "not-started", "in-planning", "planned", "in-progress", "completed",
    "blocked", "first-party-other", "third-party", "will-not-pursue", "ms-roadmap",
    "follow-up", "not-applicable", "declined"
  ];
  var PRIORITY_VALUES = ["P0", "P1", "P2", "P3"];
  var TEAM_PRIORITY_VALUES = ["1", "2", "3"];
  var NOTES_SOFT_CAP = 1000;

  function labelize(value) {
    return String(value || "").replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function filenameTimestamp(date) {
    return date.toISOString().replace(/\.\d+Z$/, "").replace(/:/g, "-");
  }

  // The team's existing convention, already in use before this tool existed:
  //   <legend> | Prio <1-3> | <Team> | <FeatureNr> | <Link> | <Free text> #tag1 #tag2
  // e.g. "Status | Prio 3 | SAM2 | xyz123 | https://test.com | some note #1337"
  // The trailing "Free text" field is optional — omit it (and its preceding "|") when unused.
  //
  // "Prio 1-3" here is a team-only scale, independent of the official "priority"
  // (P0-P3) field elsewhere in the task override — the two are unrelated on purpose.
  //
  // A #tag only counts when it's preceded by whitespace/start-of-string, so a URL's
  // #fragment (e.g. https://test.com#section) is never mistaken for a tag.
  var TAG_RE = /(^|\s)#([A-Za-z0-9_-]+)/g;

  function parseNotes(notes) {
    notes = notes || "";
    var tags = [];
    var stripped = notes.replace(TAG_RE, function (whole, pre, tag) {
      tags.push(tag);
      return pre;
    }).trim();

    var parts = stripped.split("|").map(function (p) { return p.trim(); });
    if (parts.length >= 2) {
      // A team priority digit is only trusted when the "Prio" field has no hyphen —
      // that excludes the "Prio (1-3)" legend/header text some notes still carry,
      // which would otherwise be misread as "priority 1".
      var prioField = parts[1] || "";
      var prioMatch = /-/.test(prioField) ? null : /([1-3])/.exec(prioField);
      return {
        structured: true,
        legend: parts[0] || "",
        teamPriority: prioMatch ? prioMatch[1] : "",
        team: parts[2] || "",
        featureNr: parts[3] || "",
        link: parts[4] || "",
        tags: tags,
        freeText: parts.slice(5).join(" | ").trim(),
        // Tag-stripped raw text, kept around so callers can tell a note apart from
        // "truly nothing here" even when it's unfilled template junk (e.g. "Status |
        // Prio (1-3) | | | ") that parses to no usable structured fields — the
        // official tool still counts that as "has a note" since the field isn't blank.
        raw: stripped
      };
    }
    return {
      structured: false,
      legend: "",
      teamPriority: "",
      team: "",
      featureNr: "",
      link: "",
      tags: tags,
      freeText: stripped,
      raw: stripped
    };
  }

  function looksLikeUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
  }

  function composeNotes(fields) {
    var tagsSuffix = (fields.tags && fields.tags.length)
      ? " " + fields.tags.map(function (t) { return "#" + t; }).join(" ")
      : "";
    if (fields.structured) {
      var legend = fields.legend || "Status";
      var prio = "Prio " + (fields.teamPriority || "");
      var parts = [legend, prio, fields.team || "", fields.featureNr || "", fields.link || ""];
      if (fields.freeText) parts.push(fields.freeText);
      return parts.join(" | ") + tagsSuffix;
    }
    return (fields.freeText || "") + tagsSuffix;
  }

  global.ZTShared = {
    STATUS_VALUES: STATUS_VALUES,
    PRIORITY_VALUES: PRIORITY_VALUES,
    TEAM_PRIORITY_VALUES: TEAM_PRIORITY_VALUES,
    NOTES_SOFT_CAP: NOTES_SOFT_CAP,
    labelize: labelize,
    nowIso: nowIso,
    filenameTimestamp: filenameTimestamp,
    parseNotes: parseNotes,
    composeNotes: composeNotes,
    looksLikeUrl: looksLikeUrl
  };
})(window);
