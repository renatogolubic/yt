const HOURS = 60 * 60 * 1000;

export const defaultChecklistConfig = {
  engagementFloor: 0.6,
  continuousViewsThreshold: 0.15,
  shortsFeedShareFloor: 0.25,
  minViewsPerHour: 20,
  delayedSpikeMultiplier: 1.5,
  scalingViewsPerHour: 150
};

const windows = [
  { key: "0-2", start: 0, end: 2 },
  { key: "6-12", start: 6, end: 12 },
  { key: "18-24", start: 18, end: 24 },
  { key: "24-48", start: 24, end: 48 },
  { key: "48-72", start: 48, end: 72 }
];

const statusFromChecks = (checks) => {
  if (checks.some((check) => check.status === "FAIL")) {
    return "FAIL";
  }
  if (checks.some((check) => check.status === "WARN")) {
    return "WARN";
  }
  return "PASS";
};

const trendIsContinuous = (values, threshold) => {
  if (values.length < 2) {
    return false;
  }
  const deltas = values.slice(1).map((value, index) => value - values[index]);
  const positive = deltas.filter((delta) => delta > 0).length;
  return positive / deltas.length >= threshold;
};

const average = (values) => {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
};

export const evaluateVideoChecklist = (snapshots, publishedAt, config = defaultChecklistConfig) => {
  const publishedTime = new Date(publishedAt).getTime();
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
  );

  const evaluations = windows.map((window) => {
    const startTime = publishedTime + window.start * HOURS;
    const endTime = publishedTime + window.end * HOURS;
    const windowSnapshots = sorted.filter((snapshot) => {
      const timestamp = new Date(snapshot.captured_at).getTime();
      return timestamp >= startTime && timestamp < endTime;
    });

    if (windowSnapshots.length === 0) {
      return {
        window: window.key,
        status: "WARN",
        explanation: "Not enough data collected for this window.",
        action: "Keep collecting snapshots."
      };
    }

    const viewsPerHourSeries = windowSnapshots.map((snapshot) => snapshot.views_per_hour);
    const shortsShareSeries = windowSnapshots.map((snapshot) => {
      if (snapshot.views === 0) {
        return 0;
      }
      return snapshot.views_from_shorts / snapshot.views;
    });
    const avgEngagement = average(windowSnapshots.map((snapshot) => snapshot.avg_percentage_viewed));

    const continuousTraffic = trendIsContinuous(viewsPerHourSeries, config.continuousViewsThreshold);
    const shortsShare = average(shortsShareSeries);
    const avgViewsPerHour = average(viewsPerHourSeries);

    const checks = [];

    if (window.key === "0-2") {
      checks.push({
        status: shortsShare >= config.shortsFeedShareFloor ? "PASS" : "FAIL",
        explanation: shortsShare >= config.shortsFeedShareFloor
          ? "Shorts feed is contributing meaningful traffic."
          : "Shorts feed traffic is too low for initial test.",
        action: shortsShare >= config.shortsFeedShareFloor
          ? "Do nothing; keep monitoring early momentum."
          : "Update hook or packaging on next upload." 
      });
      checks.push({
        status: continuousTraffic ? "PASS" : "WARN",
        explanation: continuousTraffic
          ? "Views are coming in consistently."
          : "Views are arriving in a single burst.",
        action: continuousTraffic
          ? "Let it run."
          : "Watch for a second push before making changes." 
      });
    }

    if (window.key === "6-12") {
      checks.push({
        status: avgViewsPerHour >= config.minViewsPerHour ? "PASS" : "WARN",
        explanation: avgViewsPerHour >= config.minViewsPerHour
          ? "Views per hour are holding."
          : "Views per hour are slowing down.",
        action: avgViewsPerHour >= config.minViewsPerHour
          ? "Keep format consistent."
          : "Plan a follow-up Short if this format matters." 
      });
      checks.push({
        status: continuousTraffic ? "PASS" : "WARN",
        explanation: continuousTraffic
          ? "Traffic is still alive."
          : "Traffic trend is flattening.",
        action: continuousTraffic
          ? "Stay the course."
          : "Consider moving on unless a later push arrives." 
      });
    }

    if (window.key === "18-24") {
      checks.push({
        status: shortsShare >= config.shortsFeedShareFloor ? "PASS" : "FAIL",
        explanation: shortsShare >= config.shortsFeedShareFloor
          ? "Shorts feed traffic remains present."
          : "Shorts feed traffic dropped off.",
        action: shortsShare >= config.shortsFeedShareFloor
          ? "Double down on this style if engagement holds."
          : "Move on; this one is likely done." 
      });
      checks.push({
        status: avgEngagement >= config.engagementFloor ? "PASS" : "WARN",
        explanation: avgEngagement >= config.engagementFloor
          ? "Engagement remains above the defined floor."
          : "Engagement is below the expected threshold.",
        action: avgEngagement >= config.engagementFloor
          ? "Keep testing similar hooks."
          : "Adjust pacing or payoff in the next upload." 
      });
    }

    if (window.key === "24-48") {
      const earlyAverage = average(sorted
        .filter((snapshot) => {
          const timestamp = new Date(snapshot.captured_at).getTime();
          return timestamp >= publishedTime && timestamp < publishedTime + 24 * HOURS;
        })
        .map((snapshot) => snapshot.views_per_hour));
      const delayedSpike = avgViewsPerHour >= earlyAverage * config.delayedSpikeMultiplier;

      checks.push({
        status: delayedSpike ? "PASS" : "WARN",
        explanation: delayedSpike
          ? "A delayed spike in views per hour is visible."
          : "No meaningful delayed spike yet.",
        action: delayedSpike
          ? "Consider remixing this format quickly."
          : "Wait for the 48-72h verdict." 
      });
      checks.push({
        status: avgEngagement >= config.engagementFloor ? "PASS" : "WARN",
        explanation: avgEngagement >= config.engagementFloor
          ? "Engagement is improving or stable."
          : "Engagement is trending down.",
        action: avgEngagement >= config.engagementFloor
          ? "Keep distributing similar content."
          : "Review retention dips to refine edits." 
      });
    }

    if (window.key === "48-72") {
      checks.push({
        status: avgViewsPerHour >= config.scalingViewsPerHour ? "PASS" : "WARN",
        explanation: avgViewsPerHour >= config.scalingViewsPerHour
          ? "Views per hour are strong enough to scale."
          : "Views per hour suggest the video is slowing.",
        action: avgViewsPerHour >= config.scalingViewsPerHour
          ? "Scale this format across the channel."
          : "Document learnings and move on." 
      });
      checks.push({
        status: shortsShare >= config.shortsFeedShareFloor ? "PASS" : "WARN",
        explanation: shortsShare >= config.shortsFeedShareFloor
          ? "Shorts feed is still contributing."
          : "Shorts feed traffic has cooled.",
        action: shortsShare >= config.shortsFeedShareFloor
          ? "Plan another related Short."
          : "Shift focus to new concepts." 
      });
    }

    const status = statusFromChecks(checks);

    return {
      window: window.key,
      status,
      explanation: checks.map((check) => check.explanation).join(" "),
      action: checks.map((check) => check.action).join(" "),
      checks
    };
  });

  const lastWindow = evaluations[evaluations.length - 1];
  const finalStatusMap = {
    PASS: "Scaling",
    WARN: "Delayed Test",
    FAIL: "Dead"
  };

  return {
    windows: evaluations,
    status: finalStatusMap[lastWindow.status] ?? "Alive"
  };
};
