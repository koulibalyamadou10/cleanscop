package com.cleanscope.mock.web;

import java.time.Instant;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AlertController {

    @GetMapping("/alerts")
    public AlertsResponse alerts() {
        Instant now = Instant.now();
        return new AlertsResponse(
                List.of(
                        new AlertDto(
                                "alert-cache-1",
                                "warning",
                                "Elevated browser cache growth",
                                "Chrome cache on this endpoint grew faster than the 7-day baseline.",
                                now.minusSeconds(3600).toString(),
                                "heuristic-cache"),
                        new AlertDto(
                                "alert-temp-2",
                                "info",
                                "Temp folder backlog",
                                "User temp directory contains stale installer leftovers older than 14 days.",
                                now.minusSeconds(7200).toString(),
                                "heuristic-temp"),
                        new AlertDto(
                                "alert-policy-3",
                                "critical",
                                "Unsigned cleaner blocked (simulated)",
                                "A third-party cleaner attempted a permanent delete outside policy. Action denied.",
                                now.minusSeconds(900).toString(),
                                "policy-engine")),
                now.toString());
    }

    public record AlertDto(
            String id,
            String severity,
            String title,
            String message,
            String createdAt,
            String source) {}

    public record AlertsResponse(List<AlertDto> alerts, String generatedAt) {}
}
